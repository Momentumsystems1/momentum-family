import { Platform } from "react-native";

import { supabase } from "@/src/supabase";
import { storage } from "@/src/utils/storage";

export const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
const TOKENS_KEY = "sentinel.tokens";

export type Tokens = { access_token: string; refresh_token: string };
export type UnavailableDetail = {
  code: "PLAN_UNAVAILABLE" | "SERVICE_NOT_CONFIGURED";
  title: string;
  reason: string;
  capability?: string;
};

export class ApiError extends Error {
  status: number;
  detail: any;
  constructor(status: number, detail: any) {
    super(typeof detail === "string" ? detail : detail?.reason || detail?.title || "Error de red");
    this.status = status;
    this.detail = detail;
  }
}

export function unavailableOf(e: unknown): UnavailableDetail | null {
  if (e instanceof ApiError && e.detail && typeof e.detail === "object" &&
    (e.detail.code === "PLAN_UNAVAILABLE" || e.detail.code === "SERVICE_NOT_CONFIGURED")) {
    return e.detail as UnavailableDetail;
  }
  return null;
}

let access: string | null = null;

export async function loadTokens(): Promise<Tokens | null> {
  const raw = await storage.secureGet<string | null>(TOKENS_KEY, null);
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as Tokens;
    access = t.access_token;
    return t;
  } catch {
    return null;
  }
}

export async function saveTokens(t: Tokens | null) {
  access = t?.access_token ?? null;
  if (t) await storage.secureSet(TOKENS_KEY, JSON.stringify(t));
  else await storage.secureRemove(TOKENS_KEY);
}

async function parse(r: Response) {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function refresh(): Promise<boolean> {
  // Supabase owns the session lifecycle; ask it for a fresh access token.
  const t = await loadTokens();
  if (!t) return false;
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: t.refresh_token });
  if (error || !data.session) {
    await saveTokens(null);
    return false;
  }
  await saveTokens({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  return true;
}

export async function api<T = any>(path: string, init: RequestInit & { json?: any; auth?: boolean } = {}): Promise<T> {
  const { json, auth = true, ...rest } = init;
  const headers: Record<string, string> = { ...(rest.headers as any), "Content-Type": "application/json" };
  const doFetch = async () => {
    if (auth && access) headers.Authorization = `Bearer ${access}`;
    return fetch(`${BASE}${path}`, { ...rest, headers, body: json !== undefined ? JSON.stringify(json) : rest.body });
  };
  let r: Response;
  try {
    r = await doFetch();
    if (r.status === 401 && auth && (await refresh())) r = await doFetch();
  } catch {
    throw new ApiError(0, "Sin conexión. Comprueba tu red e inténtalo de nuevo.");
  }
  const body = await parse(r);
  if (!r.ok) throw new ApiError(r.status, body?.detail ?? body);
  return body as T;
}

export const clientMeta = { platform: Platform.OS, app_version: "1.0.0", language: "es" };
