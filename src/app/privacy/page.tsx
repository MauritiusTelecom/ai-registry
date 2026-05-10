import Link from "next/link";
import { DocPage, DocPanel } from "@/components/public/sections/DocPage";

export const metadata = { title: "Privacy · Mauritius AI Registry" };

export default function PrivacyPage() {
  return (
    <DocPage
      crumb={
        <>
          <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            Home
          </Link>{" "}
          · Privacy
        </>
      }
      title="Privacy"
      subtitle="What data the registry holds, what it does with it, and what rights you have under Mauritian data protection law."
    >
      <DocPanel title="What we hold">
        <p>
          The registry holds two kinds of data:
        </p>
        <ul style={{ paddingLeft: 22, marginTop: 10, display: "grid", gap: 8 }}>
          <li>
            <strong>Public listing metadata</strong> — providers, resources, governance
            signals, sovereignty claims, endpoints. This is intentionally public and
            available through the discovery API.
          </li>
          <li>
            <strong>Account data</strong> — name, email, organisation and role for
            registered providers, reviewers and operators. Used only to authenticate, route
            review work and contact you about the registry.
          </li>
        </ul>
      </DocPanel>

      <DocPanel title="Lawful basis">
        <p>
          Account data is held under the Mauritius Data Protection Act 2017. The lawful
          basis is either contract performance (we cannot run your provider account
          without it) or legitimate interest (operating a public registry of national
          interest).
        </p>
      </DocPanel>

      <DocPanel title="What we don’t do">
        <p>
          We do not sell account data. We do not share it with third parties for
          marketing. We do not host or proxy calls to the AI resources we list, so we do
          not see end-user prompts or responses — those go directly between consumer and
          provider.
        </p>
      </DocPanel>

      <DocPanel title="Your rights">
        <p>
          You can request access to, correction of, or deletion of your account data at
          any time through{" "}
          <Link href="/contact" style={{ color: "var(--text-2)" }}>
            the contact form
          </Link>
          . If your resource has been publicly listed, the AIR-ID and the underlying
          audit log persist (append-only) — the resource record can be tombstoned, but the
          governance trail behind a previously public listing is itself a public record.
        </p>
      </DocPanel>

      <DocPanel title="Operator">
        <p>
          The Mauritius AI Registry is operated by Mauritius Telecom in collaboration with
          the Ministry of Information.
        </p>
      </DocPanel>
    </DocPage>
  );
}
