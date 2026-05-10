import Link from "next/link";
import { DocPage, DocPanel } from "@/components/public/sections/DocPage";

export const metadata = { title: "Open data · Mauritius AI Registry" };

export default function OpenDataPage() {
  return (
    <DocPage
      crumb={
        <>
          <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Home
          </Link>{" "}
          · Open data
        </>
      }
      title={
        <>
          The registry is{" "}
          <span className="gradient-text">a public dataset</span>.
        </>
      }
      subtitle="Every public listing — including its provider, governance signals, sovereignty claims and endpoints — is exposed through a stable JSON API and can be read without authentication."
    >
      <DocPanel title="Public discovery endpoints">
        <p>All endpoints return JSON over HTTPS. Authentication is only required for write operations.</p>
        <ul style={{ paddingLeft: 22, marginTop: 14, display: "grid", gap: 10 }}>
          <li>
            <code>GET /apiV1/resources</code> — paginated list, filterable by{" "}
            <code>type</code>, <code>jurisdiction</code>, <code>sovereigntyBasis</code>,
            <code>sovereigntyStatus</code>, <code>official</code>,{" "}
            <code>providerVerified</code>, <code>q</code>.
          </li>
          <li>
            <code>GET /apiV1/resources/{`{airId}`}</code> — single canonical resource
            document.
          </li>
          <li>
            <code>GET /apiV1/resolve?id=air://...</code> — dereference an AIR-ID. Returns
            the resource document or a tombstone for removed resources.
          </li>
          <li>
            <code>GET /.well-known/ai-registry</code> — capability advertisement: identity
            domain, supported types, rubric URL, schema version, discovery endpoints.
          </li>
        </ul>
      </DocPanel>

      <DocPanel title="Stable identifiers">
        <p>
          AIR-IDs (<code>air://&lt;identity_domain&gt;/&lt;type&gt;/&lt;provider&gt;/&lt;resource&gt;</code>)
          are immutable. They survive provider rebrands, endpoint changes and version
          bumps. If a resource is removed, the AIR-ID resolves to a tombstone explaining
          why — never silently disappears.
        </p>
      </DocPanel>

      <DocPanel title="Licensing and use">
        <p>
          Registry metadata is open. Reuse, mirror, federate or redistribute it freely;
          attribute back to the operating instance (e.g. airegistry.mu) when republishing.
          The reference implementation is licensed{" "}
          <a
            href="https://github.com/MauritiusTelecom/ai-registry/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-2)" }}
          >
            Apache-2.0
          </a>
          .
        </p>
      </DocPanel>

      <DocPanel title="See also">
        <p>
          Full normative API contract:{" "}
          <Link href="/docs" style={{ color: "var(--text-2)" }}>
            AIR-SPEC 0.4 §6 — Discovery APIs
          </Link>
          .
        </p>
      </DocPanel>
    </DocPage>
  );
}
