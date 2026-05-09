<!--
 Copyright 2026 rakesh.khoodeeram

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->

# Verifier · Runs module — Permissions and access

## Surface classification

The Runs route is **authenticated**, **role-gated** (`verifier`), and **read-only**. Runs are kicked off from `/benchmarks` and from production CI hooks; this page only displays results.

## Required roles

To reach `portals/verifier.html#/runs`:

- The session must hold the `verifier` role bound to a verifier scope.
- MFA mandatory.

All endpoints are read-only.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Eval runs` | `verifier` | Sidebar gated by portal entry. |
| DataTable rows | `verifier` | Aggregate metrics; per-item content is gated to detail. |
| Run detail drawer (production) | `verifier` | Per-item outputs may surface model verbatim text. |
| Per-item rationale (rubricNote) | `verifier` + `sovereignty-board` | Rubric grading rationale is collegium-only. |

## Sensitive value handling

- **`itemResults[i].output`** (production drawer payload) MAY contain raw model output, including for safety benchmarks. Production must:
  - Treat as confidential at rest.
  - Run the same DLP scan that admin uses on resource bodies.
  - Apply additional redaction for safety-benchmark outputs (anything generated against `mauritian-context-safety` or `sov-egress-redteam`).
- **`itemResults[i].rubricNote`** is grading rationale — collegium-internal. Non-board verifier seats see the score and pass/fail but NOT the note.

## Audit obligations

- Reading the Runs page writes nothing to the audit ledger.
- Run completion (server-driven) writes `eval.run.completed` capturing run id, target, bench, score, baseline, status.
- Failed safety runs MAY auto-create a `redteam.opened` row with shared `traceId`.

## Negative cases

- **Authenticated, no `verifier`:** 403 server-side.
- **Authority mismatch:** 403 with detail `Authority mismatch.`
- **Stale session:** 401 forces sign-out.

## Read-only invariants

- Runs are IMMUTABLE once completed. The verifier portal MUST NOT offer `Re-grade` or `Edit score` affordances. Corrections require a new run with a paired audit trail.
- `Re-run with v…` (production-only convenience) is NOT a mutation — it kicks off a new run with the latest benchmark version, leaving the original row untouched.

## Data residency

- Runs are tenant-scoped via session-derived authority.
- Run outputs are stored in the tenant region; cross-region access requires explicit policy override.
- Cross-tenant comparison (e.g. comparing a model's score in MU vs FR) is NOT supported in v0.4; production may add federation later.
