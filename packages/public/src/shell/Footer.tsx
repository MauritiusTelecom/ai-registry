import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { withBase } from "@airegistry/sdk";

const OSS_URL = "https://airegistry.dev";
const CONTACT_EMAIL = "airegistry@telecom.mu";

type FooterLink = { label: string; href: string; external?: boolean };

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="footer-col">
      <h5>{title}</h5>
      <ul>
        {links.map((link) => (
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
        ))}
      </ul>
    </div>
  );
}

export function Footer({
  registryName,
  logoUrl,
  copyrightLine
}: {
  registryName: string;
  logoUrl?: string | null;
  copyrightLine: string;
}) {
  const t = useTranslations("footer");

  const registryLinks: FooterLink[] = [
    { label: t("browseRegistry"), href: "/registry" },
    { label: t("providers"), href: "/providers" }
  ];

  const governanceLinks: FooterLink[] = [
    { label: t("charter"), href: "/governance#charter" },
    { label: t("reviewBoard"), href: "/governance#review-board" },
    { label: t("appeals"), href: "/governance#appeals" }
  ];

  const legalLinks: FooterLink[] = [
    { label: t("termsOfUse"), href: "/terms" },
    { label: t("privacyPolicy"), href: "/privacy" },
    { label: t("acceptableUse"), href: "/acceptable-use" }
  ];

  const contactLinks: FooterLink[] = [
    { label: t("contactUs"), href: "/contact" },
    { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` }
  ];

  return (
    <footer className="footer">
      <div className="footer-glow" />
      <div className="footer-grid">
        <div className="footer-col">
          <Link href="/" className="nav-logo" style={{ marginBottom: 16 }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={withBase(logoUrl)}
                alt=""
                className="nav-logo-mark"
                style={{ background: "transparent", boxShadow: "none", objectFit: "contain" }}
              />
            ) : (
              <span className="nav-logo-mark" />
            )}
            <span style={{ fontSize: 15 }}>{registryName}</span>
          </Link>
          <p className="footer-brand">{t("tagline")}</p>
        </div>

        <FooterColumn title={t("registry")} links={registryLinks} />
        <FooterColumn title={t("governanceTrust")} links={governanceLinks} />
        <FooterColumn title={t("legal")} links={legalLinks} />
        <FooterColumn title={t("contact")} links={contactLinks} />
      </div>

      <div className="footer-bottom">
        <span>{copyrightLine} · Powered by Mauritius Telecom</span>
        <span>
          Built on the{" "}
          <a
            href={OSS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)", textDecoration: "none" }}
          >
            Opensource AI Registry
          </a>
        </span>
      </div>
    </footer>
  );
}
