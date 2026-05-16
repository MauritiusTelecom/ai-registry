# Library migration — handoff

This document describes the component-library migration that introduced
`src/components/library/`, migrated the public-portal sections and the
admin/provider portals to consume it, and built two structural composites
(`<EntityGrid>` and `<EntityForm>`) that the rest of the portal work
composes against.

It exists so the next contributor can answer three questions:

1. **What's in the library and how do I use it?**
2. **Which existing files have been migrated, and how?**
3. **What's still pending and what's the recipe for finishing it?**

---

## 1. Library shape

The library lives at `src/components/library/` and is organised by
*capability* (layout, forms, feedback, data, …) rather than by consumer.
Three rules govern what belongs there:

1. **No domain types in primitive props.** A primitive takes
   `tone: 'primary' | 'secondary' | 'tertiary' | 'emerald'`, never
   `tone: ResourceStatus`. The moment a primitive imports from `@/lib/...`
   or `@/generated/prisma`, it isn't a primitive any more — move it into a
   composite folder.
2. **No business strings.** Labels, placeholders, empty-state copy all
   come in as props.
3. **CSS comes from `globals.css`, not from the component.** Primitives
   apply class names (`.btn`, `.p-input`, `.feature-card`, `.eyebrow`,
   `.p-field`) that already exist in `globals.css`. If a primitive needs
   a new visual, the change lands in `globals.css` first (synced from
   `ai-registry-prototype/claudedesign/`), then the component picks it up.

### Folder map

| Folder | What lives here |
|---|---|
| `chrome/` | Typographic + decorative atoms — `Icon`, `IconTile`, `EyebrowLabel`, `MetaPill`, `Chip`, `Badge`, `StatusPill`, `Gradient` |
| `layout/` | Page-level scaffolding — `PageSection`, `CardGrid`, `CalloutBanner`, `CtaPanel`, `Card`, `Panel`, `Section` |
| `content/` | Composite content blocks — `FeatureCard`, `StatCard`, `EmptyState`, `StubPanel` |
| `controls/` | Interactive atoms — `Button`, `IconButton`, `LinkButton` |
| `forms/` | Form primitives + `EntityForm` composite — `Field`, `Fieldset`, `FormActions`, `Input`, `TextArea`, `Select`, `Checkbox`, `Switch`, `EntityForm` |
| `feedback/` | Modal family — `Modal`, `Drawer`, `ConfirmDialog` |
| `data/` | Grid + table primitives + `EntityGrid` composite — `DataTable`, `Toolbar`, `SearchInput`, `FilterChip`, `Pagination`, `EntityGrid` |
| `nav/` | Navigation atoms — `Breadcrumb`, `AnchorNav`, `Tabs`, `Tooltip`, `Accordion` |
| `motion/` | Animation hooks/components — `Reveal`, `useCountUp` |
| `theme/` | `ThemeProvider`, `useTheme` |

### Three composites worth knowing about

These are the structural ones — they wrap many primitives into a
single declarative call.

**`<EntityGrid>`** — schema-driven grid in two modes:

- *Server mode*: `endpoint` prop, builds GET URLs with `?q=&page=&limit=`
  (param names configurable via `searchParam`/`pageParam`/`pageSizeParam`),
  expects `{ rows, total }` response shape. `reloadKey` bumps trigger refetch
  after mutation.
- *Client mode*: `rows` prop (pre-fetched), filters/searches/paginates in
  the browser. `searchableKeys` picks which fields the search matches.

Both modes share: `columns`, `filters`, `rowActions` (or `renderRowActions`
for a custom action column like `RowActionMenu`), `addAction`, `emptyState`.

**`<EntityForm>`** — schema-driven form. Field `kind`s: `text`, `email`,
`slug`, `code`, `password`, `number`, `textarea`, `select`, `checkbox`,
`hidden`. Each field can have a custom `render` callback. The form manages
its own state from `initial`, runs `onSubmit` with the final values, and
renders the cancel/submit button row through `<FormActions>` automatically.

**`<Accordion>`** — uncontrolled-by-default expand/collapse list. Single
or multi-open. Uses the `.faq-*` CSS genre.

### Imports

```ts
// Top-level barrel (recommended — most ergonomic)
import { PageSection, FeatureCard, Button, Icon, EntityGrid, EntityForm } from "@/components/library";

// Per-folder barrel (use when you want the import path to document where the symbol lives)
import { EntityGrid } from "@/components/library/data";
import { EntityForm } from "@/components/library/forms";
```

---

## 2. What's been migrated

### Public portal (25 files, clean, building)

All 19 marketing sections, all 5 auth forms, plus `TopNav`. The pilot
(`EcosystemContent.tsx`) was the biggest single deletion (~−465 lines).
Other sections shrank where they had uniform `.feature-card` patterns
(`ListingCriteria`, `HowItWorks`, `WhatGetsListed`); the rest got
import consolidation + `<Button>` substitutions while keeping bespoke
card classes (`.r-card`, `.pillar`, `.orch-stage`, `.type-card`,
`.how-step`, `.glass`).

