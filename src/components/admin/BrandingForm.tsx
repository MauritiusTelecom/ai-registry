"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@/lib/with-base";

type Initial = {
  registryName: string;
  logoUrl: string | null;
  copyrightLine: string;
  buildLine: string;
};

type Defaults = {
  registryName: string;
  copyrightLine: string;
  buildLine: string;
};

const labelStyle: React.CSSProperties = {
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: 10.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--text-3)"
};

const helpStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-3)"
};

export function BrandingForm({ initial, defaults }: { initial: Initial; defaults: Defaults }) {
  const router = useRouter();

  const [registryName, setRegistryName] = useState(initial.registryName);
  const [copyrightLine, setCopyrightLine] = useState(initial.copyrightLine);
  const [buildLine, setBuildLine] = useState(initial.buildLine);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);

  const [savingText, setSavingText] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSaveText(event: React.FormEvent) {
    event.preventDefault();
    setSavingText(true);
    setMessage(null);
    try {
      const res = await fetch(withBase("/api/admin/branding"), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ registryName, copyrightLine, buildLine })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingText(false);
    }
  }

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(withBase("/api/admin/branding/logo"), {
        method: "POST",
        body: fd
      });
      const body = (await res.json().catch(() => ({}))) as { logoUrl?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (body.logoUrl) setLogoUrl(body.logoUrl);
      setMessage({ kind: "ok", text: "Logo uploaded." });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onClearLogo() {
    if (!confirm("Remove the custom logo and fall back to the default mark?")) return;
    setClearing(true);
    setMessage(null);
    try {
      const res = await fetch(withBase("/api/admin/branding/logo"), { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setLogoUrl(null);
      setMessage({ kind: "ok", text: "Logo cleared." });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 640 }}>
      <section className="p-card" style={{ padding: "22px 24px", borderRadius: 12 }}>
        <h2 className="p-card-title" style={{ marginBottom: 4 }}>Logo</h2>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0, marginBottom: 16 }}>
          PNG, JPEG, SVG or WebP, up to 1 MB. Replaces the default gradient mark in the top
          navigation, the portal sidebar, and the footer brand block.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: logoUrl ? "var(--bg)" : "var(--grad-accent)",
              boxShadow: logoUrl ? "none" : "0 0 10px rgba(var(--primary-rgb), 0.35)",
              overflow: "hidden"
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={withBase(logoUrl)}
                alt="Current logo"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            ) : null}
          </div>
          <div style={{ ...helpStyle, fontSize: 13 }}>
            {logoUrl ? <code>{logoUrl}</code> : <em>Default mark (no custom logo set).</em>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label className="btn btn-primary" style={{ cursor: uploading ? "wait" : "pointer" }}>
            {uploading ? "Uploading…" : "Upload logo"}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              style={{ display: "none" }}
              onChange={onUpload}
              disabled={uploading}
            />
          </label>
          {logoUrl ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClearLogo}
              disabled={clearing}
            >
              {clearing ? "Removing…" : "Remove logo"}
            </button>
          ) : null}
        </div>
      </section>

      <form
        onSubmit={onSaveText}
        className="p-card"
        style={{ padding: "22px 24px", borderRadius: 12, display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div>
          <h2 className="p-card-title" style={{ marginBottom: 4 }}>Text</h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0, marginBottom: 4 }}>
            Leave a field empty to fall back to the deployment default.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="b-registry-name" style={labelStyle}>Registry name</label>
          <input
            id="b-registry-name"
            type="text"
            className="auth-input"
            value={registryName}
            onChange={(e) => setRegistryName(e.target.value)}
            placeholder={defaults.registryName}
          />
          <span style={helpStyle}>Default: <code>{defaults.registryName}</code></span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="b-copyright" style={labelStyle}>Copyright line</label>
          <input
            id="b-copyright"
            type="text"
            className="auth-input"
            value={copyrightLine}
            onChange={(e) => setCopyrightLine(e.target.value)}
            placeholder={defaults.copyrightLine}
          />
          <span style={helpStyle}>Default: <code>{defaults.copyrightLine}</code></span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="b-build" style={labelStyle}>Build / timezone line</label>
          <input
            id="b-build"
            type="text"
            className="auth-input"
            value={buildLine}
            onChange={(e) => setBuildLine(e.target.value)}
            placeholder={defaults.buildLine}
          />
          <span style={helpStyle}>Default: <code>{defaults.buildLine}</code></span>
        </div>

        {message ? (
          <div
            role={message.kind === "error" ? "alert" : "status"}
            style={{
              fontSize: 13,
              color: message.kind === "error" ? "var(--danger, #f87171)" : "var(--text-2)"
            }}
          >
            {message.text}
          </div>
        ) : null}

        <div>
          <button type="submit" className="btn btn-primary" disabled={savingText}>
            {savingText ? "Saving…" : "Save text"}
          </button>
        </div>
      </form>
    </div>
  );
}
