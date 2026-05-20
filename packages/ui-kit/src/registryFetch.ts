"use client";

import { withBase } from "@airegistry/sdk";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_COOKIE = "airegistry_csrf";

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Same-origin fetch that attaches `X-CSRF-Token` on mutations when the CSRF
 * cookie is present (set at login).
 */
export function registryFetch(input: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (MUTATION_METHODS.has(method)) {
    const csrf = readCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }
  return fetch(withBase(input), {
    ...init,
    credentials: init?.credentials ?? "same-origin",
    headers
  });
}
