import Link from "next/link";
import { AuthShell } from "@/components/public/auth/AuthShell";
import { RequestResetForm } from "@/components/public/auth/RequestResetForm";

export const metadata = { title: "Reset password" };

export default function RequestResetPage() {
  return (
    <AuthShell
      eyebrow="Reset password"
      title={
        <>
          Forgot your <span className="gradient-text">password</span>?
        </>
      }
      subtitle="Enter your email and we'll send you a one-time reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" style={{ color: "var(--text-2)" }}>
            Sign in
          </Link>
        </>
      }
    >
      <RequestResetForm />
    </AuthShell>
  );
}
