import { ContactContent } from "../sections/ContactContent";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("public.contact");
}

export default function ContactPage() {
  return <ContactContent />;
}
