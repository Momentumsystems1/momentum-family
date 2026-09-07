import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, saveTokens } from "@/src/api";
import { supabase } from "@/src/supabase";
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

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos";
  if (m.includes("already registered") || m.includes("already been registered")) return "Este email ya está registrado";
  if (m.includes("email not confirmed")) return "Confirma tu email antes de entrar";
  if (m.includes("password")) return "La contraseña no cumple los requisitos";
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        await saveTokens(null);
        setUser(null);
        return null;
      }
      await saveTokens({ access_token: session.access_token, refresh_token: session.refresh_token });
      const me = await api<User>("/auth/me");
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Keep the API client's bearer token in sync with Supabase's own refresh cycle.
      if (session) void saveTokens({ access_token: session.access_token, refresh_token: session.refresh_token });
      else if (event === "SIGNED_OUT") void saveTokens(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  const afterSession = async (): Promise<User> => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) throw new Error("No se pudo crear la sesión");
    await saveTokens({ access_token: session.access_token, refresh_token: session.refresh_token });
    const me = await api<User>("/auth/me");
    setUser(me);
    return me;
  };

  const value = useMemo<Ctx>(() => ({
    user, loading, reload, setUser,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(friendlyAuthError(error.message));
      return afterSession();
    },
    register: async (email, password) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(friendlyAuthError(error.message));
      return afterSession();
    },
    signOut: async () => {
      await supabase.auth.signOut().catch(() => null);
      await saveTokens(null);
      await storage.removeItem(ONBOARDING_KEY);
      setUser(null);
    },
  }), [user, loading, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
