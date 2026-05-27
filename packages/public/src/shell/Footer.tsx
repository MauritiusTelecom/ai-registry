import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ProviderPortalFooterLink } from "./ProviderPortalFooterLink";
import { withBase } from "@airegistry/sdk";

type FooterLink = { label: string; href: string; external?: boolean };
type FooterProviderPortalItem = { kind: "provider-portal" };
type FooterColumnLink = FooterLink | FooterProviderPortalItem;

function isProviderPortalFooterItem(link: FooterColumnLink): link is FooterProviderPortalItem {
  return "kind" in link && link.kind === "provider-portal";
}

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

export function Footer({
  registryName,
  logoUrl,
  copyrightLine,
  buildLine,
  openSourceRepoUrl
}: {
  registryName: string;
  logoUrl?: string | null;
  copyrightLine: string;
  buildLine: string;
  openSourceRepoUrl: string;
}) {
  const t = useTranslations("footer");
  const tc = useTranslations("common");
  const repo = openSourceRepoUrl.replace(/\/$/, "");

  const productLinks: FooterLink[] = [
    { label: t("registry"), href: "/registry" },
    { label: t("providers"), href: "/providers" },
    { label: t("ecosystem"), href: "/ecosystem" }
  ];

  const providerLinks: FooterColumnLink[] = [
    { kind: "provider-portal" },
    { label: t("sovereigntyRubric"), href: "/sovereignty-rubric" },
    { label: t("verificationProofs"), href: "/verification" },
    { label: t("pricingFree"), href: "/pricing" }
  ];

  const governanceLinks: FooterLink[] = [
    { label: t("charter"), href: "/governance#charter" },
    { label: t("reviewBoard"), href: "/governance#review-board" },
    { label: t("appeals"), href: "/governance#appeals" }
  ];

  const resourceLinks: FooterLink[] = [
    { label: t("documentation"), href: "/docs" },
    { label: t("whitepaper"), href: "/whitepaper" },
    { label: t("openData"), href: "/open-data" },
    { label: t("referenceImpl"), href: repo, external: true }
  ];

  const legalLinks: FooterLink[] = [
    { label: t("termsOfUse"), href: "/terms" },
    { label: t("privacy"), href: "/privacy" },
    { label: t("acceptableUse"), href: "/acceptable-use" },
    { label: t("licenseApache"), href: `${repo}/blob/main/LICENSE`, external: true },
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
          <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="tag" style={{ color: "#10b981" }}>
              <span className="status-dot" style={{ background: "#10b981" }} /> {tc("operational")}
            </span>
          </div>
        </div>

        <FooterColumn title={t("product")} links={productLinks} />
        <FooterColumn title={t("resources")} links={resourceLinks} />
        <FooterColumn title={t("providers")} links={providerLinks} />
        <FooterColumn title={t("governance")} links={governanceLinks} className="col-collapse" />
        <FooterColumn title={t("legal")} links={legalLinks} />
      </div>

      <div className="footer-bottom">
        <span>{copyrightLine}</span>
        <span>{buildLine}</span>
      </div>
    </footer>
  );
}

export { FooterColumn };
