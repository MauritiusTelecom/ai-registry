# Spec - Provider review thread (simple ticketing on a review)

**Status:** Draft for implementation
**Author:** AI Registry team
**Date:** 2026-05-21
**Estimated effort:** 5-7 engineering days, 1 dev

---

## 1. Goal

When a verifier rejects (or otherwise touches) a submission, the provider must be able to **read why**, **reply with more evidence or a question**, and the verifier must be able to **respond in a thread**. Today the provider sees only a status change, which is a dead-end.

The manager's framing: **a simple ticketing module - problem submission and a thread.**

This spec covers the minimum viable implementation. Out-of-scope items are listed in section 11.

---

## 2. User stories

1. **As a verifier**, when I reject a submission I can write a reason that the provider sees in their portal.
2. **As a provider**, when my submission is rejected I see the reason and a "Reply" box where I can attach additional evidence or ask a clarifying question.
3. **As a verifier**, I receive a notification when a provider replies. I open the thread, read the reply, respond in the same thread, and optionally change the review status.
4. **As either party**, I can see the full chronological history of the conversation on this review.
5. **As an admin**, I can read any thread; I can also join a thread that started between the verifier and provider.

---

## 3. Where it lives in the data model

A new `ReviewThread` aggregate, attached to an existing `Review`. Each `Review` has at most one open `ReviewThread`.

### 3.1 Prisma schema additions

Add to `packages/core/prisma/schema.prisma` after the existing `Review` model:

```prisma
model ReviewThread {
  id          String   @id @default(uuid())
  reviewId   String   @unique
  review      Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  statusId   String                         // open | awaiting_provider | awaiting_verifier | resolved | closed
  status     ReviewThreadStatusType @relation(fields: [statusId], references: [id])

  openedById  String
  openedBy    User     @relation("ReviewThreadOpenedBy", fields: [openedById], references: [id])

  resolvedById String?
  resolvedBy   User?   @relation("ReviewThreadResolvedBy", fields: [resolvedById], references: [id])
  resolvedAt   DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  messages    ReviewThreadMessage[]

  @@schema("registry")
}

model ReviewThreadStatusType {
  id          String   @id @default(uuid())
  code        String   @unique           // open, awaiting_provider, awaiting_verifier, resolved, closed
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

  authorRole   String                      // verifier | provider | admin (denormalised for display)

  body         String   @db.Text           // markdown-lite (newlines preserved, no HTML)
  attachments  Json?                       // [{filename, sizeBytes, contentType, storageKey}]
                                            // for v1 we store as JSON; promote to a table later

  systemEvent  String?                     // null for normal messages; "status_changed", "review_decision", etc.
                                            // used to render system rows ("Status set to awaiting_provider by Anjini")

  createdAt    DateTime @default(now())

  @@index([threadId, createdAt])
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

Seed these in `packages/core/prisma/seed.ts` and `db:bootstrap` runs.

### 3.3 Migration

Use a Prisma migration (not `db:push`) since this adds three new tables. Name it `2026-05-XX-review-thread`.

---

## 4. API endpoints

All under `apps/portal/src/app/api/portal/reviews/[reviewId]/thread/`. Auth required. Permissions enforced server-side.

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/portal/reviews/[reviewId]/thread` | verifier, admin, provider-on-that-resource | Returns the thread + all messages |
| POST | `/api/portal/reviews/[reviewId]/thread` | verifier, admin | Open a new thread; body: `{ message: string, status?: "open" \| "awaiting_provider" }` |
| POST | `/api/portal/reviews/[reviewId]/thread/messages` | any party on the thread | Append a message; body: `{ body: string, attachments?: [...] }`. Server flips status: provider reply → `awaiting_verifier`; verifier reply → `awaiting_provider` |
| PATCH | `/api/portal/reviews/[reviewId]/thread/status` | verifier, admin | Manually set status; body: `{ statusCode: "resolved" \| "closed" }` |
| POST | `/api/portal/reviews/[reviewId]/thread/messages/[messageId]/attachments` | message author within 5 min of creation | Attach a file (uses the evidence-upload storage from spec X - see section 9) |

