import { Reveal, Gradient } from "@/components/library";
import { PageHero } from "./PageHero";

const SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    body: "AIR-SPEC 0.4 defines the listing schema, sovereignty rubric, identifier format, and verification proofs the registry implements."
  },
  {
    id: "air-id",
    label: "AIR-ID format",
    body: "air://<jurisdiction>/<kind>/<provider>/<name>@<version> - stable, resolvable, and human-readable."
  },
  {
    id: "metadata",
    label: "Listing metadata",
    body: "Provider, kind, sovereignty bases with evidence, contact, terms, license, region, optional SPIFFE trust domain."
  },
  {
    id: "verification",
    label: "Provider verification",
    body: "DNS TXT and email-based proofs. Any mismatch flips status to “unverified” and surfaces a public note."
  },
  {
    id: "review",
    label: "Review workflow",
    body: "Reviewers apply the published checklist, record signed notes, and assign a status. Appeals are public."
  }
];

export function DocsContent() {
  return (
    <div>
      <PageHero
        crumb="Documentation · AIR-SPEC 0.4 MVP"
        title={
          <>
            The technical <Gradient>specification</Gradient>.
          </>
        }
        subtitle="Everything you need to publish, resolve and audit listings against the v0.4 reference implementation at airegistry.mu."
      />
      <section className="section" style={{ paddingTop: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 48 }}>
          <Reveal>
            <div
              style={{
                position: "sticky",
                top: 100,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 12
              }}
            >
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  style={{ padding: "6px 10px", borderRadius: 6, color: "var(--text-2)" }}
                >
                  {section.label}
                </a>
              ))}
            </div>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {SECTIONS.map((section, idx) => (
              <Reveal key={section.id} delay={idx * 50}>
                <div id={section.id}>
                  <div className="eyebrow">
                    <span className="dot" />
                    <span>
                      § {String(idx + 1).padStart(2, "0")} {section.label}
                    </span>
                  </div>
                  <h3 style={{ marginTop: 12 }}>{section.label}</h3>
                  <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.65 }}>{section.body}</p>
                  <pre
                    style={{
                      marginTop: 14,
                      padding: 16,
                      background: "var(--code-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 12.5,
                      color: "var(--text-2)",
                      overflow: "auto"
                    }}
                  >{`# example
GET /.well-known/air-spec/${section.id}
→ 200 OK  application/yaml`}</pre>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
//
