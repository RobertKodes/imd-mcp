import { createPublicClient, erc20Abi, http } from "viem";
import { mainnet } from "viem/chains";
import { IMD_MAINNET } from "./imd/types.js";

export const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

/** Public, free reads from api.imd.fun: nothing here needs a wallet or a token. */
export class ImdReads {
  constructor(readonly api: string, readonly fetchImpl: typeof fetch = fetch) {}

  async get<T>(path: string): Promise<T> {
    const r = await this.fetchImpl(`${this.api}${path}`);
    if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
    return (await r.json()) as T;
  }

  health() { return this.get<{ status: string; version?: string; connectedDaemons?: number; workingNow?: number }>("/health"); }

  /** Shipped work matching a query: the first place to look before paying for something new. */
  async publications(q: string, type = "all", pageSize = 8) {
    type Site = { label?: string | null; ensName?: string | null; repoUrl?: string | null; supersededBy?: string | null };
    type Item = { id: string; title?: string; types?: string[]; publishedAt?: string; paidBy?: string; sites?: Site[]; code?: { repoUrl?: string }[]; research?: { url?: string; repoUrl?: string }[] };
    const r = await this.get<{ count: number; items: Item[] }>(`/publications?q=${encodeURIComponent(q.slice(0, 200))}&type=${type}&pageSize=${pageSize}&sort=newest`);
    return {
      count: r.count,
      items: r.items.map((i) => {
        const site = i.sites?.find((s) => !s.supersededBy) ?? i.sites?.[0];
        const jobId = i.id.replace(/^job:/, "");
        return {
          jobId,
          title: (i.title ?? "").replace(/\s+/g, " ").slice(0, 180),
          types: i.types ?? [],
          publishedAt: i.publishedAt ?? null,
          site: site?.label ? `https://${site.label}.sites.imd.fun` : null,
          repo: site?.repoUrl ?? i.code?.[0]?.repoUrl ?? i.research?.[0]?.repoUrl ?? null,
          explorer: `https://explorer.imd.fun/jobs/${jobId}`,
        };
      }),
    };
  }

  async jobs(q: string, limit = 8) {
    const r = await this.get<{ jobs: { id: string; state: string; objective: string; delivery: { repoUrl?: string } | null; createdAt: string }[] }>(
      `/jobs?q=${encodeURIComponent(q.slice(0, 200))}&limit=${limit}&exclude=oracle`,
    );
    return r.jobs;
  }
}

export async function walletState(rpc: string, address: `0x${string}`) {
  const c = createPublicClient({ chain: mainnet, transport: http(rpc) });
  const [eth, imd, allowance] = await Promise.all([
    c.getBalance({ address }),
    c.readContract({ address: IMD_MAINNET, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
    c.readContract({ address: IMD_MAINNET, abi: erc20Abi, functionName: "allowance", args: [address, PERMIT2] }),
  ]);
  return { eth, imd, permit2Allowance: allowance };
}

/** Words that carry meaning in an objective, for searching existing work. */
export function keywords(text: string, n = 6): string {
  const stop = new Set(["build", "write", "create", "make", "with", "that", "this", "from", "into", "page", "site", "website", "report", "about", "their", "your", "have", "will", "should", "which", "what", "when", "where", "a", "an", "the", "and", "for", "of", "to", "in", "on", "it", "is"]);
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !stop.has(w)).slice(0, n).join(" ");
}
