"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

type Initial = {
  registryName: string;
  logoUrl: string | null;
  copyrightLine: string;
  buildLine: string;
  heroEyebrowText: string;
  heroEyebrowIconUrl: string | null;
  operatorName: string;
  operatorContactEmail: string;
  operatorOfficeName: string;
  operatorOfficeAddress: string;
  operatorContactHours: string;
  jurisdictionDisplayName: string;
  privacyDataProtectionAct: string;
  openSourceRepoUrl: string;
};

type Defaults = {
  registryName: string;
  copyrightLine: string;
  buildLine: string;
  heroEyebrowText: string;
  operatorName: string;
  operatorContactEmail: string;
  operatorOfficeName: string;
  operatorOfficeAddress: string;
  operatorContactHours: string;
  jurisdictionDisplayName: string;
  privacyDataProtectionAct: string;
  openSourceRepoUrl: string;
};

type UploadSlot = "logo" | "hero";

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
  const [heroEyebrowText, setHeroEyebrowText] = useState(initial.heroEyebrowText);
  const [operatorName, setOperatorName] = useState(initial.operatorName);
  const [operatorContactEmail, setOperatorContactEmail] = useState(initial.operatorContactEmail);
  const [operatorOfficeName, setOperatorOfficeName] = useState(initial.operatorOfficeName);
  const [operatorOfficeAddress, setOperatorOfficeAddress] = useState(initial.operatorOfficeAddress);
  const [operatorContactHours, setOperatorContactHours] = useState(initial.operatorContactHours);
  const [jurisdictionDisplayName, setJurisdictionDisplayName] = useState(
    initial.jurisdictionDisplayName
  );
  const [privacyDataProtectionAct, setPrivacyDataProtectionAct] = useState(
    initial.privacyDataProtectionAct
  );
  const [openSourceRepoUrl, setOpenSourceRepoUrl] = useState(initial.openSourceRepoUrl);

  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [heroIconUrl, setHeroIconUrl] = useState<string | null>(initial.heroEyebrowIconUrl);

  const [savingText, setSavingText] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function onSaveText(event: React.FormEvent) {
    event.preventDefault();
    setSavingText(true);
    setMessage(null);
    try {
      const res = await registryFetch(withBase("/api/admin/branding"), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          registryName,
          copyrightLine,
          buildLine,
          heroEyebrowText,
          operatorName,
          operatorContactEmail,
          operatorOfficeName,
          operatorOfficeAddress,
          operatorContactHours,
          jurisdictionDisplayName,
          privacyDataProtectionAct,
          openSourceRepoUrl
        })
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 640 }}>
      <ImageSlot
        title="Logo"
        description="PNG, JPEG, SVG or WebP, up to 1 MB. Replaces the default gradient mark in the top navigation, the portal sidebar, and the footer brand block."
        slot="logo"
        url={logoUrl}
        onUploaded={(url) => setLogoUrl(url)}
        onCleared={() => setLogoUrl(null)}
        confirmRemove="Remove the custom logo and fall back to the default mark?"
        onMessage={setMessage}
        previewBackground={logoUrl ? "var(--bg)" : "var(--grad-accent)"}
        previewShadow={logoUrl ? "none" : "0 0 10px rgba(var(--primary-rgb), 0.35)"}
      />

      <ImageSlot
        title="Hero chip icon"
        description="Tiny image rendered to the left of the hero chip text on the homepage. Defaults to the Mauritius flag SVG when unset."
        slot="hero"
        url={heroIconUrl}
        onUploaded={(url) => setHeroIconUrl(url)}
        onCleared={() => setHeroIconUrl(null)}
        confirmRemove="Remove the custom hero icon and fall back to the Mauritius flag?"
        onMessage={setMessage}
      />

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

        <TextField
          id="b-registry-name"
          label="Registry name"
          value={registryName}
          onChange={setRegistryName}
          placeholder={defaults.registryName}
          help={defaults.registryName}
        />

        <TextField
          id="b-hero-eyebrow"
          label="Hero chip text"
          value={heroEyebrowText}
          onChange={setHeroEyebrowText}
          placeholder={defaults.heroEyebrowText}
          help={defaults.heroEyebrowText}
        />

        <TextField
          id="b-copyright"
          label="Copyright line"
          value={copyrightLine}
          onChange={setCopyrightLine}
          placeholder={defaults.copyrightLine}
          help={defaults.copyrightLine}
        />

        <TextField
          id="b-build"
          label="Build / timezone line"
          value={buildLine}
          onChange={setBuildLine}
          placeholder={defaults.buildLine}
          help={defaults.buildLine}
        />

        <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 18, marginTop: 4 }}>
          <h3 className="p-card-title" style={{ fontSize: 14, marginBottom: 12 }}>
            Operator &amp; contact
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0, marginBottom: 14 }}>
            Shown on /contact, legal pages, and other public copy that references the operator.
          </p>
        </div>

        <TextField
          id="b-operator-name"
          label="Operator name"
          value={operatorName}
          onChange={setOperatorName}
          placeholder={defaults.operatorName}
          help={defaults.operatorName}
        />

        <TextField
          id="b-operator-email"
          label="Contact email"
          value={operatorContactEmail}
          onChange={setOperatorContactEmail}
          placeholder={defaults.operatorContactEmail}
          help={defaults.operatorContactEmail}
        />

        <TextField
          id="b-operator-office-name"
          label="Office name (line 1)"
          value={operatorOfficeName}
          onChange={setOperatorOfficeName}
          placeholder={defaults.operatorOfficeName}
          help={defaults.operatorOfficeName}
        />

        <TextAreaField
          id="b-operator-office-address"
          label="Office address (lines 2+)"
          value={operatorOfficeAddress}
          onChange={setOperatorOfficeAddress}
          placeholder={defaults.operatorOfficeAddress}
          help={defaults.operatorOfficeAddress}
        />

        <TextField
          id="b-operator-hours"
          label="Contact hours"
          value={operatorContactHours}
          onChange={setOperatorContactHours}
          placeholder={defaults.operatorContactHours}
          help={defaults.operatorContactHours}
        />

        <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 18, marginTop: 4 }}>
          <h3 className="p-card-title" style={{ fontSize: 14, marginBottom: 12 }}>
            Marketing &amp; jurisdiction
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0, marginBottom: 14 }}>
            Home hero, /registry and /providers headlines, privacy law name, and repo links.
          </p>
        </div>

        <TextField
          id="b-jurisdiction-display"
          label="Jurisdiction display name"
          value={jurisdictionDisplayName}
          onChange={setJurisdictionDisplayName}
          placeholder={defaults.jurisdictionDisplayName}
          help={defaults.jurisdictionDisplayName}
        />

        <TextField
          id="b-privacy-act"
          label="Privacy: data protection act"
          value={privacyDataProtectionAct}
          onChange={setPrivacyDataProtectionAct}
          placeholder={defaults.privacyDataProtectionAct}
          help={defaults.privacyDataProtectionAct}
        />

        <TextField
          id="b-repo-url"
          label="Open-source repository URL"
          value={openSourceRepoUrl}
          onChange={setOpenSourceRepoUrl}
          placeholder={defaults.openSourceRepoUrl}
          help={defaults.openSourceRepoUrl}
        />

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

