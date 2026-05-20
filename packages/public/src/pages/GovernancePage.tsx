import { GovernancePageContent } from "../sections/GovernancePageContent";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Governance");
}

export default function GovernancePage() {
  return <GovernancePageContent />;
}
