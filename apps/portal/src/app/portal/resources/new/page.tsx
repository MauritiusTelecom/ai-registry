import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getConfig } from "@airegistry/sdk";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/public/sections/PageHero";
import { NewResourceForm } from "@/components/portal/NewResourceForm";

export const metadata = { title: "New resource" };

export default async function PortalNewResourcePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/resources/new");
  if (user.role.code !== "provider") redirect("/portal");

  const cfg = getConfig();
  // DB-active types ∩ env RESOURCE_TYPES restriction — admins can hide a
  // type without a redeploy by flipping ResourceType.active.
  const allowedTypes = await prisma.resourceType.findMany({
    where: { active: true, code: { in: cfg.resourceTypes } },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true }
  });

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
        subtitle="Creates a draft pre-linked to a sovereignty basis and a REST endpoint. Fill in the rest, then submit for review."
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 560, margin: "0 auto", padding: 28 }}>
          <NewResourceForm allowedTypes={allowedTypes} />
        </div>
      </section>
    </div>
  );
}
