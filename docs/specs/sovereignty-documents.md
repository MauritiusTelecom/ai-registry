# Spec - Sovereignty documents (provider + resource verification proof)

**Status:** Draft for implementation
**Author:** AI Registry team
**Date:** 2026-05-25
**Estimated effort:** 3-4 engineering days

---

## 1. Goal

Today the registry's "verified" badge is backed by hyperlinks the provider pasted in. There is no document, no artifact, no audit trail. If a regulator asks "what evidence backs this verification?", we have no answer.

This spec adds **two complementary uploads**:

1. **Provider-level documents** ("we are a real, registered company") - one set per Provider:
   - Company registration / BRN certificate
   - Authorised signatory proof
   - Compliance certifications (ISO 27001, SOC 2, etc.)
   - Tax / regulatory standing
2. **Resource-level documents** ("this specific AI solution meets the claims") - per Resource:
   - Audit reports
   - Model / system cards
   - Penetration test results
   - Data governance attestations

Both share the same storage and serving layer that we built for review-thread attachments. This spec is purely additive: it extends the existing `SovereigntyEvidence` table for resource docs (currently URL-only), and adds a brand-new `ProviderDocument` table for provider-level docs.

---

## 2. User stories

1. **As a provider**, when I'm setting up my organisation profile on `/provider/settings`, I can upload my company registration certificate, ISO 27001 cert, and other proof documents. I can mark each one public or verifier-only.
2. **As a provider**, when I'm editing a resource on `/provider/resources/[id]/edit`, the existing "Evidence" section now lets me upload a file alongside each evidence row (audit report, model card, etc.), not just paste a URL.
3. **As a verifier** opening a review, I see the provider's organisation documents and the resource's evidence documents in a dedicated panel. I can download each one and form an opinion.
4. **As the public**, on `/registry/[slug]` I see the *flagged-public* resource documents as download pills below the listing summary. Verifier-only documents stay hidden.
5. **As an admin**, I can see every document, public or private, on any provider or resource.

---

## 3. Data model

### 3.1 Reuse the existing `SovereigntyEvidence` table for resource docs

The `SovereigntyEvidence` table already exists with `referenceUrl` and `issuingBody`. Add file-attachment columns so each evidence row can OPTIONALLY carry an uploaded file:

```prisma
model SovereigntyEvidence {
  // ... existing fields ...

  // NEW: optional file attachment
  fileStorageKey   String?
  fileFilename     String?
  fileContentType  String?
  fileSizeBytes    Int?
  fileChecksumSha256 String?
  fileUploadedAt   DateTime?
}
```

Either the existing `referenceUrl` (external link) OR the new file fields can be set; both is allowed (link + uploaded copy).

### 3.2 New `ProviderDocument` table for provider-level docs

```prisma
model ProviderDocument {
  id              String   @id @default(uuid())
  providerId      String
  documentTypeId  String

  title           String
  description     String?

  fileStorageKey  String   @unique
  filename        String
  contentType     String
  sizeBytes       Int
  checksumSha256  String

  /** When true, shown on the public provider page. Default false. */
  publicVisibility Boolean @default(false)

  /** Optional expiry. Verifiers see a warning on the review page once expired. */
  expiresAt       DateTime?

  uploadedById    String   @db.Uuid
  uploadedAt      DateTime @default(now())

  provider     Provider             @relation(fields: [providerId], references: [id], onDelete: Cascade)
  documentType ProviderDocumentType @relation(fields: [documentTypeId], references: [id], onDelete: Restrict)
  uploadedBy   User                 @relation(fields: [uploadedById], references: [id])

  @@index([providerId])
  @@index([documentTypeId])
  @@schema("registry")
}

model ProviderDocumentType {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  documents ProviderDocument[]

  @@schema("registry")
}
```

Seed the following `ProviderDocumentType` codes:

| code | name |
|---|---|
| `company_registration` | Company registration certificate |
| `authorised_signatory` | Authorised signatory proof |
| `compliance_iso27001` | ISO 27001 certification |
| `compliance_soc2` | SOC 2 attestation |
| `tax_standing` | Tax / regulatory standing |
| `other` | Other supporting document |

