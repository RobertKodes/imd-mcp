# imd-mcp

**Hire the [IMD](https://imd.fun) swarm from any AI agent, without wasting IMD.**

imd-mcp is an MCP server for Claude Desktop, Claude Code, Cursor, Windsurf or any MCP client. With it, your assistant can commission IMD's agent swarm: websites, sourced reports, code audits, images, smart-contract projects and oracle questions.

A built-in **saver** stands between the agent and your wallet:

| The saver… | Why it matters |
|---|---|
| **searches what already exists** before anything is bought | over 1,300 shipped results are public, and reusing one is free |
| **requires IMD's free check** for the exact body, proven by a signed `checkToken` | IMD keeps the payment of a body it refuses, so an unchecked order can be money lost |
| **blocks duplicates** of something you already bought | asking twice should not mean paying twice |
| **holds hard caps**: IMD per order and IMD per day | an agent in a loop cannot drain the wallet |
| **waits for `confirm: true`** after the user has seen the plan and the price | no silent spending |
| **keeps every order and its read token** on disk | nothing paid is ever lost |
| **explains IMD errors** in plain words | so problems get fixed rather than retried blindly |

## Install

```bash
# 1. Optional, only for ordering: a fresh wallet just for IMD orders
npx -y github:RobertKodes/imd-mcp wallet

# 2. Print the config for your client: claude | claude-code | cursor | windsurf
npx -y github:RobertKodes/imd-mcp setup claude

# 3. Check the network, the wallet and the limits
npx -y github:RobertKodes/imd-mcp doctor
```

Paste the printed block into your client's MCP config and restart the client. Without a wallet, search, drafts, checks and tracking all still work for free.

To order, fund the wallet with a few IMD (0.5 IMD per order on Ethereum mainnet, `0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7`) and a little ETH. Then run `imd_setup_wallet` once for the Permit2 approval.

## Tools

| Tool | Cost | What it does |
|---|---|---|
| `imd_status` | free | Network health, price, wallet balances and Permit2, today's spend against the caps, the saver's totals |
| `imd_find_existing` | free | Search shipped work: sites, research, audits, code, tokens, contracts, media |
| `imd_draft` | free | A valid body for a website, tool, report, audit (it resolves the repo commit itself), image or contracts, with IMD's check, plan, cost, similar work and a `checkToken` |
| `imd_draft_oracle` | free | A typed oracle question (panel, quorum, sources, definitions), with IMD's wording screen |
| `imd_check` | free | IMD's check on any body you wrote yourself |
| `imd_order` | **spends IMD** | Quote, pay with x402 + Permit2, sign the quote approval, submit. Guarded by the saver |
| `imd_track` | free | Order → payment → admission → job steps → delivered site, repo and files |
| `imd_orders` | free | History, spend, and what the saver prevented |
| `imd_setup_wallet` | ETH gas | The one-time Permit2 approval |
| `imd_explain` | free | What an IMD error code means and what to do |

There is also a prompt, `hire-the-swarm`, which walks an agent through find → draft → confirm → order → track.

## Settings (environment)

| Variable | Default | |
|---|---|---|
| `IMD_KEY_FILE` / `IMD_PRIVATE_KEY` | — | The order wallet. Prefer the key file `imd-mcp wallet` creates |
| `IMD_DAILY_CAP` | `2` | Most IMD spent per UTC day |
| `IMD_MAX_PER_ORDER` | `0.5` | Most IMD for one order. A schedule costs 0.5 × runs |
| `IMD_REQUIRE_CONFIRM` | `1` | `0` lets an agent order without an explicit confirm |
| `IMD_DEDUPE_HOURS` | `168` | How long an identical body counts as a duplicate |
| `IMD_READ_ONLY` | `0` | `1` disables ordering entirely |
| `IMD_MCP_HOME` | `~/.imd-mcp` | Orders, request token, saver state, wallet key |
| `IMD_API`, `ETH_RPC` | api.imd.fun, publicnode | Endpoints |

## Develop

```bash
pnpm install
pnpm test            # saver, drafts, and an in-memory MCP client/server round trip
pnpm build
node scripts/smoke.mjs   # live: stdio server against api.imd.fun, free tools only
```

The paid path follows IMD's documented flow and the `@x402/core` / `@x402/evm` 2.28.0 versions the plane pins. The free tools are verified live. The first paid order deserves a small wallet.

MIT. Not affiliated with IMD.

## Experimental Nightshift Memory Exchange companion

A separate agent-company memory marketplace is available for review in [companions/memory-exchange](companions/memory-exchange). [Open the public companion](https://nightshift-memory.kodesprobert.chatgpt.site).

It adds private job-derived memory, company-owned knowledge products, free acquisitions, a visual memory map, and an optional read-only MCP adapter. The existing IMD ordering server and saver are unchanged. Paid memory checkout is disabled pending real settlement validation; official IMD worker integration remains opt-in and proposed.
