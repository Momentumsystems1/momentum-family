import { api, clientMeta, loadTokens, saveTokens } from "@/src/api";
import { getSupabase, isSupabaseConfigured } from "@/src/lib/supabase";

// NG2 — Adaptador de backend de autenticación.
// Envuelve las llamadas JWT actuales (FastAPI de K300) y deja preparado Supabase.
// Se selecciona con EXPO_PUBLIC_AUTH_BACKEND ("fastapi" por defecto).
// Las pantallas no cambian: hablan con AuthProvider, que delega aquí.

export type AuthResult = { access_token: string; refresh_token: string; user: any };

export interface AuthBackend {
  signIn(email: string, password: string): Promise<AuthResult>;
  register(email: string, password: string): Promise<AuthResult>;
  signOut(refreshToken: string | null): Promise<void>;
  me(): Promise<any | null>;
}

const fastapiBackend: AuthBackend = {
  signIn: (email, password) =>
    api("/auth/login", { method: "POST", auth: false, json: { email, password, ...clientMeta } }),
  register: (email, password) =>
    api("/auth/register", { method: "POST", auth: false, json: { email, password, ...clientMeta } }),
  signOut: async (refreshToken) => {
    if (refreshToken) {
      await api("/auth/logout", { method: "POST", json: { refresh_token: refreshToken } }).catch(() => null);
    }
  },
  me: async () => {
    const t = await loadTokens();
    if (!t) return null;
    return api("/auth/me");
  },
};

// Supabase: infraestructura lista. El mapeo de perfil de usuario (plan, avatar,
// onboarding) queda pendiente del contrato de tablas de K300 — hasta entonces
// este backend devuelve el usuario crudo de Supabase Auth.
const supabaseBackend: AuthBackend = {
  signIn: async (email, password) => {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase no configurado");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? "Error de autenticación");
    // TODO(K300): enriquecer con fila de perfil cuando exista el contrato de tablas.
    return { access_token: data.session.access_token, refresh_token: data.session.refresh_token, user: data.user };
  },
  register: async (email, password) => {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase no configurado");
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? "Error de registro");
    return { access_token: data.session.access_token, refresh_token: data.session.refresh_token, user: data.user };
  },
  signOut: async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut().catch(() => null);
  },
  me: async () => {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session?.user ?? null;
  },
};

/** Backend activo. Por defecto FastAPI: comportamiento idéntico al actual. */
export function getAuthBackend(): AuthBackend {
  if (process.env.EXPO_PUBLIC_AUTH_BACKEND === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error("EXPO_PUBLIC_AUTH_BACKEND=supabase pero faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY");
    }
    return supabaseBackend;
  }
  return fastapiBackend;
}

export { loadTokens, saveTokens };
