// Prefix the deployment basePath onto an absolute path.
// When the app is mounted at a sub-path (e.g. /ui/ai-registry), absolute
// paths like "/api/auth/login" or "/portal" bypass the prefix and 404 at
// the proxy. Use for client-side fetch URLs and hard redirect targets.
// (next/link and useRouter().push handle basePath automatically.)

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