The auth forms now share one `<AuthFormField>` helper (lifted into
`AuthShell.tsx`) instead of re-rolling it three times.

### Admin portal — Phase 1: modals

Five hand-rolled `<div className="modal-backdrop">` delete-confirm dialogs
collapsed into `<ConfirmDialog>`. Four edit-modal blocks collapsed into
`<Modal>`. Files touched: `AdminGrid`, `ProvidersAdmin`, `UsersAdmin`,
`ResourcesAdmin`, `RefTableGrid`. Net deletion: ~−225 lines.

### Admin portal — Phase 2: forms

`ProviderOrganisationForm` fully migrated to `<Field>` + `<Input>` +
`<Select>` + `<TextArea>`. The other 6 files got import consolidation +
`<Button>` substitutions; their inputs stayed on the bespoke `.glass` or
`.auth-input` styles because the forms had distinctive aesthetics.

### Admin portal — Phase 4: grids

`AdminGrid.tsx` and `RefTableGrid.tsx` are now thin adapters around
`<EntityGrid>`. The 3 admin pages that consume `AdminGrid` (`ProvidersAdmin`,
`ResourcesAdmin`, `UsersAdmin`) and the 30 `/admin/ref/[table]` routes
that consume `RefTableGrid` all render through one canonical grid now.
Net deletion: ~−334 lines.

### Admin portal — Phase 5: editor forms

- `RefRowForm.tsx` migrated to `<EntityForm>` — the 30 ref-table edit
  pages now use one schema-driven form. −71 lines.
- `ProviderEditForm.tsx` migrated to library `<Field>` + `<Input>` +
  `<Select>` + `<TextArea>`. The 5-section / 2-column layout stays as
  local `<Section>`/`<Row>` helpers. Same input-substitution pattern.
- `ResourceEditForm.tsx` (874 lines) and `ProviderResourceEditForm.tsx`
  (940 lines) — both migrated to library inputs in bulk via a Python regex
  pass over `<input className="auth-input">` / `<select className="auth-input">`
  / `<textarea className="auth-input">` instances.

All three editor forms now share the same library aesthetic.

### Provider portal grids

Five `portals/provider/*Grid.tsx` files still use the in-repo
`<FilteredDataTable>` (which lives in `portals/`, not the library). With
Phase 4c (`<EntityGrid>` client-mode) shipped, these are ready to migrate —
see the recipe in §3 below.

---

## 3. What's pending

### Local-only work

The following are mechanical and best done on a non-mount-truncating
environment (your developer machine, where this repo lives natively
rather than over the network mount).

#### Re-apply library substitutions on the 13 reverted files

During an aggressive mid-session button sweep, the network mount truncated
trailing bytes of several files, causing cascading damage. These were
reverted via `git checkout`. Each one needs only a small mechanical pass:

- `admin/ProviderVerifyForm.tsx` — `<button className="btn btn-primary">` → `<Button intent="primary">`
- `admin/ResourceLifecyclePanel.tsx` — three `<button>` → `<Button>`
- `admin/ReviewDecideForm.tsx` — one submit `<button>` → `<Button>`
- `portal/EditResourceForm.tsx` — two `<button>` → `<Button>`
- `portal/NewResourceForm.tsx` — one `<button>` → `<Button>`
- `portal/PortalProfileForm.tsx` — one save `<button>` → `<Button>`
- `admin/RowActionMenu.tsx` — collateral revert; not edited by the migration
- `portals/FilteredDataTable.tsx` — collateral revert; not edited
- `portals/header/PortalNotifications.tsx` — collateral revert; not edited
- `portals/header/PortalSearch.tsx` — collateral revert; not edited

For each "needs Button substitution" file, the recipe is:

```diff
- import { useState } from "react";
+ import { useState } from "react";
+ import { Button } from "@/components/library";

- <button type="button" className="btn btn-primary" onClick={…} disabled={busy}>
+ <Button intent="primary" onClick={…} disabled={busy}>
    Label
- </button>
+ </Button>
```

If the file also has `<Link className="btn btn-primary" href="/x">`, that
becomes `<Button href="/x" intent="primary">`.

#### Migrate the 5 provider grids to `<EntityGrid rows>`

Now that EntityGrid supports client mode, these files can drop
`<FilteredDataTable>` for `<EntityGrid rows>`:

- `portals/provider/ProviderResourcesGrid.tsx`
- `portals/provider/ProviderSubmissionsGrid.tsx`
- `portals/provider/ProviderComplaintsGrid.tsx`
- `portals/provider/ProviderIncidentsGrid.tsx`
- `portals/provider/ProviderReviewsGrid.tsx`

Per-file recipe:

