import Link from "next/link";
import { SOVEREIGNTY_CHECKLIST_ITEMS } from "@airegistry/sdk";
import { listReferenceTable } from "@airegistry/sdk/server";

export const metadata = { title: "Admin · Policies" };
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
        <h1 className="p-title">Policies</h1>
        <p className="p-subtitle">
          Read-only summary of every operator policy that affects the registry. Edit the underlying
          taxonomies via{" "}
          <Link href="/admin/ref" className="p-footer-link">
            Reference Tables
          </Link>{" "}
          (lifecycle / trust / sovereignty / risk). Code-enforced rules are surfaced for
          transparency only.
        </p>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        <Section title="Constitutional rules (code-enforced)">
          <Bullet>
            <strong>Listing ≠ endorsement.</strong> Public detail pages and footer copy carry the
            disclaimer; copy may not be removed by deployments.
          </Bullet>
          <Bullet>
            <strong>Separation of duties (§11).</strong> Reviewers and admins cannot decide a review
            against their own provider record. Enforced by{" "}
            <code>assertCanReview()</code> in <code>src/lib/auth/separation-of-duties.ts</code>.
          </Bullet>
          <Bullet>
            <strong>Append-only audit (§18).</strong> Every governance mutation writes one
            <code> AuditLog </code>
            row through <code>writeAudit()</code>. Retention ≥ 24 months.
          </Bullet>
          <Bullet>
            <strong>Public-safe projections.</strong> Internal review notes, complainant PII, and
            reset/verification tokens never cross{" "}
            <code>src/lib/discovery/serializers.ts</code>.
          </Bullet>
        </Section>

        <Section title={`Lifecycle states (${lifecycle.length})`}>
          <Grid>
            {lifecycle.map((l) => (
              <Pill key={l.id} code={l.code} name={l.name} />
            ))}
          </Grid>
        </Section>

        <Section title={`Provider verification ladder (${providerStatuses.length})`}>
          <Grid>
            {providerStatuses.map((s) => (
              <Pill key={s.id} code={s.code} name={s.name} />
            ))}
          </Grid>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 10 }}>
            Operators set provider status via{" "}
            <code>POST /api/admin/providers/&#123;id&#125;/verify</code> (T035) - every change
            writes a paired <code>provider_verification</code> trust signal.
          </p>
        </Section>

        <Section title={`Trust signal kinds (${trustKinds.length})`}>
          <Grid>
            {trustKinds.map((k) => (
              <Pill key={k.id} code={k.code} name={k.name} description={k.description} />
            ))}
          </Grid>
        </Section>

        <Section title={`Risk tiers (${riskLevels.length})`}>
          <Grid>
            {riskLevels.map((r) => (
              <Pill key={r.id} code={r.code} name={r.name} />
            ))}
          </Grid>
        </Section>

        <Section title={`Sovereignty bases (${sovereigntyBases.length})`}>
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

        <Section title="§11 sovereignty checklist">
          <ol style={{ display: "grid", gap: 8, paddingLeft: 18, margin: 0 }}>
            {SOVEREIGNTY_CHECKLIST_ITEMS.map((c) => (
              <li key={c.itemCode} style={{ fontSize: 13, color: "var(--text-2)" }}>
                <code style={{ color: "var(--text-3)" }}>{c.itemCode}</code> - {c.question}
              </li>
            ))}
          </ol>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 10 }}>
            Reviewers must record an answer (yes / no / n_a) for every item before approving a
            review; any <code>no</code> answer blocks approval. Wired into{" "}
            <code>POST /api/admin/reviews/&#123;id&#125;/decide</code>.
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
