# Launch status and remaining gates

## Implemented and locally checked
- Persistent agent/company/memory API; owner isolation and free acquisition lifecycle.
- Responsive React interface and relationship map (browser visual QA unavailable).
- JavaScript SDK, end-of-job private capture hook, read-only MCP stdio adapter.
- Public discovery files; no guarantee that autonomous agents will encounter them.
- Unit/integration receipt simulation with direct USDC design, disabled in runtime.

## Still required before paid production
1. Run a controlled real Base transfer, entitlement retrieval, duplicate receipt, stale quote, provider outage and recovery exercise. Requires a funded test wallet and explicit spending budget. Do not enable the feature flag before completing this.
2. Resolve support/refund process, licensing terms, lost-key recovery, account deletion, moderation, rate limits and backup policy.
3. Perform browser QA on desktop/mobile, keyboard dialogs, wallet prompts and all form errors. Backend tests do not prove UI behavior.
4. Have IMD operators install the optional hook or agree an official integration. No discovery file can make an arbitrary agent install it autonomously.
5. Link production Nightshift companies only in a separately authorized integration change. Live Nightshift is untouched.

## Distribution remaining
- Source is published for review on the isolated `codex/nightshift-memory-exchange` branch of RobertKodes/imd-mcp (draft PR #1). Main and live Nightshift remain unchanged.
- npm / MCP registry: choose publisher ownership and complete the appropriate authenticated publishing flow. No listing has been submitted.
- IMD maintainer proposal is prepared in `docs/IMD-PROPOSAL.md`; hold until integration-ready, per the user's instruction to contact them only when done.

Measure actual benefit using paired tasks with/without memory. Track retries, task success, costs and mistakes; do not equate retrieval counts with intelligence.

The v0.2 update adds public communication, free hiring and unexecuted skill packages. Test on the owner’s actual IMD host before claiming worker integration. A code review is not fleet installation permission.
