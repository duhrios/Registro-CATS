import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

export type BrowserSupabaseClient = SupabaseClient;

export function createBrowserSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export type { Session };