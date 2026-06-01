import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { SOVEREIGNTY_CHECKLIST_ITEMS } from "@airegistry/sdk";
import { listReferenceTable } from "@airegistry/sdk/server";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("admin.policies");
}

export const dynamic = "force-dynamic";

/**
 * Admin · Policies - read-only summary of the operator-curated policy
 * surfaces driving the registry. Every value here is either:
 *
 *   - taxonomy-driven (lifecycle, trust signal kinds, sovereignty bases) -
 *     editable through `/admin/ref/[table]`;
 *   - constitution-derived (separation-of-duties, listing≠endorsement,
 *     audit retention) - code-enforced;
 *   - checklist-derived (sovereignty review §11) - sourced from
 *     `src/lib/governance/sovereignty-checklist.ts`.
 *
 * Module spec: `modules/admin/policies/product.md`.
 */
export default async function AdminPoliciesPage() {
  const t = await getTranslations("admin.policies");
  const [lifecycle, trustKinds, sovereigntyBases, riskLevels, providerStatuses] = await Promise.all(
    [
      listReferenceTable("lifecycleStatus"),
      listReferenceTable("trustSignalType"),
      listReferenceTable("sovereigntyBasis", { orderBy: "name" }),
      listReferenceTable("riskLevel"),
      listReferenceTable("providerStatusType")
    ]
  );

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        <Section title={t("constitutionalRules")}>
          <Bullet>
            {t.rich("ruleListingNotEndorsement", {
              strong: (chunks) => <strong>{chunks}</strong>
            })}
          </Bullet>
          <Bullet>
            {t.rich("ruleSeparationOfDuties", {
              strong: (chunks) => <strong>{chunks}</strong>,
              code: (chunks) => <code>{chunks}</code>
            })}
          </Bullet>
          <Bullet>
            {t.rich("ruleAppendOnlyAudit", {
              strong: (chunks) => <strong>{chunks}</strong>,
              code: (chunks) => <code>{chunks}</code>
            })}
          </Bullet>
          <Bullet>
            {t.rich("rulePublicSafe", {
              strong: (chunks) => <strong>{chunks}</strong>,
              code: (chunks) => <code>{chunks}</code>
            })}
          </Bullet>
        </Section>

        <Section title={t("lifecycleStates", { count: lifecycle.length })}>
          <Grid>
            {lifecycle.map((l) => (
              <Pill key={l.id} code={l.code} name={l.name} />
            ))}
          </Grid>
        </Section>

        <Section title={t("providerVerificationLadder", { count: providerStatuses.length })}>
          <Grid>
            {providerStatuses.map((s) => (
              <Pill key={s.id} code={s.code} name={s.name} />
            ))}
          </Grid>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 10 }}>
            {t.rich("providerVerificationNote", {
              code: (chunks) => <code>{chunks}</code>
            })}
          </p>
        </Section>

        <Section title={t("trustSignalKinds", { count: trustKinds.length })}>
          <Grid>
            {trustKinds.map((k) => (
              <Pill key={k.id} code={k.code} name={k.name} description={k.description} />
            ))}
          </Grid>
        </Section>

        <Section title={t("riskTiers", { count: riskLevels.length })}>
          <Grid>
            {riskLevels.map((r) => (
              <Pill key={r.id} code={r.code} name={r.name} />
            ))}
          </Grid>
        </Section>

        <Section title={t("sovereigntyBases", { count: sovereigntyBases.length })}>
          <Grid>
            {sovereigntyBases.map((b) => (
              <Pill
                key={b.id}
                code={b.code}
                name={b.name}
                description={b.description ?? null}
              />
            ))}
          </Grid>
        </Section>

        <Section title={t("sovereigntyChecklist")}>
          <ol style={{ display: "grid", gap: 8, paddingLeft: 18, margin: 0 }}>
            {SOVEREIGNTY_CHECKLIST_ITEMS.map((c) => (
              <li key={c.itemCode} style={{ fontSize: 13, color: "var(--text-2)" }}>
                <code style={{ color: "var(--text-3)" }}>{c.itemCode}</code> - {c.question}
              </li>
            ))}
          </ol>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 10 }}>
            {t.rich("sovereigntyChecklistNote", {
              code: (chunks) => <code>{chunks}</code>
            })}
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass" style={{ padding: 20, borderRadius: 12 }}>
      <h2
        style={{
          fontSize: 12,
          fontFamily: "IBM Plex Mono, monospace",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          marginBottom: 12
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13.5, color: "var(--text-2)", margin: "6px 0", lineHeight: 1.55 }}>
      • {children}
    </p>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 8
      }}
    >
      {children}
    </div>
  );
}

function Pill({
  code,
  name,
  description = null
}: {
  code: string;
  name: string;
  description?: string | null;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--input-bg)"
      }}
    >
      <div style={{ fontSize: 13, color: "var(--text)" }}>{name}</div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          fontFamily: "IBM Plex Mono, monospace",
          marginTop: 2
        }}
      >
        {code}
        {description ? (
          <>
            <br />
            <span style={{ color: "var(--text-3)" }}>{description}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
