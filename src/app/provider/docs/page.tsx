import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Provider · Docs" };

export default function ProviderDocsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Documentation</h1>
        <p className="p-subtitle">Authoring guides, evidence templates, AIR-SPEC reference.</p>
      </div>
      <StubPanel area="Provider docs" specHref="ai-registry-specs/modules/provider/docs/product.md" />
    </div>
  );
}
