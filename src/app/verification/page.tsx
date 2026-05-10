import Link from "next/link";
import { DocPage, DocPanel } from "@/components/public/sections/DocPage";

export const metadata = { title: "Verification proofs · Mauritius AI Registry" };

export default function VerificationPage() {
  return (
    <DocPage
      crumb={
        <>
          <Link href="/governance" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Governance
          </Link>{" "}
          · Verification proofs
        </>
      }
      title={
        <>
          Three signals.{" "}
          <span className="gradient-text">Never collapsed into one.</span>
        </>
      }
      subtitle="Every public resource carries three orthogonal signals. They are displayed as independent badges. They are never combined into a single tier number — that conflation is the most common failure mode of public registries."
    >
      <DocPanel title="Provider verification">
        <p>
          <strong>Question it answers:</strong> is this provider really who they say they
          are?
        </p>
        <p style={{ marginTop: 10 }}>
          Values: <code>UNVERIFIED</code> · <code>VERIFIED</code> ·{" "}
          <code>OFFICIAL_PROVIDER</code>.
        </p>
        <p style={{ marginTop: 10, color: "var(--text-2)" }}>
          Provider verification confirms identity. It does not certify every resource the
          provider submits.
        </p>
      </DocPanel>

      <DocPanel title="Sovereignty review">
        <p>
          <strong>Question it answers:</strong> does this resource actually encode
          something locally relevant?
        </p>
        <p style={{ marginTop: 10 }}>
          Values: <code>NOT_REVIEWED</code> · <code>PENDING</code> · <code>PASSED</code> ·{" "}
          <code>FAILED</code> · <code>NOT_REQUIRED</code>.
        </p>
        <p style={{ marginTop: 10, color: "var(--text-2)" }}>
          Reviewers apply the published{" "}
          <Link href="/sovereignty-rubric" style={{ color: "var(--text-2)" }}>
            sovereignty rubric
          </Link>{" "}
          and record their reasoning. Decisions are public.
        </p>
      </DocPanel>

      <DocPanel title="Official-resource status">
        <p>
          <strong>Question it answers:</strong> has the official provider explicitly
          authorised this resource?
        </p>
        <p style={{ marginTop: 10 }}>
          Values: <code>NONE</code> · <code>PENDING</code> · <code>ENDORSED</code> ·{" "}
          <code>REVOKED</code>.
        </p>
        <p style={{ marginTop: 10, color: "var(--text-2)" }}>
          Official-resource status is a stronger endorsement: it requires explicit
          authorisation by the official provider, not merely provider verification.
        </p>
      </DocPanel>

      <DocPanel title="Why three">
        <p>
          Collapsing these into a single tier number turns the registry into a de-facto
          certifier and attracts liability that was never intended. Three independent
          signals keep responsibility where it belongs: the provider operates and remains
          liable; the registry exposes lightweight signals so users can tell &ldquo;this
          resource exists&rdquo; from &ldquo;an authorised body has officially endorsed
          this resource.&rdquo;
        </p>
      </DocPanel>
    </DocPage>
  );
}
