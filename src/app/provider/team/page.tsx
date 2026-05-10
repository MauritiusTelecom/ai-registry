import { redirect } from "next/navigation";

// Removed from the provider sidebar — multi-user team management is out of
// MVP scope. The /admin/users surface manages all users including provider
// linkage. Redirect bookmarks to the dashboard.
export default function ProviderTeamDeprecated() {
  redirect("/provider");
}
