import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Provider · Team" };

export default function ProviderTeamPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Team</h1>
        <p className="p-subtitle">Operators authorised to act on behalf of this provider.</p>
      </div>
      <StubPanel area="Team management" specHref="ai-registry-specs/modules/provider/team/product.md" />
    </div>
  );
}
