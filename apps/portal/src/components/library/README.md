# `components/library/` — shared primitive layer

Cross-portal primitive components consumed by the public site and the four role
portals (`admin`, `provider`, `verifier`, `sovereign`).

## Three rules

1. **No domain types in primitive props.** A primitive takes `tone: 'primary' | 'secondary' | 'tertiary' | 'emerald'`, never `tone: ResourceStatus`. The moment a primitive imports from `@/lib/...` or `@/generated/prisma`, it's no longer a primitive and should move into one of the composite folders.

2. **No business strings.** Labels, placeholders, empty-state copy all come in as props. The primitive owns *how* a label looks, never *what* it says.

3. **CSS comes from `globals.css`, not from the component.** Primitives apply class names (`.btn`, `.p-input`, `.feature-card`, `.eyebrow`) that already exist in `globals.css`, and use the token CSS variables for any inline style. If a primitive needs a new visual, the change lands in `globals.css` first (synced from `ai-registry-prototype/claudedesign/`), then the component picks it up. The Claude design files remain the canonical visual source of truth.

## Folders

| Folder | What lives here |
|---|---|
| `chrome/` | Typographic and decorative atoms — `Icon`, `IconTile`, `EyebrowLabel`, `MetaPill`, `Chip`, `Badge`, `StatusPill`, `Gradient` |
| `layout/` | Page-level scaffolding — `PageSection`, `CardGrid`, `CalloutBanner`, `CtaPanel`, `Card`, `Panel`, `Section` |
| `content/` | Composite content blocks — `FeatureCard`, `StatCard`, `EmptyState`, `StubPanel` |
| `controls/` | Interactive atoms — `Button`, `IconButton`, `LinkButton` |
| `forms/` | Form primitives — `Field`, `Fieldset`, `FormActions`, `Input`, `TextArea`, `Select`, `Checkbox`, `Switch` |
| `feedback/` | Modal family — `Modal`, `Drawer`, `ConfirmDialog` |
| `data/` | Grid + table atoms — `DataTable`, `Toolbar`, `SearchInput`, `FilterChip`, `Pagination` |
| `nav/` | Navigation atoms — `Breadcrumb`, `AnchorNav`, `Tabs`, `Tooltip` |
| `motion/` | Animation hooks/components — `Reveal`, `useCountUp` |
| `theme/` | Theming providers — `ThemeProvider` |

## Imports

The library exposes a top-level barrel so consumers can write:

```ts
import { PageSection, FeatureCard, CardGrid, Button, Icon } from "@/components/library";
```

Per-folder barrels exist too if you prefer the more expressive form:

```ts
import { FeatureCard } from "@/components/library/content";
```

Both work. Pick one convention per file.

## Re-exports

Some primitives already live elsewhere in the codebase (`Icon`, `Modal`,
`Reveal`, `useCountUp`, `ThemeProvider`, `StatCard`, `StatusPill`, `StubPanel`,
`DataTable`). The library re-exports them under the new path so the
codebase can migrate incrementally without breaking existing imports. New
code should import from `@/components/library`; existing imports can be
moved opportunistically.
