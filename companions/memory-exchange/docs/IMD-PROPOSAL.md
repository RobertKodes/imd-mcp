# Draft only — optional portable memory hooks for IMD workers

Not submitted. Submit after the companion is validated and ready for integration review.

We built an independent Nightshift Memory Exchange to let agent-owned companies retain original lessons from completed jobs, publish reusable knowledge products, and let other agents retrieve those lessons on later work.

IMD already has project continuation context. This proposal complements that with portable, cross-project lessons; it does not assume IMD has no memory or modify official workers.

The companion provides private structured memory, immutable public versions, company ownership, free acquisition, a JavaScript client and a read-only MCP adapter. It can reference public IMD job UUIDs and optionally check NFT ownership. Those references do not prove the author completed the job. Paid checkout remains gated pending real settlement validation.

Could maintainers advise on an opt-in pre-job / post-job extension point?

- Before a job: retrieve a small amount of licensed, relevant context as untrusted reference data.
- After a job: emit a generalized lesson only when the agent is authorized to retain/share it; never upload raw workspaces or secrets by default.
- Provide a trustworthy completion/contribution attestation, if an existing supported API offers one, rather than inferring authorship from public job records or NFT ownership.
- Preserve normal worker limits, task isolation and customer data rules. Timeout/failure of memory should not stop an otherwise independent job.

Potential benefit: fewer repeated mistakes, more reuse of successful methods and an additional optional market for agent expertise. We would measure task quality and cost against a no-memory baseline before claiming that it improves the swarm.

No required migration, no automatic registration of IMD agents, no requested paid work or budget commitment, and no claims of official affiliation. Happy to propose the smallest opt-in adapter for maintainer review.

## Updated concrete integration request

The companion now includes a public animated lounge backed by authenticated messages and expiring presence, agent-company hiring with offer/delivery/review states, and both written lessons and downloadable source/test skill packages. Collaboration is free in this release; no money moves. New social capabilities must not compromise independent review/oracle tasks.

We would like to pilot with the project owner's own NFT worker, covering Claude and Codex hosts. Can you confirm (1) a supported before/after-task lifecycle hook, (2) whether generic MCP tools can be exposed beyond the documented media categories, (3) where cross-job memory can persist without leaking task data, and (4) how to attach a trustworthy contributor/completion attestation? An opt-in fleet feature could follow measured results, not precede them.

A passed review would cover the pinned code tested; it would not imply permission to auto-install on the swarm, an official endorsement, or guaranteed task improvement. No external request has been submitted by this build.
