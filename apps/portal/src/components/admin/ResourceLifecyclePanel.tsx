"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@airegistry/sdk";

type Action =
  | "approve"
  | "reject"
  | "suspend"
  | "restore"
  | "deprecate"
  | "remove";

/**
 * Admin · Resource lifecycle panel. Rendered as a sidebar on the resource
 * edit page. Mirrors the inline action-dialog in `ResourcesAdmin.tsx` but
 * lives on the edit page so admins can change a resource's lifecycle status
 * (and trigger AIR-ID minting on approve) without leaving the edit form.
 *
 * Allowed transitions (from /api/admin/resources/:id/transition):
 *   draft / submitted / in_review / needs_update → approve, reject, restore, remove
 *   listed                                       → reject, suspend, deprecate, remove
 *   suspended / deprecated / removed             → restore, remove
 *
 * `restore` is the admin "revert to active" escape hatch — it accepts any
 * non-listed status (including the `removed` tombstone) and brings the
 * resource back to `listed`, minting the AIR-ID if it never had one.
 *
 * Each call POSTs `{ action, reason }`. A reason is required (min 4 chars).
 * The endpoint writes one TrustSignal + one audit row and, on approve or
 * restore-from-cold, mints the AIR-ID.
 */

const ALLOWED_FROM: Record<string, Action[]> = {
  draft: ["approve", "restore", "remove"],
  submitted: ["approve", "reject", "restore", "remove"],
  in_review: ["approve", "reject", "restore", "remove"],
  needs_update: ["approve", "reject", "restore", "remove"],
  listed: ["reject", "suspend", "deprecate", "remove"],
  suspended: ["restore", "remove"],
  deprecated: ["restore", "remove"],
  removed: ["restore"]
};

const ACTION_TONE: Record<Action, string> = {
  approve: "#10b981",
  reject: "#f59e0b",
  suspend: "#ef4444",
  restore: "#10b981",
  deprecate: "#a855f7",
  remove: "#ef4444"
};

const ACTION_HINT: Record<Action, string> = {
  approve: "Marks the resource as `listed` and mints the AIR-ID.",
  reject: "Sends the resource back to `needs_update`.",
  suspend: "Hides the resource from the public registry while keeping it in the catalogue.",
  restore: "Reverts the resource to `listed` from any status (including suspended, deprecated, removed, or a pre-approval state). Mints the AIR-ID if one was never issued.",
  deprecate: "Marks the resource as `deprecated` while keeping the public detail visible.",
  remove: "Tombstones the resource. The public detail returns 410 Gone but the AIR-ID stays reserved."
};

export function ResourceLifecyclePanel({
  resourceId,
  currentLifecycleCode,
  currentLifecycleName
}: {
  resourceId: string;
  currentLifecycleCode: string;
  currentLifecycleName: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  // Notify the provider when the lifecycle moves. Default ON.
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const allowed = ALLOWED_FROM[currentLifecycleCode] ?? [];

  async function submit() {
    if (!action) return;
    setError(null);
    setOkMsg(null);
    if (reason.trim().length < 4) {
      setError("Reason is required (min 4 chars)");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        withBase(`/api/admin/resources/${resourceId}/transition`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason: reason.trim(), notifyByEmail })
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      setOkMsg(`Lifecycle moved via "${action}".`);
      setAction(null);
      setReason("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
      <div>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}
        >
          Current status
        </span>
        <div style={{ marginTop: 4, fontSize: 14 }}>
          <strong>{currentLifecycleName}</strong>{" "}
          <code style={{ color: "var(--text-3)", fontSize: 12 }}>
            ({currentLifecycleCode})
          </code>
        </div>
      </div>

      {allowed.length === 0 ? (
        <p style={{ color: "var(--text-3)", margin: 0 }}>
          No lifecycle transitions available from this status.
        </p>
      ) : (
        <>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-3)",
              letterSpacing: "0.08em",
              textTransform: "uppercase"
            }}
          >
            Available actions
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allowed.map((a) => (
              <button
                key={a}
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: "6px 10px",
                  fontSize: 12,
                  borderColor: action === a ? ACTION_TONE[a] : undefined,
                  color: action === a ? ACTION_TONE[a] : undefined
                }}
                onClick={() => {
                  setAction(a);
                  setError(null);
                  setOkMsg(null);
                }}
                disabled={busy}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>

          {action ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                padding: 12,
                marginTop: 4,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--panel)"
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                {ACTION_HINT[action]}
              </div>
              <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-3)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase"
                  }}
                >
                  Reason (required, min 4 chars)
                </span>
                <textarea
                  className="auth-input"
                  style={{ minHeight: 70, fontFamily: "inherit" }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="What changed and why?"
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: notifyByEmail ? "var(--text-2)" : "var(--text-3)",
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={notifyByEmail}
                  onChange={(e) => setNotifyByEmail(e.target.checked)}
                  style={{ accentColor: "var(--primary)" }}
                />
                <span>Email the provider's contacts about this transition</span>
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setAction(null);
                    setReason("");
                    setError(null);
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={submit}
                  disabled={busy}
                  style={{
                    background: ACTION_TONE[action],
                    borderColor: ACTION_TONE[action]
                  }}
                >
                  {busy
                    ? "Working…"
                    : `${action.charAt(0).toUpperCase() + action.slice(1)}`}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <div style={{ color: "#d33", fontSize: 12 }} role="alert">
          {error}
        </div>
      ) : null}
      {okMsg ? (
        <div style={{ color: "#10b981", fontSize: 12 }} role="status">
          {okMsg}
        </div>
      ) : null}
    </div>
  );
}