(Operators can add more via SQL or an admin UI later.)

---

## 4. File storage

**Reuses the existing `AttachmentStorage` interface** (built for review threads). Two storage prefixes inside the same `THREAD_ATTACHMENT_ROOT`:

```
<root>/providers/<providerId>/<documentId>.<ext>
<root>/resources/<resourceId>/<evidenceId>.<ext>
```

No new storage backend, no new mount point, no new deploy ops. The `mkdir`/`chmod` block in `scripts/deploy-v2.sh` already creates `<root>/threads/`; same root, just additional subdirs created lazily on first upload.

---

## 5. API endpoints

All under `apps/portal/src/app/api/portal/`. Auth required. Permission rules in §6.

### 5.1 Provider documents

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/provider/documents` | provider users on that provider, admin | List the caller's provider's documents |
| POST | `/provider/documents` | provider users on that provider, admin | Upload (multipart). Body fields: `file`, `documentTypeCode`, `title`, `description?`, `publicVisibility?`, `expiresAt?` |
| GET | `/provider/documents/[id]/file` | provider users / admin / public-if-public | Stream the file (authed; falls through to public if publicVisibility=true and viewer is anyone) |
| DELETE | `/provider/documents/[id]` | uploader within 10 min OR admin anytime | Delete record + file |

### 5.2 Resource evidence file attachments

We extend the existing evidence routes (not introducing new resource document table - we're adding file fields to the existing `SovereigntyEvidence`).

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/resources/[id]/evidence/[evidenceId]/file` | resource owner provider users, admin | Upload file to an existing evidence row (multipart `file`). Replaces any existing file on this row |
| DELETE | `/resources/[id]/evidence/[evidenceId]/file` | uploader within 10 min OR admin | Detach file (clears file* columns, removes file from disk) |
| GET | `/resources/[id]/evidence/[evidenceId]/file` | depends on `publicVisibility` of the evidence row | Stream the file |

If you want to upload evidence + file in one shot, use the existing evidence-create endpoint AND immediately follow with file upload to the new row's id.

All file validation (MIME sniff, EXIF strip, size limits) reuses the helpers from `apps/portal/src/lib/portal/sniff-mime.ts` and the `sharp` re-encode path. Limits identical to review-thread:

- 10 MB per file
- Allowed types: PDF, PNG, JPEG, GIF, WebP, plain text, ZIP

---

## 6. Permissions

| Action | Provider users (own provider) | Admin | Verifier | Public |
|---|---|---|---|---|
| Upload provider doc | ✓ | ✓ | ✗ | ✗ |
| List provider docs | ✓ (own only) | ✓ (any) | ✓ (any, read-only) | ✗ |
| Stream provider doc | ✓ (own) | ✓ | ✓ | ✓ if `publicVisibility=true` |
| Delete provider doc | ✓ within 10 min if uploader | ✓ anytime | ✗ | ✗ |
| Upload resource evidence file | ✓ (own resource) | ✓ | ✗ | ✗ |
| Stream resource evidence file | ✓ (own resource) | ✓ | ✓ | ✓ if `publicVisibility=true` on the evidence row |
| Delete resource evidence file | ✓ within 10 min if uploader | ✓ anytime | ✗ | ✗ |

Server-side checks. Reuse existing provider-ownership helpers in `packages/core/src/lib/portal/ensure-provider.ts`.

---

## 7. UI changes

### 7.1 `/provider/settings` - new "Documents" section

A new card below the existing organisation profile section. Lists existing provider documents in a table:

| Type | Title | Public | Expires | Uploaded | Actions |
|---|---|---|---|---|---|
| Company registration | MT BRN cert.pdf | Yes | - | Anjini R., 2 days ago | View / Delete |
| ISO 27001 | ISO 27001 2026.pdf | Yes | 2027-03-01 | Anjini R., today | View / Delete |

Below the table: an "Upload document" button opens a small dialog with:
- Type dropdown (the 6 seeded codes)
- Title (text)
- Description (textarea, optional)
- File picker (drag-and-drop, same component pattern as review-thread)
- Public visibility checkbox
- Expiry date (optional)
- Submit / Cancel

