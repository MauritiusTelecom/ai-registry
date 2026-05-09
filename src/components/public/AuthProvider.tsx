"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode
} from "react";

// Mocked auth context — mirrors the prototype's AuthProvider so the public
// portal can demo role-aware UI affordances. Real auth lives in Phase 2.

export type Role = "admin" | "provider" | "verifier" | "sovereign";

export type MockUser = {
  firstName: string;
  email: string;
  roles: Role[];
};

const PROFILES: Record<string, MockUser> = {
  admin: {
    firstName: "John",
    email: "john@gov.mu",
    roles: ["admin", "provider", "verifier", "sovereign"]
  },
  provider: { firstName: "Aisha", email: "aisha@anthropic.com", roles: ["provider"] },
  member: { firstName: "Marc", email: "marc@example.com", roles: [] }
};

type AuthContextValue = {
  user: MockUser | null;
  login: (preset?: keyof typeof PROFILES) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);

  const login = useCallback((preset: keyof typeof PROFILES = "admin") => {
    setUser(PROFILES[preset] ?? PROFILES.member);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
