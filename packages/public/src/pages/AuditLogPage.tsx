import Link from "next/link";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Audit log");
}

export default function AuditLogPage() {
  return (
    <DocPage
      crumb={
        <>
          <Link href="/governance" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Governance
          </Link>{" "}
          · Audit log
        </>
      }
      title={
        <>
          Append-only.{" "}
          <span className="gradient-text">Public by default.</span>
        </>
      }
      subtitle="Every state-changing action against the registry is recorded. The audit trail is the operator’s public commitment to traceable, reversible governance."
    >
      <DocPanel title="What is recorded">
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>AIR-ID issuance when a resource is elevated past draft.</li>
          <li>
            Sovereignty review decisions (basis, status, reviewer notes, rubric version).
          </li>
          <li>Official-resource endorsements and revocations.</li>
          <li>Lifecycle transitions (listed, deprecated, removed).</li>
          <li>Provider verification decisions.</li>
          <li>Schema or configuration changes affecting public listings.</li>
        </ul>
      </DocPanel>

      <DocPanel title="Append-only by design">
        <p>
          Audit rows are never deleted or rewritten. Resources are soft-deleted via a{" "}
          <code>deletedAt</code> field, but the audit trail behind a removed resource
          stays intact and resolvable. Reviewer notes on sovereignty and
          official-resource decisions are public on the resource detail page.
        </p>
      </DocPanel>

      <DocPanel title="Public log">
        <p>
          A read-only public log of recent events will appear here. While the listing
          surface is being built out, the underlying audit data is already captured for
          every governance action. See{" "}
          <Link href="/docs" style={{ color: "var(--text-2)" }}>
            AIR-SPEC 0.4 §8
          </Link>{" "}
          for the normative form, and{" "}
          <Link href="/governance" style={{ color: "var(--text-2)" }}>
            governance
          </Link>{" "}
          for who decides what.
        </p>
      </DocPanel>
    </DocPage>
  );
}
