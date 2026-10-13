import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, clientMeta, loadTokens, saveTokens } from "@/src/api";
import { getSupabase } from "@/src/supabase";
import { storage } from "@/src/utils/storage";

export type User = {
  id: string;
  email: string;
  language: string;
  plan: string;
  account_role: string;
  profile: { name: string; surname?: string | null } | null;
  avatar: { color: string; symbol: string; outline: string; photo_url?: string | null };
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

type LoginResult = { access_token: string; refresh_token: string; user: User };
const AuthContext = createContext<Ctx | null>(null);
export const ONBOARDING_KEY = "sentinel.onboarding";
const USE_SUPABASE = process.env.EXPO_PUBLIC_AUTH_BACKEND === "supabase";

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

  const reload = useCallback(async (): Promise<User | null> => {
    try {
      if (USE_SUPABASE) {
        const sb = getSupabase();
        if (!sb) throw new Error("Supabase no configurado");
        const { data } = await sb.auth.getSession();
        if (!data.session) {
          await saveTokens(null);
          setUser(null);
          return null;
        }
        await saveTokens({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } else if (!(await loadTokens())) {
        setUser(null);
        return null;
      }
      const me = await api<User>("/auth/me");
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
    if (!USE_SUPABASE) return;
    const sb = getSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (session) {
        void saveTokens({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      } else if (event === "SIGNED_OUT") {
        void saveTokens(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [reload]);

  const afterSupabaseSession = async (): Promise<User> => {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase no configurado");
    const { data } = await sb.auth.getSession();
    if (!data.session) throw new Error("No se pudo crear la sesión");
    await saveTokens({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    const me = await api<User>("/auth/me");
    setUser(me);
    return me;
  };

  const localAuth = async (path: "/auth/login" | "/auth/register", email: string, password: string) => {
    const response = await api<LoginResult>(path, {
      method: "POST",
      auth: false,
      json: { email, password, ...clientMeta },
    });
    await saveTokens({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
    });
    setUser(response.user);
    return response.user;
  };

  const value = useMemo<Ctx>(() => ({
    user, loading, reload, setUser,
    signIn: async (email, password) => {
      if (!USE_SUPABASE) return localAuth("/auth/login", email, password);
      const sb = getSupabase();
      if (!sb) throw new Error("Faltan las credenciales de Supabase");
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(friendlyAuthError(error.message));
      return afterSupabaseSession();
    },
    register: async (email, password) => {
      if (!USE_SUPABASE) return localAuth("/auth/register", email, password);
      const sb = getSupabase();
      if (!sb) throw new Error("Faltan las credenciales de Supabase");
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw new Error(friendlyAuthError(error.message));
      if (!data.session) throw new Error("Confirma tu email antes de entrar");
      return afterSupabaseSession();
    },
    signOut: async () => {
      const tokens = await loadTokens();
      if (USE_SUPABASE) {
        await getSupabase()?.auth.signOut().catch(() => null);
      } else if (tokens?.refresh_token) {
        await api("/auth/logout", {
          method: "POST",
          json: { refresh_token: tokens.refresh_token },
        }).catch(() => null);
      }
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
