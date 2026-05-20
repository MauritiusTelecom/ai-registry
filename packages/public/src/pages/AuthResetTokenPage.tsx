import { AuthShell } from "../auth-ui/AuthShell";
import { ResetPasswordForm } from "../auth-ui/ResetPasswordForm";

export const metadata = { title: "Set new password" };

export default async function ResetTokenPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthShell
      eyebrow="Reset password"
      title={
        <>
          Set a <span className="gradient-text">new password</span>.
        </>
      }
      subtitle="Choose at least 8 characters. The link expires one hour after it was issued."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
