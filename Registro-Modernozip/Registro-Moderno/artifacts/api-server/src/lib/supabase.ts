import { createClient } from "@supabase/supabase-js";

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim().replace(/^["']|["']$/g, "");
  if (!value) throw new Error(`${name} must be configured in the server environment.`);
  return value;
}

const url = requiredEnvironmentValue("SUPABASE_URL").replace(/\/+$/, "");
const serviceRoleKey = requiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY");

if (!/^https?:\/\//i.test(url)) {
  throw new Error(
    "SUPABASE_URL must be an HTTP(S) project URL.",
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
  const anonKey = requiredEnvironmentValue("SUPABASE_ANON_KEY");
  return { url, anonKey };
}