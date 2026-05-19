import Link from "next/link";
import { DocPage, DocPanel } from "@/components/public/sections/DocPage";

export const metadata = { title: "Acceptable use · Mauritius AI Registry" };

export default function AcceptableUsePage() {
  return (
    <DocPage
      crumb={
        <>
          <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Home
          </Link>{" "}
          · Acceptable use
        </>
      }
      title="Acceptable use"
      subtitle="A short, plain-language policy on how to use the public portal, the discovery API and the submission flow."
    >
      <DocPanel title="When you submit a resource">
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>You must be authorised to publish the resource on behalf of the provider.</li>
          <li>
            Sovereignty claims must be backed by genuine evidence. False claims will be
            rejected and may lead to a provider account being suspended.
          </li>
          <li>
            Do not impersonate another provider or use a name or domain you don&rsquo;t
            control.
          </li>
          <li>
            Provider verification and official-resource endorsement require explicit
            authorisation from the relevant party.
          </li>
        </ul>
      </DocPanel>

      <DocPanel title="When you call the public APIs">
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>Be a good citizen of the public API: use pagination, cache responses, identify your client in the User-Agent header.</li>
          <li>Do not scrape aggressively or attempt denial-of-service.</li>
          <li>
            If you redistribute registry metadata, attribute back to the operating
            instance (e.g. airegistry.mu).
          </li>
        </ul>
      </DocPanel>

      <DocPanel title="What the registry will not list">
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>Resources whose primary purpose is unlawful or harmful.</li>
          <li>Resources that require runtime data the provider has no lawful basis to use.</li>
          <li>Resources that misrepresent provider identity or official endorsement.</li>
        </ul>
      </DocPanel>

      <DocPanel title="Reporting and appeals">
        <p>
          To report a listing that you believe breaches this policy, use the{" "}
          <Link href="/contact" style={{ color: "var(--text-2)" }}>
            contact form
          </Link>
          . If your resource was rejected or removed and you believe the decision was
          wrong, see the{" "}
          <Link href="/governance#appeals" style={{ color: "var(--text-2)" }}>
            appeals process
          </Link>
          .
        </p>
      </DocPanel>
    </DocPage>
  );
}
