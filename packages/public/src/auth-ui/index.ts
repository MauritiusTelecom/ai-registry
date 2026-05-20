// Barrel re-export for @airegistry/public/auth-ui.
//
// Public-facing auth forms (the visual layer). The wire/transport for login
// and registration lives in @airegistry/sdk + @airegistry/core; these
// components only render the forms and call the public /api/auth/* endpoints.
// `LogoutButton` is NOT here - it lives in @airegistry/ui-kit because the
// role portals also use it.

export * from "./AuthShell";
export * from "./LoginForm";
export * from "./RegisterForm";
export * from "./RequestResetForm";
export * from "./ResendVerificationForm";
export * from "./ResetPasswordForm";
