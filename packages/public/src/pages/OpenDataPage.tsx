import Link from "next/link";
import { getBranding } from "@airegistry/core/branding";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Open data");
}

export default async function OpenDataPage() {
  const { portalDomain, openSourceRepoUrl } = await getBranding();
  const licenseUrl = `${openSourceRepoUrl.replace(/\/$/, "")}/blob/main/LICENSE`;
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
      title="Open data"
      subtitle="Registry metadata is public by design. Browse, export, mirror or federate - with attribution."
    >
      <DocPanel title="What is open">
        <p>
          Every public listing, provider profile, governance signal and AIR-ID is available
          through the discovery API without authentication. The audit log is append-only and
          queryable. Nothing in the public layer is paywalled.
        </p>
      </DocPanel>

      <DocPanel title="AIR-IDs are permanent">
        <p>
          Once issued, an AIR-ID is a stable identifier. Metadata versions may change, but the
          identifier itself does not. Tombstones explain removals; they do not erase history.
        </p>
      </DocPanel>

      <DocPanel title="Immutable audit trail">
        <p>
          Governance actions - reviews, appeals, lifecycle transitions - are written to an
          append-only audit log. Entries are immutable. They survive provider rebrands, endpoint
          changes and version bumps. If a resource is removed, the AIR-ID resolves to a
          tombstone explaining why - never silently disappears.
        </p>
      </DocPanel>

      <DocPanel title="Licensing and use">
        <p>
          Registry metadata is open. Reuse, mirror, federate or redistribute it freely;
          attribute back to the operating instance (e.g. {portalDomain}) when republishing.
          The reference implementation is licensed{" "}
          <a
            href={licenseUrl}
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
          Read the{" "}
          <Link href="/docs" style={{ color: "var(--text-2)" }}>
            technical documentation
          </Link>{" "}
          for API endpoints and export formats, or browse the{" "}
          <Link href="/audit-log" style={{ color: "var(--text-2)" }}>
            public audit log
          </Link>
          .
        </p>
      </DocPanel>
    </DocPage>
  );
}
