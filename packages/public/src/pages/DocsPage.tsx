import { DocsContent } from "../sections/DocsContent";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Documentation");
}

export default function DocsPage() {
  return <DocsContent />;
}
