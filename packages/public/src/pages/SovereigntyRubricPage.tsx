import Link from "next/link";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Sovereignty rubric");
}

const BASES: { code: string; name: string; meaning: string; evidence: string }[] = [
  {
    code: "LAW",
    name: "Local law",
    meaning:
      "Encodes local legislation, regulation, official process or professional obligation.",
    evidence:
      "Citation of statute (e.g. Data Protection Act 2017), regulator reference, professional body mandate."
  },
  {
    code: "DATA",
    name: "Local data",
    meaning: "Uses local datasets, records or locally collected knowledge.",
    evidence: "Dataset name and provenance, source institution, collection methodology summary."
  },
  {
    code: "SYSTEMS",
    name: "Local systems",
    meaning: "Integrates with or describes local institutional systems and workflows.",
    evidence: "Named system (e.g. CBRD, MNS, MRA), integration contract or documented workflow."
  },
  {
    code: "LANGUAGE_CULTURE",
    name: "Local language & culture",
    meaning: "Supports local language, culture, norms or context.",
    evidence:
      "Language asset (corpus, lexicon), cultural artefact reference, BCP-47 code (e.g. mfe)."
  }
];

export default function SovereigntyRubricPage() {
  return (
    <DocPage
      crumb={
        <>
          <Link href="/governance" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Governance
          </Link>{" "}
          · Sovereignty rubric
        </>
      }
      title={
        <>
          The <span className="gradient-text">sovereignty test</span>.
        </>
      }
      subtitle="To be elevated past draft, a resource must cite at least one sovereignty basis with concrete evidence. The aim is to keep ‘sovereign’ specific, not aspirational."
    >
      <DocPanel title="The four bases">
        <div style={{ display: "grid", gap: 16 }}>
          {BASES.map((b) => (
            <div
              key={b.code}
              style={{
                paddingBottom: 14,
                borderBottom: "1px dashed var(--hairline)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap"
                }}
              >
                <span className="tag">{b.code}</span>
                <strong style={{ fontSize: 16 }}>{b.name}</strong>
              </div>
              <p style={{ marginTop: 8 }}>{b.meaning}</p>
              <p style={{ marginTop: 6, fontSize: 13.5, color: "var(--text-3)" }}>
                <strong style={{ color: "var(--text-2)" }}>Evidence:</strong> {b.evidence}
              </p>
            </div>
          ))}
        </div>
      </DocPanel>

      <DocPanel title="How a claim is reviewed">
        <p>
          For each claim, the reviewer applies a published checklist and records the
          decision (<code>PENDING</code> · <code>ACCEPTED</code> · <code>REJECTED</code>),
          plus public reviewer notes. Every claim is timestamped against the rubric
          version applied at review time, so historical decisions remain interpretable
          when the rubric is later updated.
        </p>
      </DocPanel>

      <DocPanel title="Where this fits">
        <p>
          Sovereignty review is one of three independent governance signals. See{" "}
          <Link href="/verification" style={{ color: "var(--text-2)" }}>
            verification proofs
          </Link>{" "}
          for the full picture, and{" "}
          <Link href="/docs" style={{ color: "var(--text-2)" }}>
            AIR-SPEC 0.4 §4
          </Link>{" "}
          for the normative form.
        </p>
      </DocPanel>
    </DocPage>
  );
}