### 7.2 `/provider/resources/[id]/edit` - extend the existing Evidence section

The existing evidence editor today shows rows with `sovereigntyBasis`, `evidenceType`, `referenceUrl`, etc. Add a "File" column showing either:

- "No file attached" with an "Upload" button
- The filename + size + "Replace" + "Remove" buttons

Same upload flow as provider docs.

### 7.3 Verifier review page (`/verifier/queue/[reviewId]`)

Add a new panel above the Conversation panel: **"Verification documents"**. Two sub-sections:

- "Provider organisation documents" - lists all `ProviderDocument` rows for the resource's provider. Each row shows type, title, file pill, public/private flag, expiry warning if expired.
- "Resource evidence documents" - lists all `SovereigntyEvidence` rows for this resource that have a file attached.

Verifier clicks any file pill to download/preview.

### 7.4 Public listing pages (`/registry/[slug]`, `/providers/[slug]`)

- **Provider page**: a new "Documents" section below the about block, showing only provider docs with `publicVisibility=true`.
- **Resource page**: the existing evidence list now shows a file pill next to any evidence row that has a file AND `publicVisibility=true`.

---

## 8. Notifications

This is a quiet feature - no automatic emails when a document is uploaded. Verifiers see new docs the next time they open the review.

(Future: optional "notify verifier on new provider doc" toggle. Not in v1.)

---

## 9. Edge cases

- **File for already-public evidence**: if `SovereigntyEvidence.publicVisibility=true`, the file is also public. The two flags are linked, not separate.
- **Replacing a file on an evidence row**: the old file is removed from disk; only the latest is kept. Audit log entry written.
- **Document type deactivated**: existing docs of that type are read-only but still visible. New uploads of that type are rejected.
- **Provider deleted (cascade)**: all `ProviderDocument` rows cascade-delete; files are cleaned by the existing nightly orphan-cleanup job, extended to also walk `providers/` and `resources/` dirs.
- **Expired provider docs**: shown with a yellow warning on the verifier review page. Verifier may still approve; expiry is informational.

---

## 10. Out of scope

- **Versioning of documents.** Replacing a file just replaces it. No history.
- **Document signing / cryptographic provenance.** Future: PDF signature verification, X.509 chain, etc.
- **OCR or content extraction.** We don't parse the PDFs.
- **Automated cert validity checks** (e.g. checking the ISO body's public registry).
- **Workflow for "request document from provider"** (verifier asks for a specific doc). Use the review thread for that.

---

## 11. Acceptance criteria

1. ✅ Provider can upload a PDF on `/provider/settings`, selecting type "Company registration" and marking it public. It appears in the documents table.
2. ✅ The same document appears on the public `/providers/[slug]` page in a Documents section, as a downloadable pill.
3. ✅ A verifier-only document does NOT appear on the public provider page but does appear for the verifier on the review page.
4. ✅ Provider can attach a PDF to an existing evidence row on a resource edit page. The file shows up next to the URL.
5. ✅ The verifier review page shows both provider documents and resource evidence files in a "Verification documents" panel.
6. ✅ Public resource listing shows files only for evidence rows marked public.
7. ✅ Uploader can delete their own upload within 10 minutes; admin can delete anytime; provider users cannot delete each other's uploads after the window.
8. ✅ All uploads enforce 10 MB / allowed types / MIME-byte sniff / EXIF strip via the existing helpers.
9. ✅ New tables/columns migrate cleanly via `pnpm prisma:migrate`; type seeds populate via the migration SQL.
10. ✅ Nightly orphan-cleanup job extended to walk `providers/` and `resources/` storage subdirs.

---

## 12. Open questions

1. Should the provider-doc "Public" toggle be per-document or per-document-type? **Recommended:** per-document.
2. Do we want a default "expiresAt" auto-set for cert types (ISO certs typically 3-year)? **Recommended:** no - rely on the provider's input.
3. Should the verifier be able to request a specific doc type that's missing? **Recommended:** out of scope; use the review thread.
