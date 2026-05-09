import Link from "next/link";

// Bundle B footer (matches the home composition in app.jsx + sections.jsx).
// Six columns, brand block, then bottom row with build/operational tags.

type FooterLink = { label: string; href: string; external?: boolean };

const PRODUCT_LINKS: FooterLink[] = [
  { label: "Registry", href: "/registry" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Governance", href: "/governance" },
  { label: "AIR-SPEC 0.4", href: "/docs" },
  { label: "Status", href: "#" }
];

const RESOURCES_LINKS: FooterLink[] = [
  { label: "Documentation", href: "/docs" },
  { label: "Whitepaper", href: "#" },
  { label: "Open data", href: "#" },
  { label: "Reference impl", href: "#" },
  { label: "Audit log", href: "#" }
];

const PROVIDER_LINKS: FooterLink[] = [
  { label: "Submit a resource", href: "/contact" },
  { label: "Provider portal", href: "#" },
  { label: "Sovereignty rubric", href: "#" },
  { label: "Verification proofs", href: "#" },
  { label: "Pricing (free)", href: "#" }
];

const GOVERNANCE_LINKS: FooterLink[] = [
  { label: "Charter", href: "#" },
  { label: "Review board", href: "#" },
  { label: "Appeals", href: "#" },
  { label: "Disclosure", href: "#" },
  { label: "Public log", href: "#" }
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Terms of use", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Acceptable use", href: "#" },
  { label: "License (Apache-2.0)", href: "#" },
  { label: "Contact", href: "/contact" }
];

function FooterColumn({
  title,
  links,
  className
}: {
  title: string;
  links: FooterLink[];
  className?: string;
}) {
  return (
    <div className={`footer-col${className ? ` ${className}` : ""}`}>
      <h5>{title}</h5>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            {link.href.startsWith("/") ? (
              <Link href={link.href}>{link.label}</Link>
            ) : (
              <a href={link.href}>{link.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-glow" />
      <div className="footer-grid">
        <div className="footer-col">
          <Link href="/" className="nav-logo" style={{ marginBottom: 16 }}>
            <span className="nav-logo-mark" />
            <span style={{ fontSize: 15 }}>Sovereign Registry</span>
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
        <span>© 2026 Sovereign AI Registry · airegistry.mu</span>
        <span>BUILD 2026.05.07-r3 · TZ:GMT+4 · v0.4-mvp</span>
      </div>
    </footer>
  );
}
