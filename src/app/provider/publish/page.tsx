import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Provider · Publish" };

export default function ProviderPublishPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Publish a resource</h1>
        <p className="p-subtitle">
          Five-step authoring flow — manifest → endpoint → verification → sovereignty → confirm.
        </p>
      </div>
      <StubPanel area="Authoring wizard" specHref="ai-registry-specs/modules/provider/publish/product.md" />
    </div>
  );
}
