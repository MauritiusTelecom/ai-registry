import Link from "next/link";
import { DocPage, DocPanel } from "@/components/public/sections/DocPage";

export const metadata = { title: "Terms of use · Mauritius AI Registry" };

export default function TermsPage() {
  return (
    <DocPage
      crumb={
        <>
          <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Home
          </Link>{" "}
          · Terms of use
        </>
      }
      title="Terms of use"
      subtitle="The plain-language terms that govern the use of the Mauritius AI Registry public portal and APIs."
    >
      <DocPanel title="The registry points; the provider operates">
        <p>
          The Mauritius AI Registry is a discovery layer. It lists, describes and resolves
          locally relevant AI resources. It does not host, gateway, proxy, authenticate or
          rate-limit calls to the resources it lists. When you discover a resource here,
          you go directly to the provider; the provider&rsquo;s own terms apply to your
          actual use of the resource.
        </p>
      </DocPanel>

      <DocPanel title="Listing is not endorsement">
        <p>
          A public listing means a resource has been submitted and (where applicable)
          reviewed. It is not a certification, a recommendation, or a guarantee of fitness
          for any purpose. Read the{" "}
          <Link href="/verification" style={{ color: "var(--text-2)" }}>
            three governance signals
          </Link>{" "}
          on each listing to understand what trust is on offer.
        </p>
      </DocPanel>

      <DocPanel title="Acceptable use">
        <p>
          Use of this portal and its APIs is subject to the{" "}
          <Link href="/acceptable-use" style={{ color: "var(--text-2)" }}>
            acceptable use policy
          </Link>
          . In short: do not abuse the API; do not impersonate providers; do not submit
          resources you do not have the right to publish.
        </p>
      </DocPanel>

      <DocPanel title="No warranty">
        <p>
          The portal and APIs are provided on an &ldquo;as is&rdquo; basis. The operator
          (Mauritius Telecom) makes no warranty about the accuracy or completeness of
          third-party metadata, and is not responsible for the resources providers point
          to. Liability for any resource rests with its provider.
        </p>
      </DocPanel>

      <DocPanel title="Changes">
        <p>
          These terms may evolve as the registry matures. Material changes are recorded in
          the{" "}
          <Link href="/audit-log" style={{ color: "var(--text-2)" }}>
            public audit log
          </Link>
          . Questions go to{" "}
          <Link href="/contact" style={{ color: "var(--text-2)" }}>
            the contact form
          </Link>
          .
        </p>
      </DocPanel>
    </DocPage>
  );
}
