# Spec - Provider review thread with attachments (simple ticketing on a review)

**Status:** Draft for implementation
**Author:** AI Registry team
**Date:** 2026-05-21
**Estimated effort:** 7-9 engineering days, 1 dev (5 for thread + 2-4 for attachments)

---

## 1. Goal

When a verifier rejects (or otherwise touches) a submission, the provider must be able to:

- **Read why** the verifier flagged it.
- **Reply** with more evidence or a question.
- **Attach files** - PDFs, images (PNG / JPEG), text files, ZIPs - to back up the reply.

The verifier must be able to respond in the same thread, see all attachments, and resolve the conversation when satisfied.

Today the provider sees only a status change, which is a dead-end.

The manager's framing: **a simple ticketing module - problem submission and a thread, with file attachments.**

This spec is self-contained. It does not depend on any other spec.

---

## 2. User stories

1. **As a verifier**, when I reject a submission I can write a reason that the provider sees in their portal.
2. **As a provider**, when my submission is rejected I see the reason and a "Reply" box where I can attach additional evidence (PDF or image) or ask a clarifying question.
3. **As a verifier**, I receive a notification when a provider replies. I open the thread, read the reply, **view any attached images inline** (PDFs open in a new tab), and respond in the same thread.
4. **As either party**, I can see the full chronological history of the conversation on this review, including all uploaded files.
5. **As an admin**, I can read any thread; I can also join a thread that started between the verifier and provider.
6. **As either party**, I can **drag and drop** a file onto the composer to attach it.

---

## 3. Data model

A new `ReviewThread` aggregate, attached to an existing `Review`. Each `Review` has at most one open `ReviewThread`. Each message can have N attachments (separate table, not JSON).

### 3.1 Prisma schema additions

Add to `packages/core/prisma/schema.prisma` after the existing `Review` model:

```prisma
model ReviewThread {
  id            String   @id @default(uuid())
  reviewId      String   @unique
  review        Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  statusId      String                              // open | awaiting_provider | awaiting_verifier | resolved | closed
  status        ReviewThreadStatusType @relation(fields: [statusId], references: [id])

  openedById    String
  openedBy      User     @relation("ReviewThreadOpenedBy", fields: [openedById], references: [id])

  resolvedById  String?
  resolvedBy    User?    @relation("ReviewThreadResolvedBy", fields: [resolvedById], references: [id])
  resolvedAt    DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  messages      ReviewThreadMessage[]

  @@schema("registry")
}

model ReviewThreadStatusType {
  id          String   @id @default(uuid())
  code        String   @unique          // open, awaiting_provider, awaiting_verifier, resolved, closed
  name        String
  description String?
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  threads     ReviewThread[]

  @@schema("registry")
}

model ReviewThreadMessage {
  id           String   @id @default(uuid())
  threadId     String
  thread       ReviewThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  authorId     String
  author       User     @relation(fields: [authorId], references: [id])
  authorRole   String                                // verifier | provider | admin (denormalised for display)

  body         String   @db.Text                     // plain text + auto-linked URLs (no markdown, no HTML)
  systemEvent  String?                                // null for normal messages; "status_changed" / "review_decision" / etc.

  createdAt    DateTime @default(now())

  attachments  ReviewThreadAttachment[]

  @@index([threadId, createdAt])
  @@schema("registry")
}

model ReviewThreadAttachment {
  id            String   @id @default(uuid())
  messageId     String
  message       ReviewThreadMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)

  filename      String                                // original filename, sanitised
  contentType   String                                // MIME type, validated against allow-list
  sizeBytes     Int                                   // server-validated, max enforced (see §8)
  storageKey    String   @unique                      // relative path inside the storage root, e.g. "threads/<threadId>/<uuid>.pdf"
  checksumSha256 String                               // computed at upload time for integrity verification

  uploadedById  String
  uploadedBy    User     @relation(fields: [uploadedById], references: [id])

  createdAt     DateTime @default(now())

  @@index([messageId])
  @@schema("registry")
}
```

### 3.2 Status transitions (`ReviewThreadStatusType` seeds)

| code | name | meaning |
|---|---|---|
| `open` | Open | A verifier or admin opened the thread; no provider reply yet |
| `awaiting_provider` | Awaiting provider | Verifier is waiting for provider response |
| `awaiting_verifier` | Awaiting verifier | Provider has replied; verifier action pending |
| `resolved` | Resolved | Both parties agree the issue is closed |
| `closed` | Closed | Closed without resolution (e.g., resource withdrawn) |