function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  help
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  help: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <textarea
        id={id}
        className="auth-input"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ resize: "vertical", minHeight: 72 }}
      />
      <span style={helpStyle}>Default: <code>{help}</code></span>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  help
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  help: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input
        id={id}
        type="text"
        className="auth-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <span style={helpStyle}>Default: <code>{help}</code></span>
    </div>
  );
}

function ImageSlot({
  title,
  description,
  slot,
  url,
  onUploaded,
  onCleared,
  confirmRemove,
  onMessage,
  previewBackground,
  previewShadow
}: {
  title: string;
  description: string;
  slot: UploadSlot;
  url: string | null;
  onUploaded: (publicPath: string) => void;
  onCleared: () => void;
  confirmRemove: string;
  onMessage: (m: { kind: "ok" | "error"; text: string }) => void;
  previewBackground?: string;
  previewShadow?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await registryFetch(withBase(`/api/admin/branding/logo?slot=${slot}`), {
        method: "POST",
        body: fd
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (body.url) onUploaded(body.url);
      onMessage({ kind: "ok", text: `${title} uploaded.` });
      router.refresh();
    } catch (e) {
      onMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onClear() {
    if (!confirm(confirmRemove)) return;
    setClearing(true);
    try {
      const res = await registryFetch(withBase(`/api/admin/branding/logo?slot=${slot}`), {
        method: "DELETE"
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onCleared();
      onMessage({ kind: "ok", text: `${title} cleared.` });
      router.refresh();
    } catch (e) {
      onMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setClearing(false);
    }
  }

  return (
    <section className="p-card" style={{ padding: "22px 24px", borderRadius: 12 }}>
      <h2 className="p-card-title" style={{ marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0, marginBottom: 16 }}>
        {description}
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
            background: url ? "var(--bg)" : previewBackground ?? "var(--bg)",
            boxShadow: url ? "none" : previewShadow ?? "none",
            overflow: "hidden"
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={withBase(url)}
              alt={`Current ${title.toLowerCase()}`}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          ) : null}
        </div>
        <div style={{ ...helpStyle, fontSize: 13 }}>
          {url ? <code>{url}</code> : <em>Default (no custom {title.toLowerCase()} set).</em>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label className="btn btn-primary" style={{ cursor: uploading ? "wait" : "pointer" }}>
          {uploading ? "Uploading…" : `Upload ${title.toLowerCase()}`}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
        {url ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClear}
            disabled={clearing}
          >
            {clearing ? "Removing…" : `Remove ${title.toLowerCase()}`}
          </button>
        ) : null}
      </div>
    </section>
  );
}
