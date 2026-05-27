import { EcosystemContent } from "../sections/EcosystemContent";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Ecosystem");
}

export default function EcosystemPage() {
  return <EcosystemContent />;
}