Response shape for GET:

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
        "body": "Attached the new cert.",
        "attachments": [
          { "filename": "iso27001-2026.pdf", "sizeBytes": 412381, "contentType": "application/pdf", "storageKey": "..." }
        ],
        "systemEvent": null,
        "createdAt": "2026-05-21T09:14:00Z"
      }
    ]
  }
}
```

---

## 5. UI flows

### 5.1 Verifier / admin side - `/verifier/queue/[reviewId]`

On the existing review detail page, add a new "Conversation" tab next to "Checklist" / "History".

- If no thread exists yet: empty state with a textbox and "Send to provider" button. Submitting calls `POST /thread`.
- If a thread exists: chronological list of messages (oldest first), with a reply composer at the bottom.
- Status pill at the top of the tab: `open / awaiting_provider / awaiting_verifier / resolved / closed`.
- "Mark resolved" and "Close" buttons in the tab header (verifier and admin only).
- File attachment button in the composer; pulls in evidence upload UI (section 9).

### 5.2 Provider side - `/provider/reviews/[reviewId]`

The existing reviews grid links to a detail page. Add a "Conversation" panel:

- If thread `status` is `awaiting_provider`: highlight the panel; show "Reply" composer prominently.
- If thread `status` is `awaiting_verifier`: show messages, no composer (or composer disabled with "Waiting on verifier" hint).
- If thread `status` is `resolved` or `closed`: read-only.
- Attachments inline using the evidence-upload component.

### 5.3 System messages

Whenever the underlying review changes status (verifier marks as `approved`, `needs_update`, `rejected`), an automatic `systemEvent` message is appended to the thread so the timeline is complete. Example body: "Review status changed to needs_update by Anjini R.". Render in muted style, no avatar.

---

## 6. Permissions

| Action | verifier | admin | provider-on-that-resource | other |
|---|---|---|---|---|
| GET thread | ✓ | ✓ | ✓ | ✗ |
| POST new thread | ✓ | ✓ | ✗ (provider cannot open a thread; they can only reply once verifier opens one) | ✗ |
| POST message | ✓ | ✓ | ✓ | ✗ |
| PATCH status | ✓ | ✓ | ✗ | ✗ |
| Attach file | message author only, within 5 min | ✓ | ✓ | ✗ |

Server-side check: the requesting user must either be the assigned verifier on the review, an admin, or the user whose provider owns the resource being reviewed. Reuse the same authorisation helpers used by the existing review endpoints in `packages/core/src/lib/portal/...`.

---

## 7. Notifications

Email + in-app, mirroring the patterns already in `packages/core/src/lib/email/`:

| Event | Recipient | Template |
|---|---|---|
| Verifier opens a new thread on a review | Provider (the resource's owning provider users) | `EMAIL_REVIEW_THREAD_OPENED_*` |
| Provider replies | Verifier (assigned), admin | `EMAIL_REVIEW_THREAD_PROVIDER_REPLY_*` |
| Verifier replies | Provider | `EMAIL_REVIEW_THREAD_VERIFIER_REPLY_*` |
| Status set to `resolved` | Both parties | `EMAIL_REVIEW_THREAD_RESOLVED_*` |

Follow the existing pattern in `apps/portal/src/lib/portal/notifications/...` for in-app notifications (badge in header, entry in `/provider/notifications` and the verifier equivalent).

Email templates accept the standard placeholders + `{threadUrl}`, `{reviewTitle}`, `{authorName}`, `{excerpt}` (first 200 chars of the latest message). Add `*_SUBJECT` and `*_BODY` env-var defaults in `packages/core/src/lib/email/templates.ts` per the existing pattern.

---

## 8. Edge cases and rules

- **Empty message:** reject with 400. Both `body` and `attachments` cannot both be empty.
- **Message length:** soft limit 10 000 chars. Reject longer.
- **Attachment count per message:** max 5.
- **Single attachment size:** max 25 MB (matches evidence-upload limit, section 9).
- **Allowed content types:** `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `application/zip`. Reject everything else.
- **Editing / deleting messages:** **NOT allowed in v1.** Once a message is posted it is immutable. Provides audit-trail integrity, which the registry's trust claim depends on.
- **Concurrent edits to status:** last-write-wins is acceptable for v1. Show a toast if the status changed since the page was loaded.
- **Resource deletion:** when a resource is hard-deleted (rare), cascade deletes the review and thread. When a resource is soft-deleted, thread stays readable in read-only mode.
- **Thread reopening:** if status is `resolved` or `closed`, allow verifier or admin to reopen via `PATCH /thread/status` with `statusCode: "open"`. Provider cannot reopen.

