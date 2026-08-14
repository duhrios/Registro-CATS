import { createClient } from "@supabase/supabase-js";

function requiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim().replace(/^["']|["']$/g, "");
  if (!value) throw new Error(`${name} must be configured in the server environment.`);
  return value;
}

const url = requiredEnvironmentValue("SUPABASE_URL").replace(/\/+$/, "");
const serviceRoleKey = requiredEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = requiredEnvironmentValue("SUPABASE_ANON_KEY");

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

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: DisabledWebSocket as never,
  },
};

// Keep the service-role client isolated from user sessions. Auth calls such as
// signInWithPassword mutate a Supabase client's session state; sharing that
// client with RLS-bypassing profile queries can make an admin profile appear
// missing immediately after login.
export const supabase = createClient(url, serviceRoleKey, clientOptions);

export function createAuthClient() {
  return createClient(url, anonKey, clientOptions);
}

export function publicSupabaseConfig() {
  return { url, anonKey };
}