import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

export type BrowserSupabaseClient = SupabaseClient;

export function createBrowserSupabaseClient(url: string, anonKey: string) {
  if (url === 'http://mock.local') {
    let session: Session | null = null;
    const listeners = new Set<(nextSession: Session | null) => void>();
    try {
      const stored = window.localStorage.getItem('portico-mock-session');
      session = stored ? (JSON.parse(stored) as Session) : null;
    } catch {
      session = null;
    }
    const mockClient = {
      auth: {
        async getSession() {
          return { data: { session }, error: null };
        },
        onAuthStateChange(callback: (_event: string, nextSession: Session | null) => void) {
          listeners.add((nextSession) => callback(nextSession ? 'SIGNED_IN' : 'SIGNED_OUT', nextSession));
          return { data: { subscription: { unsubscribe: () => listeners.clear() } } };
        },
        async setSession(nextSession: { access_token: string; refresh_token: string }) {
          const user = nextSession.access_token.includes('mock-admin-1')
            ? {
                id: 'mock-admin-1',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'admin@usuarios.portico.app',
                user_metadata: { username: 'admin', full_name: 'Administrador da recepção', role: 'admin' },
                app_metadata: {},
                created_at: new Date().toISOString(),
              }
            : {
                id: nextSession.access_token.replace('mock-token-', ''),
                aud: 'authenticated',
                role: 'authenticated',
                email: 'usuario@usuarios.portico.app',
                user_metadata: { username: 'usuario', full_name: 'Usuário da recepção', role: 'user' },
                app_metadata: {},
                created_at: new Date().toISOString(),
              };
          session = { ...nextSession, user } as unknown as Session;
          window.localStorage.setItem('portico-mock-session', JSON.stringify(session));
          listeners.forEach((listener) => listener(session));
          return { data: { session }, error: null };
        },
        async signOut() {
          session = null;
          window.localStorage.removeItem('portico-mock-session');
          listeners.forEach((listener) => listener(null));
          return { error: null };
        },
      },
    };
    return mockClient as unknown as BrowserSupabaseClient;
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export type { Session };