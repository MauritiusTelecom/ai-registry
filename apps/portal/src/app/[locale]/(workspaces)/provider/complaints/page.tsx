import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import {
  ProviderComplaintsGrid,
  type ProviderComplaintRow
} from "@/components/portals/provider/ProviderComplaintsGrid";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadMyComplaints } from "@airegistry/sdk/server";

export const metadata = { title: "Provider · Complaints" };
export const dynamic = "force-dynamic";

/**
 * Complaints **directed at** this provider's resources or the provider record
 * itself. Scoping invariant - this page MUST never surface a complaint
 * targeting a different provider:
 *
 *   targetProviderId === user.provider.id
 *   OR targetResource.providerId === user.provider.id
 *
 * Public-safe projection: complainant name / email are NEVER surfaced here.
 * The provider sees only the redacted summary (type, severity, status,
 * description). The full record (with PII) lives in the admin portal.
 */

const SEVERITY_DISPLAY: Record<string, string> = {
  low: "active",
  medium: "experimental",
  high: "isolated"
};

const STATUS_DISPLAY: Record<string, string> = {
  open: "experimental",
  investigating: "experimental",
  resolved: "verified",
  rejected: "isolated"
};

export default async function ProviderComplaintsPage() {
  const t = await getTranslations("provider.complaints");
  const user = await getCurrentUser();
  const providerId = user?.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">{t("title")}</h1>
          <p className="p-subtitle">{t("noProviderSubtitle")}</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">{t("noProviderLinkage")}</div>
        </div>
      </div>
    );
  }

  const [rows, types] = await Promise.all([
    loadMyComplaints(providerId),
    listReferenceTable("complaintType")
  ]);

  const projected = rows.map((c) => ({
    id: c.id,
    ts: c.ts,
    target: c.target,
    targetSlug: c.targetSlug,
    type: c.type,
    severity: SEVERITY_DISPLAY[c.severityCode] ?? "active",
    status: STATUS_DISPLAY[c.statusCode] ?? "active",
    excerpt: c.excerpt
  }));

  const openCount = projected.filter((r) => r.status === "experimental").length;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">
          {t("subtitle", { count: projected.length, provider: user?.provider?.displayName ?? t("thisProvider"), openCount })}
        </p>
      </div>
      <ProviderComplaintsGrid rows={projected} types={types} />
      <p
        style={{
          marginTop: 18,
          fontSize: 12,
          color: "var(--text-3)",
          fontFamily: "IBM Plex Mono, monospace"
        }}
      >
        {t("redactedNote")}
      </p>
    </div>
  );
}
