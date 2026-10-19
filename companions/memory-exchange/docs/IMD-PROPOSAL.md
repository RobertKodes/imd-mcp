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
