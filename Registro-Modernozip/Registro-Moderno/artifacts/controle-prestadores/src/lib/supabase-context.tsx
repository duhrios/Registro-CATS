import { createContext, useContext, type ReactNode } from 'react';
import type { BrowserSupabaseClient } from './supabase';

const SupabaseContext = createContext<BrowserSupabaseClient | null>(null);

export function SupabaseProvider({
  client,
  children,
}: {
  client: BrowserSupabaseClient;
  children: ReactNode;
}) {
  return (
    <SupabaseContext.Provider value={client}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error('SupabaseProvider não foi configurado.');
  }
  return client;
}