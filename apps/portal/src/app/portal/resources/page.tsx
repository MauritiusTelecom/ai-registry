import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { PageHero } from "@airegistry/ui-kit";
import { loadPortalResourceList } from "@airegistry/sdk/server";

export const metadata = { title: "My resources" };

const LIFECYCLE_FILTERS = ["", "draft", "submitted", "in_review", "listed", "needs_update"] as const;

export default async function PortalResourcesPage({
  searchParams
}: {
  searchParams: Promise<{ lifecycle?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/resources");
  if (user.role.code !== "provider") {
    redirect("/portal");
  }

  const sp = await searchParams;
  const lifecycle = (sp.lifecycle ?? "").trim();
  const filter =
    lifecycle && LIFECYCLE_FILTERS.includes(lifecycle as (typeof LIFECYCLE_FILTERS)[number])
      ? lifecycle
      : "";

  const providerId = await ensureUserProviderLinked(user.id);

  const { resources, countsByLifecycle } = await loadPortalResourceList(providerId, filter);

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link href="/portal" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              Portal
            </Link>{" "}
            · Resources
          </>
        }
        title="Your resources"
        subtitle="Draft and manage listings for your provider workspace. Filter by lifecycle status."
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {LIFECYCLE_FILTERS.map((code) => {
            const label = code === "" ? "All" : code.replace(/_/g, " ");
            const href =
              code === "" ? "/portal/resources" : `/portal/resources?lifecycle=${encodeURIComponent(code)}`;
            const active = (filter === "" && code === "") || filter === code;
            return (
              <Link
                key={code || "all"}
                href={href}
                className={active ? "btn btn-primary" : "btn btn-secondary"}
                style={{ fontSize: 13 }}
              >
                {label}
                {code && countsByLifecycle[code] != null ? ` (${countsByLifecycle[code]})` : ""}
              </Link>
            );
          })}
          <Link href="/portal/resources/new" className="btn btn-primary" style={{ marginLeft: "auto" }}>
            New resource
          </Link>
        </div>

        <div className="glass" style={{ maxWidth: 960, margin: "0 auto", padding: 28 }}>
          {resources.length === 0 ? (
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>
              No resources in this view.{" "}
              <Link href="/portal/resources/new" style={{ color: "var(--accent)" }}>
                Create a draft
              </Link>
              .
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              {resources.map((r) => (
                <li
                  key={r.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 14
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                      {r.resourceType.code} · <span style={{ textTransform: "capitalize" }}>{r.lifecycleStatus.code.replace(/_/g, " ")}</span>
                      {r.airId ? (
                        <>
                          {" "}
                          · <code style={{ fontSize: 12 }}>{r.airId}</code>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(r.lifecycleStatus.code === "draft" || r.lifecycleStatus.code === "needs_update") && (
                      <Link href={`/portal/resources/${r.id}`} className="btn btn-secondary">
                        Edit
                      </Link>
                    )}
                    {r.lifecycleStatus.code === "listed" && r.slug ? (
                      <Link href={`/registry/${r.slug}`} className="btn btn-secondary">
                        Public page
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