---

## 9. Dependency on evidence-upload spec

The attachments mechanism reuses the file storage layer being built for [`evidence-upload.md`](./evidence-upload.md) (separate spec). If that spec is not yet implemented, ship the thread with **link-only attachments** for v1 - the provider/verifier pastes a URL. When the evidence-upload spec ships, the composer gets a file-picker that produces the same `{ filename, sizeBytes, contentType, storageKey }` shape and writes the file into the provider's evidence collection on that resource.

If we have to ship one before the other, **build evidence-upload first** so threads have real attachments from day one. They make no sense as a "talk only" channel.

---

## 10. Migration order for an existing review

For any review that is already in `needs_update` or `rejected` state when this ships, **do not auto-create a thread**. A thread only appears when someone clicks "Send to provider" in the new UI. Existing rejections stay as-is; verifiers can open a thread retroactively if they want.

---

## 11. Out of scope (do not build in v1)

The following sound useful but inflate the spec. Do not add until v1 has shipped and we have feedback:

- Threaded replies (replies-to-replies). Single flat timeline only.
- Reactions / emoji.
- Read receipts / "seen by".
- @mentions of other users (verifiers can be assigned by reassigning the review itself).
- Typing indicators / websocket realtime. Polling refresh on the page is fine; new-message badges via the existing notification system.
- Markdown rendering. Plain text + URL auto-link only.
- Thread search across the entire registry.
- Bulk reply / canned responses.
- Attaching files larger than 25 MB.

---

## 12. Acceptance criteria

The feature is done when:

1. ✅ A verifier on `/verifier/queue/[reviewId]` can open a new thread, write a message, and submit. The provider receives an email + in-app notification.
2. ✅ The provider on `/provider/reviews/[reviewId]` sees the message, can attach a PDF (or paste a URL if evidence-upload is not yet shipped), writes a reply, and submits. The verifier receives an email + in-app notification.
3. ✅ Either party can read the full thread in chronological order, including system events for review-status changes.
4. ✅ The verifier can mark the thread resolved. Both parties get an email.
5. ✅ Permissions are enforced server-side (a different provider gets 403 trying to read the thread).
6. ✅ All messages are immutable (no edit/delete endpoints exist).
7. ✅ The new tables migrate cleanly via `pnpm prisma:migrate` and seed cleanly via `pnpm db:seed`.
8. ✅ Manual QA via the QA single-inbox email redirect (`TEST_EMAIL_INBOX`) shows the four new email templates rendering with sample data.

---

## 13. Open questions for the implementer

1. Should the thread also be visible to **other users on the provider's account** (multi-user providers in scope after team-management ships) or only to the user who submitted the resource? - **Recommended:** all users on the provider account, scoped by the resource ownership.
2. When the review is reassigned to a different verifier mid-thread, does the new verifier automatically get the email on the next provider reply? - **Recommended:** yes; notifications follow the `Review.assignedToId` at the time of the event.
3. Should "closed" threads stay searchable in the verifier's queue filter? - **Recommended:** yes, with a "include closed" toggle, default off.

If the implementer hits anything else not covered, ping the spec author before shipping a guess.