Seed these in `packages/core/prisma/seed.ts` and `db:bootstrap`.

### 3.3 Migration

Use a Prisma migration (not `db:push`) since this adds four new tables. Name it `2026-05-XX-review-thread`.

---

## 4. File storage

### 4.1 Where files live

Files live on the **server filesystem** under a single root:

```
/data/ai-registry-v2/storage/threads/<threadId>/<attachmentUuid>.<ext>
```

Configurable via env var `THREAD_ATTACHMENT_ROOT` (default `./storage` resolved relative to the app root). The deploy script must:

1. Create the directory if missing (chmod 700, owned by the app user).
2. **Exclude it from `rsync --delete`** so user uploads survive across deploys (same approach as `apps/portal/public/branding/`).

Add to `.gitignore`:

```
/storage/
```

### 4.2 Why filesystem and not S3 for v1

Simpler, no cloud dependency, fits the sovereign-infrastructure narrative. The storage layer is wrapped behind a small interface so a future S3 / MinIO backend can be plugged in without changing the rest of the app.

```ts
// packages/core/src/lib/storage/index.ts
export interface AttachmentStorage {
  put(key: string, stream: Readable, opts: { contentType: string }): Promise<void>;
  get(key: string): Promise<{ stream: Readable; contentType: string; sizeBytes: number }>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

Ship a `FsAttachmentStorage` implementation backed by the filesystem root. Future `S3AttachmentStorage` can drop in.

### 4.3 Serving files back to the browser

Never expose the storage root via nginx. Files are served by an authenticated API route:

```
GET /api/portal/reviews/[reviewId]/thread/attachments/[attachmentId]
```

The route:

1. Authenticates the user.
2. Checks they have permission to view this thread (verifier / admin / provider-of-the-resource).
3. Streams the file from `AttachmentStorage.get(storageKey)` with the correct `Content-Type` and `Content-Disposition: inline; filename="<filename>"` (for images) or `attachment; filename="..."` (for PDFs / ZIPs).
4. Sets `Cache-Control: private, max-age=0` so the browser doesn't aggressively cache it.

This guarantees attachments cannot leak to anyone not on the thread.

---

## 5. API endpoints

All under `apps/portal/src/app/api/portal/reviews/[reviewId]/thread/`. Auth required. Permissions enforced server-side.

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/portal/reviews/[reviewId]/thread` | verifier, admin, provider-on-that-resource | Returns the thread + all messages + attachment metadata (NOT file contents) |
| POST | `/api/portal/reviews/[reviewId]/thread` | verifier, admin | Open a new thread; body: `{ message: string, status?: "open" \| "awaiting_provider" }` |
| POST | `/api/portal/reviews/[reviewId]/thread/messages` | any party on the thread | Append a message; body: `{ body: string }`. Server flips status |
| POST | `/api/portal/reviews/[reviewId]/thread/messages/[messageId]/attachments` | message author within 10 min of message creation | Upload a file. `multipart/form-data` with a `file` field. Returns the new `ReviewThreadAttachment` row |
| GET | `/api/portal/reviews/[reviewId]/thread/attachments/[attachmentId]` | verifier, admin, provider-on-that-resource | Stream the file back (see §4.3) |
| DELETE | `/api/portal/reviews/[reviewId]/thread/messages/[messageId]/attachments/[attachmentId]` | original uploader within 10 min of upload, OR admin anytime | Remove an attachment. Removes the file from disk and the DB row |
| PATCH | `/api/portal/reviews/[reviewId]/thread/status` | verifier, admin | Manually set status; body: `{ statusCode: "resolved" \| "closed" \| "open" }` |

### 5.1 Upload endpoint details (the important one)

`POST /api/portal/reviews/[reviewId]/thread/messages/[messageId]/attachments`

- Accepts `multipart/form-data` only.
- One file per request (keeps the implementation simple; the UI can call it N times in parallel for N files).
- Server-side validation (in order, fail fast):
  1. **Auth + permission** check (see §6).
  2. **Message ownership**: the user must be the author of the message, and the message must be < 10 minutes old. Otherwise 403.
  3. **MIME type**: must be in the allow-list (see §8). Validate against the **actual file bytes** with a sniff (e.g. `file-type` npm package), not just the `Content-Type` header.
  4. **Size**: max 10 MB per file. Reject 413 if larger.
  5. **Per-message count**: max 5 attachments per message. Reject 400.
  6. **Per-thread quota**: max 100 MB total across the whole thread. Reject 400 if this upload would exceed.
  7. **Filename sanitisation**: strip path components, normalise to ASCII alphanumerics + `._-`, max 200 chars. Original filename preserved in the DB; on-disk filename is `<uuid>.<sanitised-ext>`.
  8. **Compute SHA-256** while streaming to disk. Store in DB.
