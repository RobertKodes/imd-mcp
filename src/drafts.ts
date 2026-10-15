/**
 * Valid IMD bodies from a few plain fields. Agents get the shape right the first time instead of
 * learning it from refusals.
 */

export type DraftKind = "website" | "report" | "audit" | "image" | "contracts" | "tool";

export interface DraftArgs {
  kind: DraftKind;
  brief: string;
  /** Site label for hosting under <label>.sites.imd.fun (website/tool). */
  siteLabel?: string;
  /** Public GitHub repo, for audits. */
  repoUrl?: string;
  baseCommit?: string;
  minCitations?: number;
  github?: boolean;
}

export function draftJob(a: DraftArgs): Record<string, unknown> {
  const github = a.github ?? false;
  switch (a.kind) {
    case "website":
    case "tool":
      return {
        objective: a.kind === "tool" ? `Build a small self-contained web tool. ${a.brief} Static, runs in the browser, no backend, works on a phone.` : `${a.brief} Static site, fast, works on a phone.`,
        skill: "build-website",
        ...(a.siteLabel ? { ipfs: a.siteLabel } : { ipfs: true }),
        github,
      };
    case "report":
      return {
        objective: a.brief,
        skill: "research-report",
        outputs: [{ name: "report", path: "artifacts/report.md", mediaType: "text/markdown" }],
        minCitations: a.minCitations ?? 5,
        github,
      };
    case "image":
      return {
        objective: a.brief,
        skill: "create-image",
        outputs: [{ name: "image", path: "artifacts/image.png", mediaType: "image/png" }],
        github,
      };
    case "audit":
      if (!a.repoUrl || !a.baseCommit) throw new Error("An audit needs repoUrl and baseCommit (imd_draft resolves the commit for you when you pass repoUrl).");
      return { objective: a.brief, template: "audit", repoUrl: a.repoUrl, baseCommit: a.baseCommit };
    case "contracts":
      return {
        objective: `${a.brief} Do not deploy.`,
        shape: "chain",
        references: ["solidity-security-review"],
        steps: [{ skill: "build-contract-project" }, { skill: "adversarial-review" }],
        github: a.github ?? true,
      };
  }
}

export interface OracleArgs {
  question: string;
  answerType: "bool" | "uint256" | "address" | "bytes32" | "address[]" | "bytes32[]";
  evidence: "chain" | "panel";
  chainId?: number;
  hours?: number;
  panelSize?: number;
  quorum?: number;
  sources?: string[];
  definitions?: Record<string, string>;
}

export function draftOracle(a: OracleArgs): Record<string, unknown> {
  const panelSize = a.panelSize ?? 5;
  return {
    v: 1,
    question: a.question,
    chainId: a.chainId ?? 1,
    window: { hours: a.hours ?? 24 },
    answerType: a.answerType,
    evidence: a.evidence,
    panelSize,
    quorum: a.quorum ?? Math.ceil(panelSize * 0.7),
    validForSeconds: 86400,
    ...(a.definitions ? { definitions: a.definitions } : {}),
    ...(a.sources?.length ? { guards: { sources: a.sources, minSources: 1 } } : {}),
  };
}

/** What an order of this action and body costs, in IMD, at a unit price. */
export function orderCostImd(action: string, input: unknown, unitImd: number): number {
  if (action === "schedule.create" || action === "schedule.topup") {
    const runs = Number((input as { runs?: number })?.runs ?? 1);
    return unitImd * Math.max(1, runs);
  }
  return unitImd;
}
