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

# Landing module — Data model (entities and relationships)

Conceptual model for the **public marketing / home** surface. Field-level tables and prototype constants live in [`data-dictionary.md`](data-dictionary.md).

## Entities

| Entity | Description |
|--------|-------------|
| **MarketingShell** | The client-side SPA shell: layout chrome, route outlet, global modals, and design-time controls. One active instance per browser tab. |
| **ThemePreference** | User’s light/dark presentation choice persisted for the shell. |
| **Route** | Current top-level view derived from URL hash (`home`, `registry`, …). |
| **Visitor** | Optional end-user identity in the prototype (mock session); when absent, the shell treats the user as anonymous. |
| **DesignTweaks** | Optional demo parameters (palette index, motion intensity, section density) that adjust visuals without changing canonical copy. |
| **AccentPalette** | A named set of brand RGB coordinates; **DesignTweaks** selects exactly one at a time. |
| **RegistryResource** | A catalog row representing a listable AI artifact (model, agent, MCP skill, tool) with provider, status, and descriptive metadata. |
| **ResourceKind** | Taxonomy value classifying a **RegistryResource** (`model`, `agent`, `skill`, `tool`). |
| **VerificationStatus** | Trust / lifecycle label on a **RegistryResource** (e.g. verified, trusted, active). |
| **ResourceReport** | A user-submitted complaint or flag concerning one **RegistryResource** (reason, narrative, contact). |
| **PublicMetric** | A static headline statistic definition shown on the home metrics strip (label, target value, trend text). |
| **GovernancePillar** | A narrative block explaining one governance dimension (icon, title, body). |
| **PipelineStage** | An ordered step in the “journey” orchestration narrative; the **set** of stages depends on which static bundle (A or B) ships with the page. |
| **FaqItem** | One expandable question and authoritative answer on the home FAQ; **set** is bundle-specific. |
| **NavigationItem** | A primary nav target (route id + label) in the sticky header. |
| **FooterColumn** | A labelled group of footer links (product, resources, legal, …); structure is bundle-specific. |
| **HeroShowcaseCard** | A decorative floating card beside the hero globe (entity kind, display name, status, provider)—fixed set on the home hero. |

## Relationships

```mermaid
erDiagram
  MarketingShell ||--|| ThemePreference : persists
  MarketingShell ||--|| Route : displays
  MarketingShell o|o| Visitor : may_have
  MarketingShell ||--o| DesignTweaks : may_include
  DesignTweaks }o--|| AccentPalette : selects
  MarketingShell ||--o{ RegistryResource : lists_on_home
  RegistryResource }o--|| ResourceKind : has_kind
  RegistryResource }o--|| VerificationStatus : has_status
  RegistryResource o|o{ ResourceReport : may_receive
  MarketingShell ||--o{ PublicMetric : shows_metrics
  MarketingShell ||--o{ GovernancePillar : explains
  MarketingShell ||--o{ PipelineStage : narrates_journey
  MarketingShell ||--o{ FaqItem : publishes
  MarketingShell ||--o{ NavigationItem : exposes
  MarketingShell ||--o{ FooterColumn : exposes
  MarketingShell ||--o{ HeroShowcaseCard : decorates_hero
```

Narrative rules:

1. **MarketingShell** owns **ThemePreference**, **Route**, and the collections rendered on the home path (resources, metrics, pillars, stages, FAQs, nav, footer columns, hero cards). It does not imply a single server aggregate root in the prototype—only a logical grouping.

2. **Visitor** is optional; **NavigationItem** behaviour (e.g. portal links) may depend on **Visitor** roles when present.

3. **DesignTweaks** is optional UI state; when present it constrains **AccentPalette** selection and motion parameters consumed by the hero visual—not the logical identity of **RegistryResource** rows.

4. Each **RegistryResource** has exactly one **ResourceKind** and one **VerificationStatus** at display time.

5. **ResourceReport** applies to at most one **RegistryResource** per submission; cardinality from the resource side is zero-to-many reports over time (prototype does not persist).

6. **PipelineStage** and **FaqItem** are **versioned by marketing bundle** (see [`product.md`](product.md) bundle A vs B): same entity type, disjoint content sets—do not merge rows across bundles.

7. **PublicMetric**, **GovernancePillar**, and **HeroShowcaseCard** are ordered collections; order is part of the presentation contract.

## Scope note

This model describes the **landing / home** module and its prototype. It is intentionally silent on backend persistence, national registry APIs, and portal applications linked from the header.
