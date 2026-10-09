import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase access for the BFF (app/api/*). The URL and key come
 * from non-public env vars, so they never ship in the client bundle; the
 * `server-only` import makes any accidental client import a build error.
 */
function readEnv(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return readEnv() !== null;
}

/**
 * A per-request client that acts as the signed-in user: the caller's access
 * token is forwarded on every query, so Postgres Row Level Security scopes all
 * reads and writes to that user's rows.
 */
export function createSupabaseForUser(accessToken: string): SupabaseClient {
  const env = readEnv();
  if (!env) throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY).');
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Extracts the bearer token from an Authorization header, if any. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
