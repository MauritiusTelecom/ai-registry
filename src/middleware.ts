import { NextResponse, type NextRequest } from "next/server";

/**
 * Phase 2 middleware: gate the authenticated portal surface.
 *
 * The middleware runs on the Edge runtime by default — Prisma cannot run
 * here. The check is therefore signature-only: we verify the session
 * cookie's HMAC and expiry. The server component / route handler that
 * receives the request then performs the canonical user lookup against the
 * database (see `src/lib/auth/current-user.ts`).
 *
 * If the signature is missing or invalid, the middleware redirects to
 * `/login?next=<original-path>` so the user lands back on the page they
 * were trying to reach after authenticating.
 *
 * Protected prefixes are configured via the `matcher` block at the bottom
 * of this file. Add new protected portals (admin, verifier, sovereign) by
 * extending the matcher AND the `requiresSession()` helper.
 */

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "airegistry_session";
const SECRET = process.env.AUTH_SECRET ?? "";

const PROTECTED_PREFIXES = ["/portal", "/admin", "/provider", "/verifier", "/sovereign"];

function requiresSession(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function verifyCookie(token: string): Promise<boolean> {
  if (!SECRET) return false;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let sigBytes: Uint8Array;
  try {
    sigBytes = base64UrlToBytes(sigB64);
  } catch {
    return false;
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes as BufferSource,
    enc.encode(payloadB64)
  );
  if (!ok) return false;

  // Check expiry without trusting the payload until the signature is
  // verified above.
  try {
    const payloadBytes = base64UrlToBytes(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      exp?: number;
    };
    if (typeof payload.exp !== "number") return false;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/**
 * The middleware also propagates an `x-pathname` request header on every
 * request so the root layout can detect portal routes and skip the public
 * site chrome (TopNav / Footer). Portal pages already render their own
 * sidebar + header; rendering the home-page nav above them would double up.
 */
function withPathnameHeader(req: NextRequest): Headers {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return requestHeaders;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestHeaders = withPathnameHeader(req);

  if (!requiresSession(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = token ? await verifyCookie(token) : false;

  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    // Clear a present-but-invalid cookie so subsequent requests don't loop.
    if (token) {
      res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    }
    return res;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // The middleware now runs on every page-rendering request so it can stamp
  // `x-pathname` for the root layout's chrome detection. Static assets, API
  // routes, and Next internals are excluded so the cost stays trivial.
  matcher: ["/((?!_next/|favicon|api/|.*\\..*).*)"]
};
