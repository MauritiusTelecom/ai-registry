import { DocsContent } from "../sections/DocsContent";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("public.docs");
}

export default function DocsPage() {
  return <DocsContent />;
}
