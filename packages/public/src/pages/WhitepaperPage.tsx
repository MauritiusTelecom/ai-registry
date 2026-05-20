import Link from "next/link";
import { DocPage, DocPanel } from "../sections/DocPage";

export const metadata = { title: "Whitepaper · Mauritius AI Registry" };

export default function WhitepaperPage() {
  return (
    <DocPage
      crumb={
        <>
          <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Home
          </Link>{" "}
          · Whitepaper
        </>
      }
      title={
        <>
          Open-source infrastructure for{" "}
          <span className="gradient-text">sovereign AI discovery</span>.
        </>
      }
      subtitle="A registry-only pattern for discovering locally relevant AI resources while leaving hosting, access, runtime identity and liability with the rightful providers."
    >
      <DocPanel title="Why this matters now">
        <p>
          AI is moving from chat interfaces to connected systems. Models, agents, tools and
          skills that understand local law, language, data and institutions are becoming
          part of national digital infrastructure - but they are scattered, hard to find,
          and invisible to the AI systems that should use them.
        </p>
        <p style={{ marginTop: 14 }}>
          Sovereign AI matters more, not less. The most useful AI for citizens, businesses
          and public agencies is rarely the largest global model. It is the model that
          knows the country: a Kreol language model, a Mauritius tax skill, an agent that
          helps with company registration, a tool that exposes a public service.
        </p>
        <p style={{ marginTop: 14 }}>
          Without a sovereign discovery layer, useful local resources stay invisible.
          Countries risk building disconnected AI assets instead of an AI ecosystem.
        </p>
      </DocPanel>

      <DocPanel title="The discipline: what it is, what it is not">
        <p>
          The registry separates three concerns that other platforms collapse:
          <strong> discovery</strong>, <strong>provider operations</strong>, and{" "}
          <strong>hosting</strong>. Each is operated by a different party. The registry is
          only the first layer.
        </p>
        <p style={{ marginTop: 14 }}>
          The registry points. The provider operates. The hosting environment secures.
          That boundary is what makes the registry trustworthy at national scale.
        </p>
        <p style={{ marginTop: 14, color: "var(--text-2)" }}>
          It is <em>not</em> an AI hosting platform, gateway, runtime, access-control
          layer, marketplace, billing platform, legal certifier, or workload-identity
          issuer. Listing is not endorsement.
        </p>
      </DocPanel>

      <DocPanel title="What gets listed">
        <p>
          Four resource types - <strong>model</strong>, <strong>agent</strong>,{" "}
          <strong>tool</strong>, <strong>skill</strong> - and only resources that meet a{" "}
          <Link href="/sovereignty-rubric" style={{ color: "var(--text-2)" }}>
            sovereignty test
          </Link>
          : at least one of local law, local data, local systems, or local language and
          culture, backed by concrete evidence.
        </p>
        <p style={{ marginTop: 14 }}>
          Quality matters more than quantity. A registry of fifty credible, well-described
          resources is more useful than one of a thousand generic listings.
        </p>
      </DocPanel>

      <DocPanel title="Governance without overreach">
        <p>
          Every public resource carries{" "}
          <Link href="/verification" style={{ color: "var(--text-2)" }}>
            three independent governance signals
          </Link>
          : provider verification, sovereignty review, and official-resource status.
          Keeping them separate prevents the most common failure of public registries:
          becoming a de-facto certifier and attracting liability that was never intended.
        </p>
      </DocPanel>

      <DocPanel title="Companion documents">
        <p>
          This whitepaper sits alongside the{" "}
          <Link href="/docs" style={{ color: "var(--text-2)" }}>
            AIR-SPEC 0.4 technical specification
          </Link>{" "}
          and the{" "}
          <Link href="/governance" style={{ color: "var(--text-2)" }}>
            governance charter
          </Link>
          . Reference implementation: airegistry.mu, operated by Mauritius Telecom.
        </p>
      </DocPanel>
    </DocPage>
  );
}
