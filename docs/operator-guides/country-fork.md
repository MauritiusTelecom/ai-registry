# Operator fork guide - adding a new country / sector verification

This guide walks through writing a verification extension for a new
country (e.g. Rwanda RDB) or a new sector (e.g. banking compliance).
**You do not modify core**. Everything lives in a new package under
`extensions/`.

The same pattern works for any "providers must satisfy this gate
before they go public" rule.

---

## What you need

- A unique reverse-DNS-ish id for the extension, e.g. `rw-rdb-check`
- A label for the requirement, e.g. "Rwanda Development Board company code"
- The applicability rules: which providers does this requirement apply to?
- An admin who can verify each row (this part is generic - the
  `/admin/verifications` UI handles it for every extension)
- Optionally a format check for the registration number itself

---

## Step 1 - create the package skeleton

```
cp -r extensions/mauritius-brn-check extensions/rwanda-rdb-check
cd extensions/rwanda-rdb-check
```

Edit `package.json`:

```json
{
  "name": "@airegistry/extension-rwanda-rdb-check",
  "version": "0.1.0",
  ...
}
```

---

## Step 2 - declare the requirement in the plugin manifest

`extensions/rwanda-rdb-check/airegistry-plugin.json`:

```json
{
  "id": "rw-rdb-check",
  "name": "Rwanda RDB Check",
  "version": "0.1.0",
  "license": "Apache-2.0",
  "maintainer": "Rwanda ICT Chamber <info@example.rw>",
  "coreRange": "^0.2.0",
  "verificationRequirements": [
    {
      "code": "rdb",
      "label": "Rwanda Development Board company code",
      "appliesWhen": {
        "providerJurisdiction": ["RW"]
      },
      "documentTypeHint": "company_registration"
    }
  ],
  "rest": [
    {
      "path": "/validate",
      "methods": ["POST", "GET"],
      "handler": "@airegistry/extension-rwanda-rdb-check/rest/validate"
    }
  ]
}
```

Applicability supports three filters (all optional, AND-combined):

- `providerJurisdiction`: array of ISO-style codes the provider must match
- `providerSectors`: array of sector codes (provider must have at least
  one resource in any of these sectors)
- `providerKinds`: array of provider-type codes (e.g. `sovereign_operator`)

Omit a filter to mean "any". An empty `appliesWhen: {}` means "every provider".

---

## Step 3 - write the format check

`extensions/rwanda-rdb-check/src/lib/validate-rdb.ts`:

```ts
const RDB_REGEX = /^\d{9}$/;

export function checkRdbFormat(raw: string) {
  const rdb = raw.trim();
  if (!RDB_REGEX.test(rdb)) {
    return { rdb, formatOk: false, reason: "RDB must be 9 digits." };
  }
  return { rdb, formatOk: true };
}
```

`extensions/rwanda-rdb-check/src/rest/validate.ts`:

```ts
import { NextResponse } from "next/server";
import { checkRdbFormat } from "@airegistry/extension-rwanda-rdb-check/lib/validate-rdb";

export async function POST(req: Request) {
  const body = (await req.json()) as { rdb?: string };
  if (typeof body.rdb !== "string") {
    return NextResponse.json({ error: "rdb is required" }, { status: 400 });
  }
  return NextResponse.json(checkRdbFormat(body.rdb));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json(checkRdbFormat(url.searchParams.get("rdb") ?? ""));
}
```

That's the entire backend code path - everything else is handled by
the platform.

---

## Step 4 - install as a workspace dep

Add to **both** `apps/portal/package.json` and
`packages/plugin-host/package.json`:

```json
"@airegistry/extension-rwanda-rdb-check": "workspace:*"
```

Then `pnpm install`.

---

## Step 5 - deploy

```
pnpm deploy:v2
```

On first deploy, `scripts/backfill-verifications.ts` runs and creates
`ProviderVerification` rows for every existing provider matching your
new applicability rules. The grandfather rule marks them verified so
existing providers don't disappear from public catalog.

After that, every newly-registered Rwanda provider will see "Rwanda
Development Board company code" as a pending requirement on their
`/provider/settings` page, and admins will see it in the queue at
`/admin/verifications`.

---

## What does the operator actually see?

### Provider side, on `/provider/settings`

A "Verification status" card appears automatically. It shows every
applicable requirement with a pill (Verified / Pending / Rejected /
Missing). When a requirement is rejected, the verifier's note shows
inline.

The same card is used by every extension - you don't write per-
extension UI.

### Admin side, on `/admin/verifications`

A unified queue. Each row is one pending requirement. The label,
extension id, and queued date are shown. Any documents the provider
has uploaded that match the `documentTypeHint` are linked inline.
Admin clicks Verify or Reject with a note.

Again, generic - your extension contributes nothing to this UI.

### Public catalog

A provider is publicly listed **iff** every applicable requirement
has been verified. Their resources follow the same gate. If a Mauritian
banking AI provider needs both `mu-brn-check` and `mu-bom-banking-license`
verified, they stay hidden until both green-tick.

---

## Composing extensions

The model is composable. Examples:

- **Sector overlay**: `mu-bom-banking-license` adds a requirement only
  when a provider has resources in finance, banking, or insurance. A
  generic Mauritian provider isn't affected.
- **Cross-country same-sector**: `health-iso-13485` could apply to any
  jurisdiction's providers in the `health` sector.
- **Provider-type gate**: `sovereign-operator-charter-mou` could apply
  only to `providerKind = "sovereign_operator"`.

All stack without coordination. The platform just AND-s them together.

---

## What is intentionally NOT in this model (yet)

- **Resource-level requirements** - a specific AI solution in one
  sector might need different evidence than another solution from the
  same provider. v0.3 feature.
- **Time-bounded verifications** - "re-verify every 12 months". v0.3.
- **Workflow / multi-step** - verification today is a binary
  verified-or-not. State machine ("evidence requested", "under review",
  "appeal") is v0.4.
- **Federated verification** - "Rwanda accepts a Mauritius BRN-verified
  provider without re-checking". Separate federation milestone.

For these, file an issue or extend the model and submit a PR.
