"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { withBase } from "@/lib/with-base";

/**
 * Phase 2 AuthProvider.
 *
 * Replaces the previous client-side mock with a real-session consumer:
 *
 * - On mount, fetches `/api/auth/me` and hydrates the user envelope.
 * - Exposes a `logout()` that hits POST `/api/auth/logout` then hard-reloads.
 * - Exposes a `login(email, password)` that hits POST `/api/auth/login`.
 *
 * The shape (`firstName`, `email`, `roles`) is preserved so the existing
 * TopNav UserMenu — which renders role-shortcut buttons gated by `roles` —
 * keeps working. `roles` now contains the canonical role codes
 * (`admin` | `provider` | `verifier` | `sovereign` | …) returned by the
 * `/api/auth/me` envelope.
 */

export type Role = "admin" | "provider" | "verifier" | "sovereign";

export type AuthUser = {
  /** First word of the display name — kept for parity with the prior mock. */
  firstName: string;
  email: string;
  /** Effective role codes the user holds. */
  roles: string[];
  /** Provider linkage if any (provider portal targets, etc.). */
  provider: { id: string; slug: string; displayName: string } | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  /** True before the first /api/auth/me round-trip resolves. */
  loading: boolean;
  /** POST /api/auth/login → returns { ok, error? }. */
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  /** Force a re-fetch of the current session (e.g. after onboarding). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => ({ ok: false, error: "AuthProvider not mounted" }),
  logout: async () => {},
  refresh: async () => {}
});

type MeResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    provider: { id: string; slug: string; displayName: string } | null;
  } | null;
};

function firstNameFrom(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return "";
  return trimmed.split(/\s+/)[0];
}

async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch(withBase("/api/auth/me"), { credentials: "same-origin" });
    if (!res.ok) return null;
    const data = (await res.json()) as MeResponse;
    if (!data.user) return null;
    return {
      firstName: firstNameFrom(data.user.name) || data.user.email.split("@")[0],
      email: data.user.email,
      roles: data.user.roles,
      provider: data.user.provider
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await fetchMe();
    setUser(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch(withBase("/api/auth/login"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email, password })
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) return { ok: false, error: data.error ?? "Login failed." };
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    try {
      await fetch(withBase("/api/auth/logout"), { method: "POST", credentials: "same-origin" });
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