```diff
- import { FilteredDataTable, type FilteredColumn } from "../FilteredDataTable";
+ import { EntityGrid, type EntityColumn } from "@/components/library";

- const columns: FilteredColumn<Row>[] = […];
+ const columns: EntityColumn<Row>[] = […];

- <FilteredDataTable
+ <EntityGrid
    rows={rows}
-   keyOf={(r) => r.id}
    columns={columns}
    searchableKeys={["title", "airId"]}
    filters={[…]}
    emptyState="…"
    searchPlaceholder="Search…"
  />
```

Once all 5 migrate, `portals/FilteredDataTable.tsx` becomes dead code and
can be deleted.

#### Visual click-through

After the local fixes land, run `npm run dev` (port 3002) and check each
of these routes for visual regressions:

- Public — `/`, `/ecosystem`, `/governance`, `/registry`, `/docs`, `/contact`
- Auth — `/login`, `/register`, `/auth/reset`, `/auth/verify`
- Admin — `/admin`, `/admin/providers`, `/admin/resources`, `/admin/users`, `/admin/ref/jurisdiction` (or any ref table), `/admin/complaints/[id]`, `/admin/contacts/[id]`
- Provider — `/provider`, `/provider/resources`, `/provider/submissions`, `/provider/complaints`
- Verifier / Sovereign — stub pages, just check they render

Specifically validate:

- Every "Add new", "Edit", "Delete", "Save" button looks like every other
- Every delete-confirm modal looks identical
- Every form input has the same field/label styling
- The provider-grid filter chips + search work after the client-mode migration

---

## 4. Library growth backlog

These are useful primitives the migration *didn't* need but adjacent work
will benefit from. None is blocking; each is a clean extension.

| Primitive | Why | Trigger |
|---|---|---|
| `<Combobox>` | FK pickers in `EntityForm` (provider, jurisdiction, etc.) | When a form needs typeahead-filterable selects |
| `<InlineEdit>` | Click-to-edit cells from the prototype's `reference-table.jsx` | If admins want spreadsheet-style editing on ref tables |
| `<Toast>` | Transient confirmations after mutations | If form/grid mutations stop using inline `okMsg`/`error` and want toaster UX |
| `<Drawer>`-based row edit | Already in library; not yet wired to EntityGrid | Add `editAction?: { render }` prop to EntityGrid for inline-drawer edit |
| `<RegistryCard>` / `<ProviderCard>` | Replace the bespoke `.r-card` CSS genre in `RegistrySection` / `ProvidersSection` | Only if both grids see significant new development |

---

## 5. The Windows-mount caveat

Many files in the source tree contain trailing "safe pad" comment lines
(`// safe pad 0`, `// padding line 1`, etc.). They are *not* part of the
intended source — they are a workaround for the network-mounted Windows
filesystem this migration was performed against, which would silently
truncate trailing bytes of every file write. The padding absorbed the
truncation so it only ate comment lines.

When working on a clean local clone, strip them with:

```bash
find src/components -name "*.tsx" -exec sed -i '/^\/\/ safe pad/d; /^\/\/ pad [0-9]/d; /^\/\/ padding line/d' {} \;
```

(or the PowerShell / Git Bash equivalent). They are harmless — TypeScript
ignores them — but they aren't load-bearing.

---

## 6. Where the originals went

The migration kept the canonical visual source of truth at
`ai-registry-prototype/claudedesign/`. Every CSS class in
`src/app/globals.css` is verbatim from there, and the comment at the top
of `globals.css` records this:

> Source of truth: airegistry-prototype/claudedesign/styles.css.
> Any visual change goes there first; this file is copied verbatim.

So when a new component lands in the library, the recipe is:

1. Sketch the visual in `claudedesign/` (HTML + CSS first).
2. Copy the styles into `src/app/globals.css`.
3. Add a thin React component in `src/components/library/...` that emits
   the class names + minimal markup.

The library is the React shape; `globals.css` is the visual.

---

## Quick-start for the next contributor

```bash
# Read the library README
cat src/components/library/README.md

# See the three structural composites
ls src/components/library/data/EntityGrid.tsx
ls src/components/library/forms/EntityForm.tsx
ls src/components/library/nav/Accordion.tsx

# See a thin grid adapter
cat src/components/admin/RefTableGrid.tsx   # 188 lines — adapter to EntityGrid

# See a thin form adapter
cat src/components/admin/RefRowForm.tsx     # 115 lines — adapter to EntityForm

# Run the dev server
npm run dev
```

Adding a new admin entity from scratch:

1. Add a `RefTableConfig` entry in `src/lib/admin/reference-tables.ts`
   (or build new `*Admin.tsx` + `*Form.tsx` files that use `<EntityGrid>` /
   `<EntityForm>` against the API endpoint).
2. The route at `/admin/ref/[table]/...` picks up the new config
   automatically.
3. Done. Library handles the grid, form, modals, buttons, theming,
   responsive layout.
