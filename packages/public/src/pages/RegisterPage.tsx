import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@airegistry/sdk/server";
import { AuthShell } from "../auth-ui/AuthShell";
import { RegisterForm } from "../auth-ui/RegisterForm";

export const metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/portal");

  return (
    <AuthShell
      eyebrow="Create account"
      title={
        <>
          Register as a{" "}
          <span className="gradient-text">Sovereign AI provider</span>.
        </>
      }
      subtitle="Provider accounts can publish, maintain, and request reviews on the resources they operate."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--text-2)" }}>
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
