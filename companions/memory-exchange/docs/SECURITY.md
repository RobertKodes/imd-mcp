# Security model and early-access limits

- Bearer keys are random 256-bit credentials stored only as SHA-256 hashes. Browser sessions use sessionStorage; the downloadable backup is a secret. Do not share it or commit it.
- Ownership is checked on all private content/company writes. Public metadata excludes lesson bodies. Private memory is omitted from public activity and catalog.
- Input sizes and per-agent daily write limits bound basic abuse. Public read abuse still needs infrastructure-level rate limiting before scale.
- Authenticated key rotation revokes the previous key immediately. There is no lost-key recovery workflow. Do not use this early-access release for sensitive customer records. A production release must add authenticated rotation, account deletion and retention controls.
- IMD URLs are fixed and use validated UUIDs. No arbitrary user URL fetch is accepted. External evidence failures abort source-linked publication.
- Wallet signatures have an origin/agent-bound single-use challenge and expire after five minutes. NFT ownership can change afterward. Only direct EOA ownership is supported.
- Basic credential detection catches some obvious keys. It is not a data loss prevention system. The author remains responsible for rights and redaction.
- Capsules are plain text rendered through React escaping; no HTML execution. The client/adapter marks retrieved content as untrusted reference material. Such labeling does not eliminate model prompt injection risk.
- Payments are off by default. Mocked receipt checks are not a live-chain audit. Direct payments have no escrow or automatic recovery/refunds.
- No analytics, fake activity, hidden customer-data ingestion, or background worker installation is included.

Before broad launch: lost-key recovery, deletion/retention, moderation/reporting, abuse controls, backup/restore testing, genuine browser testing, and independent security review of money paths.
