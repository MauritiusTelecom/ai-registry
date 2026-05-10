import { redirect } from "next/navigation";

// Removed from the provider sidebar — docs surface lives at the public /docs
// route. Kept as a redirect to avoid 404 on bookmarks.
export default function ProviderDocsDeprecated() {
  redirect("/docs");
}
