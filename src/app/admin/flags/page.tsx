import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Admin · Flags" };

export default function AdminFlagsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Flags</h1>
        <p className="p-subtitle">Operator-raised flags against resources and providers.</p>
      </div>
      <StubPanel
        area="Flags queue"
        specHref="ai-registry-specs/modules/admin/flags/product.md"
      />
    </div>
  );
}
