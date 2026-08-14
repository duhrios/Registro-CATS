import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

export type BrowserSupabaseClient = SupabaseClient;

const browserClients = new Map<string, BrowserSupabaseClient>();

export function createBrowserSupabaseClient(url: string, anonKey: string) {
  const cacheKey = `${url}:${anonKey}`;
  const existingClient = browserClients.get(cacheKey);
  if (existingClient) return existingClient;

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'recepcao-supabase-auth',
    },
  });
  browserClients.set(cacheKey, client);
  return client;
}

export type { Session };