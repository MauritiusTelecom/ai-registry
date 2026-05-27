# Spec - Resource versioning + re-approval flow

**Status:** Draft for implementation
**Author:** AI Registry team
**Date:** 2026-05-25
**Estimated effort:** 4-5 engineering days

---

## 1. Goal

Today an already-listed resource cannot be edited at all. The edit form is gated to draft / needs_update only. If a provider needs to update a verified listing, there is no path.

The versioning feature lets a provider edit a listed resource. The edit becomes a **draft version**. The public continues to see the previously-approved version until the new draft is re-verified and approved. The trust mark stays attached to the approved content; it does not move silently when the provider changes claims.

**Scope (Option A, simplest):** version only the scalar fields on `Resource` (title, descriptions, URLs, license, version label, risk level). Many-to-many relations (languages, sectors, tags, endpoints, evidence) stay attached to `Resource` directly. This is enough to protect the trust mark for the fields that contain provider *claims*; M:N relations stay editable inline because they are categorical, not claims.

Promote to full versioning (Option B - snapshot M:N too) only if a real concern surfaces.

---

## 2. Data model

### 2.1 New `ResourceVersion` table

```prisma
model ResourceVersion {
  id              String   @id @default(uuid())
  resourceId      String
  versionNumber   Int                              // monotonically increasing per resource (1, 2, 3, ...)
  statusId        String                           // draft | submitted | approved | rejected

  // Versioned scalar snapshots
  title           String
  shortDescription String
  longDescription  String?
  accessUrl        String?
  sourceCodeUrl    String?
  documentationUrl String?
  termsUrl         String?
  license          String?
  versionLabel     String?
  providerVersionNumber String?                    // the provider-supplied semver, not our internal `versionNumber`
  latencyTier      String?
  riskLevelId      String

  createdById     String   @db.Uuid
  createdAt       DateTime @default(now())

  submittedAt     DateTime?
  approvedById    String?  @db.Uuid
  approvedAt      DateTime?
  rejectedById    String?  @db.Uuid
  rejectedAt      DateTime?
  decisionNote    String?

  resource    Resource                  @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  status      ResourceVersionStatusType @relation(fields: [statusId], references: [id])
  riskLevel   RiskLevel                 @relation(fields: [riskLevelId], references: [id])
  createdBy   User                      @relation("ResourceVersionCreatedBy", fields: [createdById], references: [id])
  approvedBy  User?                     @relation("ResourceVersionApprovedBy", fields: [approvedById], references: [id])
  rejectedBy  User?                     @relation("ResourceVersionRejectedBy", fields: [rejectedById], references: [id])

  @@unique([resourceId, versionNumber])
  @@index([resourceId])
  @@index([statusId])
  @@schema("registry")
}

model ResourceVersionStatusType {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  versions ResourceVersion[]

  @@schema("registry")
}
```

Seed:

| code | name |
|---|---|
| `draft` | Draft - provider is editing |
| `submitted` | Submitted - awaiting verifier review |
| `approved` | Approved - this is or was a live version |
| `rejected` | Rejected - verifier did not approve |

### 2.2 `Resource` gains 2 nullable pointers

```prisma
model Resource {
  // ... existing fields ...

  currentPublishedVersionId String? @unique
  draftVersionId            String? @unique

  currentPublishedVersion ResourceVersion? @relation("ResourceCurrentPublishedVersion", fields: [currentPublishedVersionId], references: [id], onDelete: SetNull)
  draftVersion            ResourceVersion? @relation("ResourceDraftVersion", fields: [draftVersionId], references: [id], onDelete: SetNull)

  versions ResourceVersion[]
}
```

### 2.3 Backfill (in the migration)

For every existing `Resource`:

- Create a `ResourceVersion` row with `versionNumber=1`, `status=approved`, snapshotting the current scalar fields, `createdBy = first admin user` (fallback to a placeholder UUID if none), `approvedAt = now()`.
- Set `Resource.currentPublishedVersionId` to that version's id.
- `draftVersionId` remains NULL.

After backfill, every Resource has a v1 history entry and the live state is unchanged.

**Public reads do NOT need to change.** `Resource.title` etc. stay authoritative for what the public sees. The version table is parallel history.

---

## 3. Lifecycle

```
                       ┌────────────────────────────┐
                       │ Listed Resource (v1 live)  │
                       └─────────────┬──────────────┘
                                     │ provider opens edit
                                     ▼
                       ┌────────────────────────────┐
   draft version  ◀────┤ Create draft v2            │  (Resource.draftVersionId = v2)
   (v2, status=draft)  └─────────────┬──────────────┘
                                     │ provider clicks "Submit edits"
                                     ▼
                       ┌────────────────────────────┐
                       │ v2 status = submitted      │  (opens new Review tied to v2)
                       └─────────────┬──────────────┘
                                     │ verifier approves
                                     ▼
   v2 = approved        Resource gets v2's scalar fields,
   v1 stays in history  currentPublishedVersionId = v2,
                        draftVersionId = NULL
                                     │ verifier rejects
                                     ▼
                       v2 status = rejected, draftVersionId stays
                       so provider can keep editing the same draft
```

