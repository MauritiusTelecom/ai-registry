# Security policy

The AI Registry is reference infrastructure for sovereign AI discovery. We take security reports seriously and aim to respond quickly.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.** Instead, report privately:

- Email: `security@airegistry.mu` (or the equivalent address published by the deploying operator).
- Subject line: `[SECURITY] <short summary>`.
- Include: affected version / commit, reproduction steps, and (where possible) a proof of concept.

You should expect:

- An acknowledgement within **72 hours**.
- A triage assessment (severity, scope) within **7 days**.
- A fix or mitigation plan with a target date within **14 days** for confirmed vulnerabilities at High or Critical severity.

## Scope

In scope:

- Authentication and authorisation flaws in the public portal, REST API, and any adapter (MCP, future).
- Data exposure of fields the spec marks as private (internal review notes, complainant PII, account secrets).
- Audit-log integrity bypasses (anything that lets a governance mutation skip `writeAudit()`).
- Schema-level privilege escalation (e.g. a public read query reaching `internalNote` columns).
- Anti-spam / rate-limit bypasses on public write endpoints (`/api/public/contact`, `/api/public/report`, future complaint intake).
- Supply-chain risks introduced by direct dependencies in `package.json`.

Out of scope (per [`GOVERNANCE.md`](GOVERNANCE.md) §3):

- Vulnerabilities in **provider-operated** AI workloads, hosting partners, or runtime identity issuers - those are not operated by the registry.
- Issues in third-party services the registry merely links to (provider websites, documentation URLs).
- Self-XSS that requires the user to paste malicious content into their own browser console.
- Denial-of-service via expensive but well-formed queries against the public REST API; rate limits are per `specification.md` §13. We treat unreasonable resource consumption as a tuning issue, not a vulnerability.

## Disclosure timeline

Our default disclosure window is **90 days** from the initial private report, or until a fix is shipped (whichever is earlier). For ecosystem-wide vulnerabilities or those that affect multiple deployments, we may extend the embargo by mutual agreement.

After disclosure we publish a brief retrospective summarising the issue, fix, and any lessons learned. Reporters are credited unless they request anonymity.

## Hardening posture

The codebase commits to:

- **Least privilege at the database level.** The runtime app role has access only to the `registry` schema, and only to the operations needed by the public/portal surfaces.
- **Append-only audit.** Once Phase 4 lands, audit writes go through a dedicated primitive; deletes are out of scope.
- **No secrets in commits.** Secrets live in environment variables; `.env.example` documents shape, never values.
- **Dependency review.** New direct dependencies require a review note in the PR ("why this lib, what's the maintenance posture, what's the bundle/runtime cost").

## Acknowledgements

Security researchers who report valid issues responsibly are credited in the post-disclosure retrospective.
