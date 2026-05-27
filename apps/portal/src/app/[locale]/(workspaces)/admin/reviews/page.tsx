import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { PageHero } from "@airegistry/ui-kit";
import { loadAdminReviewQueue } from "@airegistry/sdk/server";

export const metadata = { title: "Review queue" };

export default async function AdminReviewsPage() {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!user.roles.includes("admin") && !user.roles.includes("reviewer")) notFound();

  const reviews = await loadAdminReviewQueue();
  const t = await getTranslations("admin.reviews");

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link href="/admin" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              {t("crumbAdmin")}
            </Link>{" "}
            · {t("review")}
          </>
        }
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 900, margin: "0 auto", padding: 28 }}>
          {reviews.length === 0 ? (
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>{t("noOpenReviews")}</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 20 }}>
              {reviews.map((r) => (
                <li
                  key={r.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 16,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.resource?.title ?? "-"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                      {r.resource?.resourceType.code} · {r.resource?.provider.displayName} · {t("lifecycle")}:{" "}
                      {r.resource?.lifecycleStatus.code}
                    </div>
                  </div>
                  <Link href={`/admin/reviews/${r.id}`} className="btn btn-primary">
                    {t("review")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
