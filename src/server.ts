import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type LocalAccount, createWalletClient, erc20Abi, formatUnits, http, maxUint256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { z } from "zod";
import type { Config } from "./config.js";
import { draftJob, draftOracle, orderCostImd } from "./drafts.js";
import { explain } from "./explain.js";
import { HttpImdPlane } from "./imd/http.js";
import { type ImdAction, ImdError, IMD_MAINNET } from "./imd/types.js";
import { ImdReads, PERMIT2, keywords, walletState } from "./reads.js";
import { Saver, inputHash } from "./saver.js";

export const VERSION = "0.1.0";

const ACTIONS = ["job.open", "job.continue", "launch.open", "workflow.open", "oracle.request", "schedule.create", "schedule.topup"] as const;
const out = (v: unknown) => ({ content: [{ type: "text" as const, text: typeof v === "string" ? v : JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), 2) }] });
const fail = (code: string, message: string, extra: Record<string, unknown> = {}) => ({ ...out({ ok: false, code, message, ...extra }), isError: true });

/** A throwaway signer for the public reads the HTTP plane offers (check, job, result). It never pays. */
const READER = privateKeyToAccount(`0x${"1".padStart(64, "0")}`);

export function createServer(cfg: Config) {
  const saver = new Saver(cfg.stateDir, cfg);
  const reads = new ImdReads(cfg.api);
  const account: LocalAccount | null = cfg.privateKey ? privateKeyToAccount(cfg.privateKey) : null;
  const plane = account ? new HttpImdPlane({ account, requestToken: saver.requestToken, baseUrl: cfg.api }) : null;
  const reader = plane ?? new HttpImdPlane({ account: READER, baseUrl: cfg.api });
  let unitImd = 0.5;

  const server = new McpServer(
    { name: "imd-mcp", version: VERSION },
    {
      instructions:
        "Hire the IMD swarm (https://imd.fun): AI agents that build sites, write sourced reports, audit code, make images and answer oracle questions, paid in IMD. " +
        "Always: 1) imd_find_existing to see if the work already exists, 2) imd_draft or imd_check to get a valid body and its checkToken, 3) show the user the plan and the cost, 4) imd_order with confirm: true only after they agree, 5) imd_track until done. The saver refuses orders without a passing check, duplicates and anything over the user's caps.",
    },
  );

  server.registerTool("imd_status", {
    title: "IMD status, wallet and limits",
    description: "Network health, the live price per action, this wallet's IMD/ETH balance and Permit2 approval, today's spend against the caps, and what the saver has saved so far. Free.",
    inputSchema: {},
  }, async () => {
    const health = await reads.health().catch(() => null);
    const caps = await reader.capabilities().catch(() => null);
    if (caps) unitImd = Number(formatUnits(caps.price, 18));
    let wallet: unknown = { configured: false, hint: "Set IMD_PRIVATE_KEY (a fresh wallet holding a little IMD and ETH) to place orders. Search, drafts and checks work without it." };
    if (account) {
      try {
        const w = await walletState(cfg.ethRpc, account.address);
        wallet = { configured: true, address: account.address, imd: formatUnits(w.imd, 18), eth: formatUnits(w.eth, 18), permit2Approved: w.permit2Allowance >= 10n ** 24n, ordersAffordable: Math.floor(Number(formatUnits(w.imd, 18)) / unitImd) };
      } catch (e) {
        wallet = { configured: true, address: account.address, error: (e as Error).message };
      }
    }
    return out({
      network: health ? { status: health.status, agentsConnected: health.connectedDaemons, workingNow: health.workingNow } : "unreachable",
      pricePerActionImd: unitImd,
      wallet,
      limits: { dailyCapImd: cfg.dailyCapImd, maxPerOrderImd: cfg.maxPerOrderImd, requireConfirm: cfg.requireConfirm, spentTodayImd: saver.spentToday(), readOnly: cfg.readOnly },
      saver: saver.stats(),
    });
  });

  server.registerTool("imd_find_existing", {
    title: "Find existing IMD work before paying",
    description: "Searches everything the swarm already shipped (sites, research, audits, code, tokens, contracts, media). Reusing a public result costs nothing. Free.",
    inputSchema: {
      query: z.string().min(2).max(200).describe("What you are looking for, in a few words"),
      type: z.enum(["all", "sites", "research", "audits", "code", "tokens", "contracts", "media"]).default("all"),
      limit: z.number().int().min(1).max(25).default(8),
    },
  }, async ({ query, type, limit }) => {
    const r = await reads.publications(query, type, limit);
    return out({ query, total: r.count, results: r.items, tip: r.count ? "If one of these does what you need, use it instead of buying new work." : "Nothing shipped matches; new work is justified." });
  });

  server.registerTool("imd_draft", {
    title: "Draft a valid IMD order",
    description: "Builds a correct body for a website, tool, report, audit, image or contracts job, runs IMD's free check on it, and returns the body, the plan, the cost, similar existing work and a checkToken for imd_order. Free.",
    inputSchema: {
      kind: z.enum(["website", "tool", "report", "audit", "image", "contracts"]),
      brief: z.string().min(20).max(7000).describe("What to build or answer, who it is for, what done looks like"),
      siteLabel: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/).optional().describe("Host under <label>.sites.imd.fun"),
      repoUrl: z.string().url().optional().describe("Public GitHub repo, for audits"),
      minCitations: z.number().int().min(0).max(20).optional(),
    },
  }, async (a) => {
    let baseCommit: string | undefined;
    let repoUrl = a.repoUrl;
    if (a.kind === "audit") {
      if (!repoUrl) return fail("repo_required", "An audit needs repoUrl: a public GitHub repository.");
      const imp = await importRepo(cfg.api, repoUrl, "code");
      if (!imp.ok) return fail("import_failed", "IMD could not read that repository.", { problems: imp.problems });
      repoUrl = imp.source.repoUrl;
      baseCommit = imp.source.baseCommit;
    }
    return checkAndReport("job.open", draftJob({ ...a, repoUrl, baseCommit }));
  });

  server.registerTool("imd_draft_oracle", {
    title: "Draft an oracle question",
    description: "Builds a typed question for an IMD oracle panel (independent agents, quorum, EIP-712 attestation), runs the free check including the wording screen, and returns the body and a checkToken. Free.",
    inputSchema: {
      question: z.string().min(10).max(2000),
      answerType: z.enum(["bool", "uint256", "address", "bytes32", "address[]", "bytes32[]"]),
      evidence: z.enum(["chain", "panel"]).describe("chain: reproduced from chain data; panel: off-chain sources, panel consensus"),
      chainId: z.number().int().positive().default(1),
      hours: z.number().int().min(1).max(720).default(24),
      panelSize: z.number().int().min(5).max(100).default(5),
      quorum: z.number().int().min(2).optional(),
      sources: z.array(z.string().url()).max(32).optional().describe("URL prefixes the evidence must come from"),
      definitions: z.record(z.string().max(512)).optional().describe("Pin the metric, time range and sources"),
    },
  }, async (a) => checkAndReport("oracle.request", draftOracle(a)));

  server.registerTool("imd_check", {
    title: "Free check of any IMD body",
    description: "Runs IMD's free check on a body you wrote yourself: blockers, suggestions, the plan, the cost and similar existing work. Returns the checkToken imd_order requires. Free; holds nothing.",
    inputSchema: {
      action: z.enum(ACTIONS),
      input: z.record(z.unknown()).describe("The action's body, as documented at https://imd.fun/docs"),
    },
  }, async ({ action, input }) => checkAndReport(action, input));

  async function checkAndReport(action: ImdAction, input: Record<string, unknown>) {
    let check;
    try {
      check = await reader.check(action, input);
    } catch (e) {
      const code = e instanceof ImdError ? e.code : null;
      return fail(code ?? "check_failed", explain(code, (e as Error).message), { detail: (e as ImdError).detail });
    }
    const cost = orderCostImd(action, input, unitImd);
    const objective = String(input.objective ?? input.question ?? input.request ?? (input.input as { objective?: string } | undefined)?.objective ?? "");
    const similar = objective ? await reads.publications(keywords(objective), "all", 3).then((r) => r.items).catch(() => []) : [];
    const dup = saver.duplicateOf(action, input);
    if (check.blockers.length) {
      saver.noteSavedByCheck(cost);
      return out({ ok: false, wouldBeRefused: true, blockers: check.blockers, suggestions: check.suggestions, saved: `${cost} IMD not spent: IMD would refuse this body after taking the payment. Fix the blockers and check again.`, input });
    }
    return out({
      ok: true,
      action,
      costImd: cost,
      plan: check.plan,
      suggestions: check.suggestions,
      similarExistingWork: similar,
      alreadyBoughtByYou: dup ? { orderId: dup.orderId, jobId: dup.jobId, at: new Date(dup.createdAt).toISOString() } : null,
      input,
      checkToken: saver.checkToken(action, input),
      next: account ? `Show the user the plan and ${cost} IMD; then call imd_order with this input, checkToken and confirm: true.` : "Set IMD_PRIVATE_KEY to order. The body is valid.",
    });
  }

  server.registerTool("imd_order", {
    title: "Pay for and open IMD work",
    description: "Pays from the configured wallet (x402 + Permit2 + quote approval) and opens the work. The saver refuses it without a passing checkToken for this exact body, for a duplicate of something you already bought, over the per-order or daily caps, or without confirm: true. SPENDS IMD.",
    inputSchema: {
      action: z.enum(ACTIONS),
      input: z.record(z.unknown()),
      checkToken: z.string().describe("From imd_check / imd_draft for this exact body"),
      confirm: z.boolean().default(false).describe("true only after the user agreed to the cost"),
      title: z.string().max(120).optional().describe("Your own label for the order history"),
      allowDuplicate: z.boolean().default(false),
    },
  }, async (a) => {
    if (cfg.readOnly) return fail("read_only", "IMD_READ_ONLY=1: ordering is disabled on this install.");
    if (!plane || !account) return fail("no_wallet", "No wallet configured. Set IMD_PRIVATE_KEY to a fresh wallet with IMD and a little ETH.");
    const cost = orderCostImd(a.action, a.input, unitImd);
    const gate = saver.gate({ action: a.action, input: a.input, costImd: cost, checkToken: a.checkToken, confirm: a.confirm, allowDuplicate: a.allowDuplicate });
    if (!gate.ok) return fail(gate.code, gate.message, gate.existing ? { existing: gate.existing } : {});
    try {
      const w = await walletState(cfg.ethRpc, account.address);
      if (Number(formatUnits(w.imd, 18)) < cost) return fail("insufficient_imd", `The wallet holds ${formatUnits(w.imd, 18)} IMD; this order needs ${cost}. Send IMD to ${account.address}.`);
      if (w.permit2Allowance < 10n ** 24n) return fail("permit2_required", "This wallet has not approved Permit2 for IMD yet. Run imd_setup_wallet once (it costs a little ETH gas).");
      const order = await plane.open(a.action, a.input);
      saver.record({ orderId: order.orderId, action: a.action, title: a.title ?? String(a.input.objective ?? a.input.question ?? a.action).slice(0, 120), inputHash: inputHash(a.action, a.input), costImd: cost, requestToken: saver.requestToken, createdAt: Date.now(), jobId: order.jobId, state: order.state });
      return out({ ok: true, orderId: order.orderId, state: order.state, jobId: order.jobId ?? null, paymentTx: order.txHash ?? null, costImd: cost, next: "Call imd_track with the orderId until it is done. Results arrive in minutes to hours." });
    } catch (e) {
      const code = e instanceof ImdError ? e.code : null;
      return fail(code ?? "order_failed", explain(code, (e as Error).message), { detail: (e as ImdError).detail });
    }
  });

  server.registerTool("imd_track", {
    title: "Track an order or job",
    description: "Follows an order through payment and admission, then its job step by step, and returns the delivered site, repo and files once done. Accepts an orderId, a jobId or a prefix from imd_orders. Free.",
    inputSchema: { id: z.string().min(6) },
  }, async ({ id }) => {
    const rec = saver.find(id);
    let jobId = rec?.jobId ?? (rec ? undefined : id);
    let orderState: string | undefined;
    try {
      if (rec && !rec.jobId) {
        if (!plane) return fail("no_wallet", "Reading an order needs the wallet's request token; configure IMD_PRIVATE_KEY.");
        const o = await plane.order(rec.orderId);
        orderState = o.state;
        saver.update(rec.orderId, { state: o.state, jobId: o.jobId });
        if (!o.jobId) return out({ orderId: rec.orderId, state: o.state, problems: o.problems ?? null, note: o.state === "refused" ? "Refused at admission." : "Paid; waiting for admission." });
        jobId = o.jobId;
      }
      const job = await reader.job(jobId!);
      const res = job.state === "completed" ? await reader.result(jobId!) : null;
      if (rec) saver.update(rec.orderId, { state: job.state });
      return out({
        orderId: rec?.orderId ?? null,
        orderState: orderState ?? rec?.state ?? null,
        jobId,
        state: job.state,
        progress: `${job.stepsDone}/${job.stepsTotal}`,
        activity: job.activity,
        result: res ? { site: res.siteUrl, repo: res.repoUrl, files: res.files } : null,
        explorer: `https://explorer.imd.fun/jobs/${jobId}`,
      });
    } catch (e) {
      const code = e instanceof ImdError ? e.code : null;
      return fail(code ?? "track_failed", explain(code, (e as Error).message));
    }
  });

  server.registerTool("imd_orders", {
    title: "Order history and savings",
    description: "Everything bought through this install: orders, states, IMD spent today and in total, and what the saver prevented. Free.",
    inputSchema: { limit: z.number().int().min(1).max(200).default(30) },
  }, async ({ limit }) => {
    const all = saver.orders();
    return out({
      spentTodayImd: saver.spentToday(),
      spentTotalImd: all.reduce((a, o) => a + o.costImd, 0),
      saver: saver.stats(),
      orders: all.slice(0, limit).map(({ requestToken: _t, inputHash: _h, ...o }) => ({ ...o, createdAt: new Date(o.createdAt).toISOString() })),
    });
  });

  server.registerTool("imd_setup_wallet", {
    title: "Approve Permit2 for IMD (once)",
    description: "IMD payments go through Permit2. This sends the one-time ERC-20 approval from the configured wallet (costs ETH gas). Requires confirm: true.",
    inputSchema: { confirm: z.boolean().default(false) },
  }, async ({ confirm }) => {
    if (!account) return fail("no_wallet", "Set IMD_PRIVATE_KEY first.");
    if (cfg.readOnly) return fail("read_only", "IMD_READ_ONLY=1.");
    const w = await walletState(cfg.ethRpc, account.address);
    if (w.permit2Allowance >= 10n ** 24n) return out({ ok: true, already: true, address: account.address });
    if (!confirm) return fail("confirm", `This sends one approval transaction from ${account.address} (ETH balance ${formatUnits(w.eth, 18)}). Call again with confirm: true.`);
    const wallet = createWalletClient({ account, chain: mainnet, transport: http(cfg.ethRpc) });
    const hash = await wallet.writeContract({ address: IMD_MAINNET, abi: erc20Abi, functionName: "approve", args: [PERMIT2, maxUint256] });
    return out({ ok: true, tx: hash, note: "Wait for it to confirm, then order." });
  });

  server.registerTool("imd_explain", {
    title: "Explain an IMD error code",
    description: "Turns an IMD error code into what happened and what to do. Free.",
    inputSchema: { code: z.string() },
  }, async ({ code }) => out({ code, explanation: explain(code) }));

  server.registerPrompt("hire-the-swarm", {
    title: "Hire the IMD swarm for a task",
    description: "Walks through find, draft, check, confirm, order and track, spending only what the user approves.",
    argsSchema: { task: z.string().describe("What you want built or answered") },
  }, ({ task }) => ({
    messages: [{
      role: "user",
      content: { type: "text", text: `I want the IMD swarm to do this: ${task}\n\nFirst call imd_find_existing to see if it already exists. If not, use imd_draft (or imd_draft_oracle for a question) to get a valid body and its cost. Show me the plan, the cost in IMD and any similar existing work, and wait for my yes before calling imd_order with confirm: true. Then track it with imd_track.` },
    }],
  }));

  return { server, saver, account };
}

export async function importRepo(api: string, url: string, kind: "code" | "site" | "contracts") {
  const r = await fetch(`${api}/requests/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, kind }) });
  return (await r.json()) as { ok: true; source: { repoUrl: string; baseCommit: string } } | { ok: false; problems: unknown };
}
