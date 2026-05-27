// @airegistry/ui-kit - shared design tokens and headless React primitives.
//
// Tokens (tokens.css) and these primitives are the shared visual layer
// between the public site and the role workspaces (admin, provider,
// verifier, sovereign). Anything both halves of a portal need lives
// here; anything specific to one or the other stays in that app/package.
//
// Operators override CSS variables from tokens.css to theme the portal
// without forking. Future additions land in this index: Button, Badge,
// Card, Modal, Tabs. Plugin UI slots import from @airegistry/plugin-host/slot
// (not this barrel) so client components here never pull in server-only loaders.

export const UI_KIT_VERSION = "0.1.0" as const;

export { Icon, type IconName } from "./Icon";
export { PageHero } from "./PageHero";
export { LogoutButton } from "./LogoutButton";
export {
  AuthProvider,
  useAuth,
  type AuthUser,
  type Role
} from "./AuthProvider";
export { ThemeProvider, useTheme } from "./ThemeProvider";
export {
  SAR_THEME_KEY,
  themeFromCookie,
  type ThemeMode
} from "./theme-cookie";
export { registryFetch } from "./registryFetch";
