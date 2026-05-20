import Link from "next/link";
import { DocPage, DocPanel } from "../sections/DocPage";

export const metadata = { title: "Pricing · Mauritius AI Registry" };

export default function PricingPage() {
  return (
    <DocPage
      crumb={
        <>
          <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Home
          </Link>{" "}
          · Pricing
        </>
      }
      title={
        <>
          Free. Public good.{" "}
          <span className="gradient-text">No marketplace.</span>
        </>
      }
      subtitle="The registry is digital public infrastructure. Listing, browsing, search and AIR-ID resolution are free for providers, developers, citizens and AI systems. There are no listing fees, no commission, and no paid tiers."
    >
      <DocPanel title="What is free">
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>Submitting a resource to the registry.</li>
          <li>Browsing, searching and reading public listings.</li>
          <li>Getting an AIR-ID issued when a resource is elevated past draft.</li>
          <li>Calling the public discovery API and the AIR-ID resolver.</li>
          <li>Standing up your own registry from the open-source AIR-Core platform.</li>
        </ul>
      </DocPanel>

      <DocPanel title="What the registry does not do">
        <p>
          The registry is not a marketplace, billing platform or payment processor. It
          does not take a commission on transactions, host AI workloads, or charge
          providers for verification or endorsement. Commercial agreements between
          consumers and providers happen directly between those parties - outside the
          registry.
        </p>
      </DocPanel>

      <DocPanel title="Operator costs">
        <p>
          Operating the registry is funded by its operator (Mauritius Telecom for
          airegistry.mu) as part of its digital public infrastructure mandate. Other
          jurisdictions stand up their own instance, configured for their identity domain
          and reviewer pool, with operating costs absorbed by their own DPI enabler.
        </p>
        <p style={{ marginTop: 14 }}>
          See{" "}
          <Link href="/whitepaper" style={{ color: "var(--text-2)" }}>
            the whitepaper
          </Link>{" "}
          for the operating model.
        </p>
      </DocPanel>
    </DocPage>
  );
}
