import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { withBase } from "@airegistry/sdk";

type FooterLink = { label: string; href: string; external?: boolean };

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.href.startsWith("/")) {
    return <Link href={link.href}>{link.label}</Link>;
  }
  return (
    <a
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener noreferrer" : undefined}
    >
      {link.label}
    </a>
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

  const legalLinks: FooterLink[] = [
    { label: t("termsOfUse"), href: "/terms" },
    { label: t("privacy"), href: "/privacy" },
    { label: t("acceptableUse"), href: "/acceptable-use" },
    { label: t("contact"), href: "/contact" }
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
          <p className="footer-brand">{t("brandDescription")}</p>
        </div>

        <nav className="footer-links-row" aria-label={t("legal")}>
          {legalLinks.map((link) => (
            <FooterLinkItem key={link.label} link={link} />
          ))}
        </nav>
      </div>

      <div className="footer-bottom">
        <span>{copyrightLine}</span>
      </div>
    </footer>
  );
}
