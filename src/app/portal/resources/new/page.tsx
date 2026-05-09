import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getConfig } from "@/lib/config";
import { PageHero } from "@/components/public/sections/PageHero";
import { NewResourceForm } from "@/components/portal/NewResourceForm";

export const metadata = { title: "New resource" };

export default async function PortalNewResourcePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/resources/new");
  if (user.role.code !== "provider") redirect("/portal");

  const cfg = getConfig();

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link href="/portal" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              Portal
            </Link>{" "}
            ·{" "}
            <Link href="/portal/resources" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              Resources
            </Link>{" "}
            · New
          </>
        }
        title="New resource (draft)"
        subtitle="Creates a draft with a default sovereignty basis link and placeholder endpoint; refine before submit."
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 560, margin: "0 auto", padding: 28 }}>
          <NewResourceForm allowedTypes={cfg.resourceTypes} />
        </div>
      </section>
    </div>
  );
}
