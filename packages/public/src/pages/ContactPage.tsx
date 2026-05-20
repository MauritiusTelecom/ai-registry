import { ContactContent } from "../sections/ContactContent";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Contact");
}

export default function ContactPage() {
  return <ContactContent />;
}