Edit-gate change:

- **Today:** edit allowed only when `Resource.lifecycle == draft | needs_update`.
- **After:** edit also allowed when `Resource.lifecycle == listed`. In that case, opening the edit page creates (or opens) a draft version. The provider edits the draft, not the live resource.

`Resource.lifecycleStatus` stays "listed" the whole time; we no longer flip it to "submitted" for re-edits because the public listing should not flicker. The signal that there's a pending edit is `Resource.draftVersionId != null`.

---

## 4. API surface

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/portal/resources/[id]/versions` | provider (own), verifier, admin | List all versions with status |
| POST | `/api/portal/resources/[id]/draft` | provider (own), admin | Open/get the draft version (idempotent) |
| PATCH | `/api/portal/resources/[id]/draft` | provider (own) | Update draft scalar fields |
| POST | `/api/portal/resources/[id]/draft/submit` | provider (own) | Move draft → submitted, open Review |
| POST | `/api/portal/resources/[id]/versions/[versionId]/approve` | verifier, admin | Approve draft, flip currentPublishedVersionId, clear draftVersionId |
| POST | `/api/portal/resources/[id]/versions/[versionId]/reject` | verifier, admin | Reject draft, leave draftVersionId set so provider can keep editing |

Existing `PATCH /api/portal/resources/[id]` keeps working for draft / needs_update lifecycle resources (no change).

---

## 5. UI changes

### 5.1 `/provider/resources/[id]/edit`

- Lift the edit-gate banner. If `lifecycle === "listed"` and no `draftVersionId`, show "You are editing this listing - changes will be reviewed before going live." and create the draft on first save.
- Form pre-fills with `currentPublishedVersion` fields if no draft exists, OR `draftVersion` fields if one does.
- "Save" writes to the draft. "Submit for review" moves draft → submitted.

### 5.2 New "Version history" panel on the resource detail / edit page

Read-only table:

| Version | Status | Updated | Updated by | Decision note |
|---|---|---|---|---|
| v3 (draft) | Draft | 2 min ago | Anjini R. | — |
| v2 | Approved (live) | 2026-05-10 | Rakesh K. | "Clarified data sources" |
| v1 | Approved | 2026-04-01 | Anjini R. | "Initial listing" |

Optional click-through to show the diff between any two versions (later).

### 5.3 Verifier review page

Already-built thread feature works as-is. Add a small "What changed" panel below the conversation showing the field deltas between `currentPublishedVersion` and the `draftVersion` being reviewed. Plain table (Field / Was / Now).

### 5.4 Public pages

**No change.** They still read `Resource.title` etc. directly. The "live" version's content is what's on the Resource row at all times.

---

## 6. Edge cases

- **Provider deletes draft mid-flight:** if `draftVersionId` is set and provider clicks "Discard edits", we delete the ResourceVersion row and clear `Resource.draftVersionId`. v1/v2/... history is untouched.
- **Verifier rejects:** `draftVersionId` stays set, version status flips to "rejected". Provider can edit the draft again and resubmit (treated as the same draft, status flips back to "draft").
- **Concurrent edits by two provider users on the same draft:** last-write-wins is acceptable. Optimistic concurrency token can be added later.
- **Resource hard-deleted:** versions cascade-delete.

---

## 7. Acceptance criteria

1. ✅ Provider opens `/provider/resources/[id]/edit` for a listed resource. The form loads. A banner explains "changes will be reviewed".
2. ✅ Provider edits the title, saves. A new ResourceVersion row appears with status=draft. The public listing still shows the old title.
3. ✅ Provider submits the draft. Version status flips to "submitted", a new Review opens, verifier gets the existing review notification.
4. ✅ Verifier opens the review, sees the "what changed" panel + the thread + the documents panel. Verifier approves.
5. ✅ Resource's scalar fields now equal the draft's values. `currentPublishedVersionId` points at the new version. `draftVersionId` is NULL. Public listing shows the new title.
6. ✅ The history panel on `/provider/resources/[id]/edit` shows v1 (old) and v2 (now live).
7. ✅ Migration backfills every existing resource with a v1=approved row pointing at currentPublishedVersionId.
8. ✅ Typecheck + build pass.

---

## 8. Out of scope

- Versioning of M:N relations (languages, sectors, tags, endpoints, evidence). Promote to Option B later if needed.
- Diff UI between any two arbitrary versions; only "draft vs currentPublished" diff is in scope.
- Rolling back to a previous version. (Possible later: verifier can pick any approved version as the new currentPublishedVersion.)
