import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "./config.js";
import { draftJob, draftOracle, orderCostImd } from "./drafts.js";
import { explain } from "./explain.js";
import { keywords } from "./reads.js";
import { Saver, inputHash } from "./saver.js";
import { createServer } from "./server.js";

const dir = () => mkdtempSync(join(tmpdir(), "imd-mcp-"));
const limits = { dailyCapImd: 1, maxPerOrderImd: 0.5, dedupeHours: 168, requireConfirm: true };
const body = { objective: "Write a sourced report on deterministic EVM testing approaches.", skill: "research-report" };

describe("the saver", () => {
  it("refuses to pay without a check token for this exact body", () => {
    const s = new Saver(dir(), limits);
    expect(s.gate({ action: "job.open", input: body, costImd: 0.5, confirm: true })).toMatchObject({ ok: false, code: "check_first" });
    const token = s.checkToken("job.open", body);
    expect(s.gate({ action: "job.open", input: { ...body, objective: "something else entirely, changed after the check" }, costImd: 0.5, checkToken: token, confirm: true })).toMatchObject({ ok: false, code: "check_first" });
    expect(s.gate({ action: "job.open", input: body, costImd: 0.5, checkToken: token, confirm: true })).toEqual({ ok: true });
  });

  it("does not accept an expired check token", () => {
    const s = new Saver(dir(), limits);
    const t0 = Date.now();
    const token = s.checkToken("job.open", body, t0, 60);
    expect(s.verifyCheckToken(token, "job.open", body, t0 + 61_000)).toBe(false);
  });

  it("waits for the user's confirm", () => {
    const s = new Saver(dir(), limits);
    const token = s.checkToken("job.open", body);
    expect(s.gate({ action: "job.open", input: body, costImd: 0.5, checkToken: token })).toMatchObject({ ok: false, code: "confirm" });
  });

  it("returns the existing order instead of buying the same body twice", () => {
    const s = new Saver(dir(), limits);
    s.record({ orderId: "o-1", action: "job.open", title: "t", inputHash: inputHash("job.open", body), costImd: 0.5, requestToken: "x", createdAt: Date.now() });
    const again = s.gate({ action: "job.open", input: body, costImd: 0.5, checkToken: s.checkToken("job.open", body), confirm: true });
    expect(again).toMatchObject({ ok: false, code: "duplicate", existing: { orderId: "o-1" } });
    expect(s.stats().savedImd).toBe(0.5);
    expect(s.gate({ action: "job.open", input: body, costImd: 0.5, checkToken: s.checkToken("job.open", body), confirm: true, allowDuplicate: true }).ok).toBe(true);
  });

  it("holds the per-order and daily caps", () => {
    const s = new Saver(dir(), limits);
    expect(s.gate({ action: "schedule.create", input: body, costImd: 5, checkToken: s.checkToken("schedule.create", body), confirm: true })).toMatchObject({ code: "over_order_cap" });
    s.record({ orderId: "a", action: "job.open", title: "", inputHash: "h1", costImd: 0.5, requestToken: "", createdAt: Date.now() });
    s.record({ orderId: "b", action: "job.open", title: "", inputHash: "h2", costImd: 0.5, requestToken: "", createdAt: Date.now() });
    expect(s.gate({ action: "job.open", input: body, costImd: 0.5, checkToken: s.checkToken("job.open", body), confirm: true })).toMatchObject({ code: "over_daily_cap" });
  });
});


describe("drafts", () => {
  it("builds the bodies IMD documents", () => {
    expect(draftJob({ kind: "report", brief: "x".repeat(30) })).toMatchObject({ skill: "research-report", outputs: [{ path: "artifacts/report.md" }] });
    expect(draftJob({ kind: "website", brief: "x".repeat(30), siteLabel: "acme" })).toMatchObject({ skill: "build-website", ipfs: "acme" });
    expect(draftJob({ kind: "audit", brief: "x".repeat(30), repoUrl: "https://github.com/a/b.git", baseCommit: "a".repeat(40) })).toMatchObject({ template: "audit" });
    expect(() => draftJob({ kind: "audit", brief: "x".repeat(30) })).toThrow();
    expect(draftOracle({ question: "Did X ship?", answerType: "bool", evidence: "panel", panelSize: 10 })).toMatchObject({ v: 1, quorum: 7, panelSize: 10 });
    expect(orderCostImd("schedule.create", { runs: 12 }, 0.5)).toBe(6);
  });
  it("explains error codes and pulls search keywords", () => {
    expect(explain("payment_rejected")).toMatch(/IMD/);
    expect(keywords("Build a dashboard for Uniswap v4 hook volume")).toBe("dashboard uniswap hook volume");
  });
});

describe("the MCP server", () => {
  afterEach(() => vi.unstubAllGlobals());

  async function connect(extra: Partial<Config> = {}) {
    const cfg: Config = { api: "https://api.example", ethRpc: "http://rpc", privateKey: null, dailyCapImd: 2, maxPerOrderImd: 0.5, requireConfirm: true, dedupeHours: 168, stateDir: dir(), readOnly: false, ...extra };
    const { server } = createServer(cfg);
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1" });
    await Promise.all([server.connect(a), client.connect(b)]);
    return client;
  }

  it("lists its tools and its prompt", async () => {
    const c = await connect();
    const tools = (await c.listTools()).tools.map((t) => t.name).sort();
    expect(tools).toEqual(["imd_check", "imd_draft", "imd_draft_oracle", "imd_explain", "imd_find_existing", "imd_order", "imd_orders", "imd_setup_wallet", "imd_status", "imd_track"]);
    expect((await c.listPrompts()).prompts.map((p) => p.name)).toEqual(["hire-the-swarm"]);
  });

  it("finds existing work through the public API", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({
      count: 1,
      items: [{ id: "job:abc", title: "A dashboard", types: ["sites"], sites: [{ label: "dash", repoUrl: "https://github.com/x/y", supersededBy: null }] }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const c = await connect();
    const r = await c.callTool({ name: "imd_find_existing", arguments: { query: "dashboard" } });
    const j = JSON.parse((r.content as { text: string }[])[0]!.text);
    expect(j.results[0]).toMatchObject({ jobId: "abc", site: "https://dash.sites.imd.fun" });
  });

  it("refuses to order without a wallet, and explains why", async () => {
    const c = await connect();
    const r = await c.callTool({ name: "imd_order", arguments: { action: "job.open", input: body, checkToken: "x", confirm: true } });
    expect(r.isError).toBe(true);
    expect(JSON.parse((r.content as { text: string }[])[0]!.text).code).toBe("no_wallet");
  });

  it("turns a refused check into money saved, not money spent", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/requests/check")) return new Response(JSON.stringify({ blockers: [{ code: "too_vague", message: "Say what done looks like." }] }), { status: 200 });
      return new Response(JSON.stringify({ count: 0, items: [] }), { status: 200 });
    }));
    const c = await connect();
    const r = await c.callTool({ name: "imd_check", arguments: { action: "job.open", input: body } });
    const j = JSON.parse((r.content as { text: string }[])[0]!.text);
    expect(j.wouldBeRefused).toBe(true);
    expect(j.checkToken).toBeUndefined();
    const st = JSON.parse(((await c.callTool({ name: "imd_orders", arguments: {} })).content as { text: string }[])[0]!.text);
    expect(st.saver.savedImd).toBe(0.5);
  });
});
