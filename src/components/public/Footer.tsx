import Link from "next/link";
import { ProviderPortalFooterLink } from "./ProviderPortalFooterLink";

// Bundle B footer (matches the home composition in app.jsx + sections.jsx).
// Six columns, brand block, then bottom row with build/operational tags.

type FooterLink = { label: string; href: string; external?: boolean };
type FooterProviderPortalItem = { kind: "provider-portal" };
type FooterColumnLink = FooterLink | FooterProviderPortalItem;

function isProviderPortalFooterItem(link: FooterColumnLink): link is FooterProviderPortalItem {
  return "kind" in link && link.kind === "provider-portal";
}

const REPO_URL = "https://github.com/MauritiusTelecom/ai-registry";

const PRODUCT_LINKS: FooterLink[] = [
  { label: "Registry", href: "/registry" },
  { label: "Providers", href: "/providers" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Governance", href: "/governance" },
  { label: "AIR-SPEC 0.4", href: "/docs" }
];

const RESOURCES_LINKS: FooterLink[] = [
  { label: "Documentation", href: "/docs" },
  { label: "Whitepaper", href: "/whitepaper" },
  { label: "Open data", href: "/open-data" },
  { label: "Reference impl", href: REPO_URL, external: true }
];

const PROVIDER_LINKS: FooterColumnLink[] = [
  { label: "Submit a resource", href: "/contact" },
  { kind: "provider-portal" },
  { label: "Sovereignty rubric", href: "/sovereignty-rubric" },
  { label: "Verification proofs", href: "/verification" },
  { label: "Pricing (free)", href: "/pricing" }
];

const GOVERNANCE_LINKS: FooterLink[] = [
  { label: "Charter", href: "/governance#charter" },
  { label: "Review board", href: "/governance#review-board" },
  { label: "Appeals", href: "/governance#appeals" }
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Terms of use", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Acceptable use", href: "/acceptable-use" },
  { label: "License (Apache-2.0)", href: `${REPO_URL}/blob/main/LICENSE`, external: true },
  { label: "Contact", href: "/contact" }
];

function FooterColumn({
  title,
  links,
  className
}: {
  title: string;
  links: FooterColumnLink[];
  className?: string;
}) {
  return (
    <div className={`footer-col${className ? ` ${className}` : ""}`}>
      <h5>{title}</h5>
      <ul>
        {links.map((link) =>
          isProviderPortalFooterItem(link) ? (
            <li key="provider-portal">
              <ProviderPortalFooterLink />
            </li>
          ) : (
            <li key={link.label}>
              {link.href.startsWith("/") ? (
                <Link href={link.href}>{link.label}</Link>
              ) : (
                <a
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                </a>
              )}
            </li>
          )
        )}
      </ul>
    </div>
  );
}

export function Footer({ registryName }: { registryName: string }) {
  return (
    <footer className="footer">
      <div className="footer-glow" />
      <div className="footer-grid">
        <div className="footer-col">
          <Link href="/" className="nav-logo" style={{ marginBottom: 16 }}>
            <span className="nav-logo-mark" />
            <span style={{ fontSize: 15 }}>{registryName}</span>
          </Link>
          <p className="footer-brand">
            Open-source infrastructure for sovereign AI discovery. The registry points; the
            provider operates; the hosting environment secures.
          </p>
          <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="tag" style={{ color: "#10b981" }}>
              <span className="status-dot" style={{ background: "#10b981" }} /> Operational
            </span>
            <span className="tag">v0.4 · MVP</span>
          </div>
        </div>

        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Resources" links={RESOURCES_LINKS} />
        <FooterColumn title="Providers" links={PROVIDER_LINKS} />
        <FooterColumn title="Governance" links={GOVERNANCE_LINKS} className="col-collapse" />
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>

      <div className="footer-bottom">
        <span>© 2026 Mauritius AI Registry · airegistry.mu</span>
        <span>BUILD 2026.05.07-r3 · TZ:GMT+4 · v0.4-mvp</span>
      </div>
    </footer>
  );
}
