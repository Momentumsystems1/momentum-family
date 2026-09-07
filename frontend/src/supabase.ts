// Supabase client — single source of truth for auth and data (option B).
// Session tokens live in secure storage (Keychain / EncryptedSharedPreferences on
// native, guarded storage on web) through the app's storage singleton, which
// JSON-round-trips strings correctly for supabase-js.
import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

import { storage } from "@/src/utils/storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const secureStorageAdapter = {
  getItem: (key: string) => storage.secureGet<string | null>(key, null),
  setItem: (key: string, value: string) => storage.secureSet(key, value).then(() => undefined),
  removeItem: (key: string) => storage.secureRemove(key).then(() => undefined),
};

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
