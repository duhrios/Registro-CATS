import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !/^https?:\/\//i.test(url) || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL must be an HTTP(S) project URL and SUPABASE_SERVICE_ROLE_KEY must be configured.",
  );
}

export const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function publicSupabaseConfig() {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY must be configured.");
  return { url, anonKey };
}