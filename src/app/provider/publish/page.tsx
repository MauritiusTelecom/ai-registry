import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getConfig } from "@/lib/config";
import { NewResourceForm } from "@/components/portal/NewResourceForm";
import { StubPanel } from "@/components/portals/StubPanel";
import { REGISTRATION_MSG } from "@/lib/portal/authoring-messages";

export const metadata = { title: "Provider · Publish" };
export const dynamic = "force-dynamic";

export default async function ProviderPublishPage() {
  const user = await getCurrentUser();
  const cfg = getConfig();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Publish a resource</h1>
        <p className="p-subtitle">
          Create a catalogue draft, refine descriptions, then submit for operator review. A multi-step
          sovereignty wizard is planned; this flow covers draft → submit today.
        </p>
      </div>

      {user && !user.canAuthorResources ? (
        <div
          role="status"
          style={{
            marginBottom: 20,
            padding: "14px 18px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "rgba(var(--secondary-rgb), 0.08)",
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 720
          }}
        >
          {!user.emailVerified ? (
            <>
              <strong>Verify your email</strong> before you can publish.{" "}
              <Link href="/auth/verify" className="p-footer-link">
                Open verification →
              </Link>
            </>
          ) : (
            <>
              {REGISTRATION_MSG}{" "}
              <Link href="/provider/settings" className="p-footer-link" style={{ fontWeight: 600 }}>
                Settings →
              </Link>
            </>
          )}
        </div>
      ) : null}

      {user?.canAuthorResources ? (
        <div className="p-card" style={{ padding: "22px 24px", maxWidth: 640, borderRadius: 12 }}>
          <h2 className="p-card-title" style={{ marginBottom: 8 }}>
            New draft
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0, marginBottom: 20 }}>
            A default sovereignty basis and placeholder endpoint are attached automatically. Edit the draft
            next, then submit for review.
          </p>
          <NewResourceForm
            allowedTypes={cfg.resourceTypes as string[]}
            afterCreate="provider"
            variant="provider"
          />
        </div>
      ) : (
        <StubPanel area="Authoring wizard (advanced steps)" specHref="ai-registry-specs/modules/provider/publish/product.md" />
      )}
    </div>
  );
}
