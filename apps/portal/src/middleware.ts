import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import {
  isMutationMethod,
  checkMutationOrigin,
  constantTimeEqual,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
} from "@airegistry/core/security/mutation-origin";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "airegistry_session";
const SECRET = process.env.AUTH_SECRET ?? "";

const PROTECTED_PREFIXES = ["/portal", "/admin", "/provider", "/verifier", "/sovereign"];

function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

function requiresSession(pathname: string): boolean {
  const bare = stripLocalePrefix(pathname);
  return PROTECTED_PREFIXES.some(
    (p) => bare === p || bare.startsWith(`${p}/`)
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

function withPathnameHeader(req: NextRequest): Headers {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return requestHeaders;
}

function mutationBlockedResponse(reason: string): NextResponse {
  return NextResponse.json(
    { error: "Request blocked.", code: reason },
    { status: 403 }
  );
}

function checkApiMutation(req: NextRequest): NextResponse | null {
  if (!req.nextUrl.pathname.startsWith("/api/") || !isMutationMethod(req.method)) {
    return null;
  }

  const originResult = checkMutationOrigin(req.headers);
  if (!originResult.allowed) {
    return mutationBlockedResponse(originResult.reason ?? "disallowed-origin");
  }

  const sessionToken = req.cookies.get(COOKIE_NAME)?.value;
  const csrfCookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (sessionToken && csrfCookie) {
    const headerToken = req.headers.get(CSRF_HEADER_NAME)?.trim() ?? "";
    if (!constantTimeEqual(csrfCookie, headerToken)) {
      return mutationBlockedResponse("csrf-mismatch");
    }
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip i18n for API routes and internal Next.js paths
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    const requestHeaders = withPathnameHeader(req);
    const mutationBlock = checkApiMutation(req);
    if (mutationBlock) return mutationBlock;
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const mutationBlock = checkApiMutation(req);
  if (mutationBlock) return mutationBlock;

  // Auth check for protected routes
  if (requiresSession(pathname)) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const valid = token ? await verifyCookie(token) : false;

    if (!valid) {
      const bare = stripLocalePrefix(pathname);
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", bare);
      const res = NextResponse.redirect(url);
      if (token) {
        res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
        res.cookies.set(CSRF_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      }
      return res;
    }
  }

  // Apply next-intl locale routing
  const response = intlMiddleware(req);
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
