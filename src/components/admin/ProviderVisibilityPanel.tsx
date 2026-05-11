"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@/lib/with-base";

export function ProviderVisibilityPanel({
  providerId,
  initialPublished,
  initialAdminSuspended
}: {
  providerId: string;
  initialPublished: boolean;
  initialAdminSuspended: boolean;
}) {
  const router = useRouter();
  const [published, setPublished] = useState(initialPublished);
  const [adminSuspended, setAdminSuspended] = useState(initialAdminSuspended);
  const [busy, setBusy] = useState<"publish" | "suspend" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(payload: Record<string, boolean>, key: "publish" | "suspend") {
    setError(null);
    setBusy(key);
    try {
      const res = await fetch(withBase(`/api/admin/providers/${providerId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      if ("published" in payload) setPublished(payload.published as boolean);
      if ("adminSuspended" in payload) setAdminSuspended(payload.adminSuspended as boolean);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(null);
    }
  }

  const visible = published && !adminSuspended;

  return (
    <div style={{ display: "grid", gap: 16, fontSize: 13 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 8,
          background: visible ? "rgba(16, 185, 129, 0.08)" : "rgba(220, 38, 38, 0.08)",
          border: `1px solid ${visible ? "rgba(16, 185, 129, 0.25)" : "rgba(220, 38, 38, 0.25)"}`
        }}
      >
        <span style={{ fontWeight: 500 }}>
          {visible ? "Visible on public registry" : "Hidden from public registry"}
        </span>
        <span
          style={{
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 11,
            color: "var(--text-3)"
          }}
        >
          published={String(published)} · adminSuspended={String(adminSuspended)}
        </span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}
        >
          Publish on registry
        </span>
        <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0 }}>
          Toggle visibility on /providers and the public catalogue. Routine hide/show.
        </p>
        <button
          type="button"
          className={published ? "btn btn-secondary" : "btn btn-primary"}
          disabled={busy !== null}
          onClick={() => patch({ published: !published }, "publish")}
          style={{ justifySelf: "start" }}
        >
          {busy === "publish"
            ? "Saving…"
            : published
              ? "Unpublish"
              : "Publish"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}
        >
          Admin suspension
        </span>
        <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0 }}>
          Hard hide for compliance / enforcement. Setting Status to{" "}
          <strong>Suspended</strong> above also flips this on.
        </p>
        <button
          type="button"
          className={adminSuspended ? "btn btn-primary" : "btn btn-secondary"}
          disabled={busy !== null}
          onClick={() => patch({ adminSuspended: !adminSuspended }, "suspend")}
          style={{ justifySelf: "start" }}
        >
          {busy === "suspend"
            ? "Saving…"
            : adminSuspended
              ? "Lift suspension"
              : "Suspend"}
        </button>
      </div>

      {error ? <p style={{ color: "#d33", fontSize: 12 }}>{error}</p> : null}
    </div>
  );
}
