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

# Verifier · Benchmarks module — Permissions and access

## Surface classification

The Benchmarks route is **authenticated**, **role-gated** (`verifier`), and **write-capable** via authoring + run actions.

## Required roles

To reach `portals/verifier.html#/benchmarks`:

- The session must hold the `verifier` role bound to a verifier scope.
- MFA mandatory.

To act on benchmarks:

- `POST /verifier/benchmarks` (`New benchmark`) → `verifier` + scope `sovereignty-board` (collegium author).
- `GET /verifier/benchmarks/{id}` / `/items` → `verifier`.
- `POST /verifier/benchmarks/{id}/runs` (`Run`) → `verifier`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Benchmarks` | `verifier` | Sidebar gated by portal entry. |
| `New benchmark` (header) | `verifier` + `sovereignty-board` | Disable with tooltip if scope insufficient. |
| Benchmark cards | `verifier` | Read-only display. |
| `Inspect` (per card) | `verifier` | Navigates to detail. |
| `Run` (per card) | `verifier` | Initiates a run; results land on `/runs`. |

## Sensitive value handling

- **Benchmark item content** (prompts, expected answers, rubrics) is operationally sensitive. Production must:
  - Treat as confidential at rest.
  - Run the same DLP scan that admin uses on resource bodies.
  - NEVER cache item bodies at the CDN edge.
- **Safety-kind items** (e.g. `mauritian-context-safety`, `sov-egress-redteam`) MAY contain adversarial prompts. Production must apply additional access control: only `verifier` + `sovereignty-board` can inspect safety items; non-board verifiers see only the count.

## Audit obligations

- Reading the Benchmarks page writes nothing to the audit ledger.
- POST `/verifier/benchmarks` → `benchmark.create`.
- POST `/verifier/benchmarks/{id}/runs` → `eval.run.started` (capturing actor, benchmark id, target slug).
- Item authoring / editing (production-only, separate UI) writes `benchmark.item.<verb>`.

## Negative cases

- **Authenticated, no `verifier`:** 403 server-side.
- **`verifier` without `sovereignty-board` clicks `New benchmark`:** UI MAY surface the modal but submit returns 403; preferred UX is to disable up-front.
- **`Run` against a non-existent target:** 404; SPA surfaces inline error in the run modal.
- **Stale session:** 401 forces sign-out.

## Data residency

- Benchmark rows and items are tenant-scoped via session-derived authority.
- Cross-tenant benchmark sharing is **not** implied by v0.4. A regional benchmark co-developed with `IndianOceanCom` would be replicated under each tenant's collegium with attribution.