- Returns:

```json
{
  "id": "...",
  "filename": "iso27001-2026.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 412381,
  "checksumSha256": "abc123...",
  "uploadedBy": { "id": "...", "displayName": "ACME Provider" },
  "createdAt": "2026-05-21T09:14:00Z",
  "url": "/api/portal/reviews/{reviewId}/thread/attachments/{attachmentId}"
}
```

### 5.2 GET thread response shape

```json
{
  "thread": {
    "id": "...",
    "reviewId": "...",
    "status": { "code": "awaiting_verifier", "name": "Awaiting verifier" },
    "openedBy": { "id": "...", "displayName": "Anjini R.", "role": "verifier" },
    "createdAt": "2026-05-21T08:00:00Z",
    "messages": [
      {
        "id": "...",
        "author": { "id": "...", "displayName": "Anjini R.", "role": "verifier" },
        "body": "Please attach the latest ISO 27001 certificate.",
        "attachments": [],
        "systemEvent": null,
        "createdAt": "2026-05-21T08:00:00Z"
      },
      {
        "id": "...",
        "author": { "id": "...", "displayName": "ACME Provider", "role": "provider" },
        "body": "Attached the new cert and a screenshot of the audit summary.",
        "attachments": [
          {
            "id": "att-1",
            "filename": "iso27001-2026.pdf",
            "contentType": "application/pdf",
            "sizeBytes": 412381,
            "url": "/api/portal/reviews/<reviewId>/thread/attachments/att-1"
          },
          {
            "id": "att-2",
            "filename": "audit-summary.png",
            "contentType": "image/png",
            "sizeBytes": 89421,
            "url": "/api/portal/reviews/<reviewId>/thread/attachments/att-2"
          }
        ],
        "systemEvent": null,
        "createdAt": "2026-05-21T09:14:00Z"
      }
    ]
  }
}
```

---

## 6. Permissions

| Action | verifier | admin | provider-on-that-resource | other |
|---|---|---|---|---|
| GET thread | ✓ | ✓ | ✓ | ✗ |
| GET attachment file | ✓ | ✓ | ✓ | ✗ |
| POST new thread | ✓ | ✓ | ✗ (provider can only reply once verifier opens one) | ✗ |
| POST message | ✓ | ✓ | ✓ | ✗ |
| POST attachment (upload) | message author only, within 10 min of message creation | message author within 10 min OR admin anytime | message author only, within 10 min | ✗ |
| DELETE attachment | original uploader within 10 min, OR admin anytime | ✓ anytime | original uploader within 10 min | ✗ |
| PATCH status | ✓ | ✓ | ✗ | ✗ |

Server-side check: the requesting user must either be the assigned verifier on the review, an admin, or a user on the provider account that owns the resource being reviewed. Reuse existing authorisation helpers in `packages/core/src/lib/portal/...`.

---

## 7. UI flows

### 7.1 Verifier / admin side - `/verifier/queue/[reviewId]`

On the existing review detail page, add a new **"Conversation"** tab next to "Checklist" / "History".

- **Empty state** (no thread yet): textbox + drag-and-drop file zone + "Send to provider" button. Submitting calls `POST /thread`, then for each pending attachment calls `POST /attachments`.
- **Existing thread**: chronological list of messages (oldest first). Each message renders:
  - Avatar + display name + role pill (verifier / provider / admin) + timestamp.
  - Body text. URLs auto-linked.
  - Attachments rendered as:
    - **Images** (`image/png`, `image/jpeg`, `image/gif`, `image/webp`): inline thumbnail (max 240×240), click opens lightbox with the full image.
    - **PDFs and other**: pill with filename + size + download icon. Clicking opens the file in a new tab.
- **Composer at the bottom**:
  - Textarea (autosize).
  - Drag-and-drop overlay across the whole composer when a file is dragged in.
  - "Attach" button (paperclip icon) opens file picker.
  - Pending attachments shown as removable chips above the textarea before send.
  - "Send" button submits the message, then uploads each pending attachment in sequence. Show per-file upload progress.
- **Status pill at the top of the tab**: `open / awaiting_provider / awaiting_verifier / resolved / closed`.
- **"Mark resolved"** and **"Close"** buttons in the tab header (verifier and admin only).

