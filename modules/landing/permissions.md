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

# Landing module — Home page permissions and access

## Public surface

- The marketing **home** view is **unauthenticated public** content: all hero, metrics, registry browse, governance, orchestration, promo, FAQ, and footer text are visible without login.
- No server-side permission checks exist in the prototype; catalog and metrics are **static mock data**.

## Optional mock authentication (nav only)

- **Log In** simulates a session in browser memory (`AuthProvider` React state); it does not call an API.
- **User menu** portal entries are **client-side gated** by role membership on the mock user:
  - `admin` role → show **Admin Portal** link.
  - `provider` role → show **Provider Portal** link.
  - `verifier` or `admin` → **Verifier Portal** link.
  - `sovereign` or `admin` → **Sovereign Portal** link.
- **Account settings** is a non-functional placeholder (closes menu only).
- **Log Out** clears mock user; **Log In** returns.

## Report action

- Any visitor can open **Report** from a registry card in the prototype; submission is **local validation only** (no persistence). A production registry would attach real auth and rate limits separately — this spec does not change the prototype’s public affordance for reporting.

## Theme and tweaks

- Theme toggle and Tweaks panel are available without login (design prototype behaviour). A production app may hide **TweaksPanel** entirely; if kept for internal demos, it must not alter canonical copy/colours/motion specified in `product.md` for end-user builds.

## Related assets

- Static portal HTML under `airegistry-prototype/claudedesign/portals/` is **outside** the home route composition; permissions for those portals are not defined here beyond the mock role flags above.
