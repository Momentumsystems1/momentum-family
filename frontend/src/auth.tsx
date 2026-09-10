import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { loadTokens, saveTokens } from "@/src/api";
import { getAuthBackend } from "@/src/lib/auth-backend";
import { storage } from "@/src/utils/storage";

export type User = {
  id: string;
  email: string;
  language: string;
  plan: string;
  account_role: string;
  profile: { name: string; surname?: string | null } | null;
  avatar: { color: string; symbol: string; outline: string };
  onboarding: { completed: boolean; step: string };
};

type Ctx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  reload: () => Promise<User | null>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<Ctx | null>(null);
export const ONBOARDING_KEY = "sentinel.onboarding";

export type LocalOnboarding = { step: string; terms_accepted_at?: string };

export async function getLocalOnboarding(): Promise<LocalOnboarding> {
  const raw = await storage.getItem<string | null>(ONBOARDING_KEY, null);
  if (!raw) return { step: "terms" };
  try {
    return JSON.parse(raw);
  } catch {
    return { step: "terms" };
  }
}

export async function setLocalOnboarding(patch: Partial<LocalOnboarding>) {
  const cur = await getLocalOnboarding();
  await storage.setItem(ONBOARDING_KEY, JSON.stringify({ ...cur, ...patch }));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const backend = useMemo(() => getAuthBackend(), []);

  const reload = useCallback(async () => {
    try {
      const me = await backend.me();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, [backend]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const handleTokens = async (res: any) => {
    await saveTokens({ access_token: res.access_token, refresh_token: res.refresh_token });
    setUser(res.user);
    return res.user as User;
  };

  const value = useMemo<Ctx>(() => ({
    user, loading, reload, setUser,
    signIn: async (email, password) => handleTokens(await backend.signIn(email, password)),
    register: async (email, password) => handleTokens(await backend.register(email, password)),
    signOut: async () => {
      const t = await loadTokens();
      await backend.signOut(t?.refresh_token ?? null);
      await saveTokens(null);
      await storage.removeItem(ONBOARDING_KEY);
      setUser(null);
    },
  }), [user, loading, reload, backend]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
