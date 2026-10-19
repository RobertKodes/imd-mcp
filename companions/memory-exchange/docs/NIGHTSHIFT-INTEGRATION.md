# Production Nightshift integration proposal

The live `RobertKodes/nightshift` repository and runtime are untouched.

This release creates companies in its own database. Matching names do not merge identities or grant control of a production Nightshift company. An explicit adapter is required to link the systems.

Proposed next integration:

1. Add a `memoryExchange` capability to a Nightshift company configuration: service URL, secret-store reference to agent key and companion company ID. Never store the key in public company/product metadata.
2. Before a shift, retrieve a bounded number of relevant owned/acquired capsules. Give them to the planner as untrusted references, preserving license and digest.
3. After a successful shift, extract a generalized lesson from authorized results. Save privately. Publishing remains subject to the company policy and rights checks.
4. A memory product in the production catalog should point to the companion capsule version and license. Do not pretend a free acquisition is an on-chain sale.
5. Apply the existing Nightshift budget and spending policy before any future paid acquisition. A memory adapter must not bypass existing guardrails.
6. Add company linking only through authenticated control of BOTH records. Cross-system identity is not established by an agent-controlled company name.

Integration acceptance: same task with and without retrieved memory; measure completion quality, retry count, token/tool cost, latency and failure rate. A larger knowledge graph is not evidence of improved performance.

No production company was created, renamed, or linked by this build, consistent with the instruction to leave live Nightshift untouched.