### 7.2 Provider side - `/provider/reviews/[reviewId]`

The existing reviews grid links to a detail page. Add a "Conversation" panel:

- If thread `status` is `awaiting_provider`: highlight the panel; show "Reply" composer prominently.
- If thread `status` is `awaiting_verifier`: show messages, composer disabled with "Waiting on verifier" hint.
- If thread `status` is `resolved` or `closed`: read-only, composer hidden.
- Same image-inline / PDF-link rendering as the verifier side.
- Same drag-and-drop composer.

### 7.3 Drag-and-drop UX

When the user drags any file over the composer area:

1. The composer shows a dashed border + "Drop file(s) to attach" overlay.
2. Drop accepts up to 5 files; each is validated client-side (size, MIME) before queueing.
3. Files that fail validation show a toast with the reason; valid ones appear as chips.
4. Each chip has filename, size, a preview thumbnail (for images), and an X button to remove before send.

### 7.4 System messages

Whenever the underlying review changes status (verifier marks as `approved`, `needs_update`, `rejected`), an automatic `systemEvent` message is appended so the timeline is complete. Render in muted style, no avatar. Example: *"Review status changed to needs_update by Anjini R."*

---

## 8. File constraints

**Allowed content types** (validated against actual file bytes, not just the header):

| Type | Use case |
|---|---|
| `application/pdf` | Audit reports, certificates |
| `image/png` | Screenshots |
| `image/jpeg` | Photographed documents, photos of physical certs |
| `image/gif` | Rare but allowed (animated UI captures) |
| `image/webp` | Modern screenshot format |
| `text/plain` | Log excerpts, README files |
| `application/zip` | Bundled evidence (e.g. multiple log files) |

Anything else → reject with `415 Unsupported Media Type` and a clear message.

**Size limits:**

| Constraint | Limit |
|---|---|
| Max file size | **10 MB** per file |
| Max attachments per message | **5** |
| Max total size per thread | **100 MB** across all attachments |
| Max body length | **10 000 chars** per message |

**Filename rules:**

