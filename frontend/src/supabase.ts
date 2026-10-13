// Optional Supabase client. FastAPI is the default authentication backend.
// No network or client initialization is attempted when credentials are absent.
import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { storage } from "@/src/utils/storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const secureStorageAdapter = {
  getItem: (key: string) => storage.secureGet<string | null>(key, null),
  setItem: (key: string, value: string) => storage.secureSet(key, value).then(() => undefined),
  removeItem: (key: string) => storage.secureRemove(key).then(() => undefined),
};

export const supabaseConfigured = Boolean(url && anonKey);
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        storage: secureStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
