import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !/^https?:\/\//i.test(url) || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL must be an HTTP(S) project URL and SUPABASE_SERVICE_ROLE_KEY must be configured.",
  );
}

// The API only uses Supabase Auth and PostgREST. Avoid initializing a
// WebSocket transport on Node 20, where native WebSocket is unavailable.
class DisabledWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readyState = DisabledWebSocket.CLOSED;
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

export const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: DisabledWebSocket as never,
  },
});

export function publicSupabaseConfig() {
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY must be configured.");
  return { url, anonKey };
}