- Strip any path components (`/`, `\`).
- Normalise to ASCII; remove diacritics, replace non-`[A-Za-z0-9._-]` chars with `_`.
- Truncate to 200 chars.
- On-disk filename is `<attachmentUuid><.sanitised-ext>` so two providers can't collide.

---

## 9. Notifications

Email + in-app, mirroring the patterns already in `packages/core/src/lib/email/`:

| Event | Recipient | Template |
|---|---|---|
| Verifier opens a new thread on a review | Provider users on that resource | `EMAIL_REVIEW_THREAD_OPENED_*` |
| Provider replies | Verifier (assigned), admin | `EMAIL_REVIEW_THREAD_PROVIDER_REPLY_*` |
| Verifier replies | Provider users | `EMAIL_REVIEW_THREAD_VERIFIER_REPLY_*` |
| Status set to `resolved` | Both parties | `EMAIL_REVIEW_THREAD_RESOLVED_*` |

Template placeholders: standard ones + `{threadUrl}`, `{reviewTitle}`, `{authorName}`, `{excerpt}` (first 200 chars of the latest message), `{attachmentCount}` (number of files on the latest message, omitted if zero).

In-app notifications via the existing `apps/portal/src/lib/portal/notifications/...` pattern.

---

## 10. Edge cases and rules

- **Empty message + no attachments**: reject with 400. The message must have body text OR at least one attachment.
- **Editing / deleting messages**: NOT allowed in v1. Messages are immutable. (Attachments can be deleted by the uploader within 10 minutes; this is for typos / wrong-file uploads.)
- **Attachment uploaded but parent message has 5 already**: reject with 400.
- **Concurrent uploads exceeding thread quota**: server enforces atomically; first-wins, others get 400 with current usage / remaining.
- **Resource hard-deleted**: cascade deletes the review, thread, messages, attachments. Files on disk are deleted by the cascade trigger (see §11).
- **Resource soft-deleted**: thread stays readable in read-only mode. Files still accessible.
- **Thread reopening**: if status is `resolved` or `closed`, verifier or admin can reopen with `PATCH /status { statusCode: "open" }`. Provider cannot.
- **Virus scanning**: out of scope for v1. Document in the README that operators may want ClamAV or similar in front of the upload endpoint before going live.
- **EXIF stripping**: image uploads have EXIF metadata stripped server-side (use `sharp` to re-encode). Avoids leaking geolocation from phone photos.

---

## 11. File lifecycle on disk

| Event | What happens on disk |
|---|---|
| Successful upload | File written to `<root>/threads/<threadId>/<attachmentUuid>.<ext>`. DB row created |
| `DELETE /attachments/[id]` | File removed from disk, DB row deleted |
| Resource hard-deleted (cascade) | Background job removes the whole `<root>/threads/<threadId>/` directory after the DB cascade. Implement as a Prisma `onDelete` hook OR a daily cleanup job that finds orphaned dirs and removes them |
| Thread closed/resolved | Files stay; both parties may need to re-read the evidence later |

The cleanup job (recommended): `scripts/cleanup-orphaned-attachments.ts` runs nightly. Walks `<root>/threads/`, for each `<threadId>` dir checks if the thread still exists in DB. If not, deletes the dir. Logs results. Schedule via cron or pm2-cron.

---

## 12. Migration order for existing reviews

For any review that is already in `needs_update` or `rejected` state when this ships, **do not auto-create a thread**. A thread only appears when someone clicks "Send to provider" in the new UI. Existing rejections stay as-is; verifiers can open a thread retroactively.

---

## 13. Out of scope (do not build in v1)

These sound useful but inflate the spec:

- Threaded replies (replies-to-replies). Single flat timeline only.
- Reactions / emoji.
- Read receipts / "seen by".
- @mentions of other users.
- Typing indicators / websocket realtime. Polling refresh is fine; badges via existing notifications.
- Markdown rendering. Plain text + URL auto-link only.
- Thread search across the registry.
- Bulk reply / canned responses.
- Attaching files larger than 10 MB.
- Office formats (`.docx`, `.xlsx`, `.pptx`). Provider must export to PDF.
- Cloud storage backend (S3 / MinIO). Interface is there; implementation deferred.
- Virus scanning.

---

## 14. Acceptance criteria

Feature is done when:

1. ✅ A verifier on `/verifier/queue/[reviewId]` opens a new thread, writes a message, and submits. Provider receives email + in-app notification.
2. ✅ The provider on `/provider/reviews/[reviewId]` sees the message, drags a **PNG screenshot** into the composer, drags a **PDF certificate** in too, writes a reply, and submits. Both files upload and appear in the message.
3. ✅ The image is rendered **inline** as a thumbnail; clicking opens a lightbox. The PDF appears as a pill with filename and size; clicking opens it in a new tab.
4. ✅ The verifier receives email + in-app notification; opens the thread; sees the same inline rendering.
5. ✅ Either party can read the full thread including system events for review-status changes.
6. ✅ Verifier marks the thread resolved. Both parties get an email.
7. ✅ Permissions are enforced server-side (a different provider gets 403 on GET; a stranger gets 403 on attachment download).
8. ✅ Server validates uploaded file bytes (not just `Content-Type`) and rejects a `.exe` renamed to `.pdf`.
9. ✅ Uploading a 15 MB file is rejected with 413; uploading a 6th attachment to a message is rejected with 400.
10. ✅ Original uploader can delete an attachment within 10 min. After 10 min, only an admin can.
11. ✅ EXIF data is stripped from uploaded JPEGs (verify by re-downloading and inspecting metadata).
12. ✅ All four new tables migrate cleanly via `pnpm prisma:migrate` and seed cleanly via `pnpm db:seed`.
13. ✅ Manual QA via the QA single-inbox email redirect (`TEST_EMAIL_INBOX`) shows the four new email templates rendering with sample data.
14. ✅ `THREAD_ATTACHMENT_ROOT` (default `./storage`) is created on first upload with chmod 700, owned by the app user.
15. ✅ `pnpm deploy:v2` does NOT wipe the storage directory on the server (it is excluded from `rsync --delete`).

---

## 15. Open questions for the implementer

1. Should the thread also be visible to **other users on the provider's account** (multi-user providers in scope after team-management ships) or only to the user who submitted the resource? **Recommended:** all users on the provider account, scoped by resource ownership.
2. When the review is reassigned to a different verifier mid-thread, does the new verifier get the email on the next provider reply? **Recommended:** yes; follow the `Review.assignedToId` at the time of the event.
3. Should "closed" threads stay searchable in the verifier's queue filter? **Recommended:** yes, with a "include closed" toggle, default off.
4. For the cleanup job: cron or pm2-cron or a Next.js scheduled route? **Recommended:** a simple `tsx` script invoked via cron from the server, since the rest of the deploy is cron-driven.

If the implementer hits anything else not covered, ping the spec author before guessing.
