import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Server-side Supabase access for the BFF (app/api/* and app/auth/*). The URL
 * and key come from non-public env vars, so they never ship in the client
 * bundle; the `server-only` import makes any accidental client import a build
 * error.
 *
 * Sessions live in httpOnly, SameSite=Lax cookies written by @supabase/ssr.
 * The browser never sees a Supabase key or access token: it just calls our
 * own /api routes and the cookies ride along.
 */
function readEnv(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  // Values still copied from .env.example count as unset.
  if (url.includes('your-project-ref') || anonKey === 'your-anon-key') return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return readEnv() !== null;
}

/**
 * A per-request client bound to the caller's session cookies. Queries run as
 * the signed-in user, so Postgres Row Level Security scopes every read and
 * write to that user's rows. Refreshed tokens are written back as cookies.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const env = readEnv();
  if (!env) throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY).');
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

/** The verified user for this request (checked against Supabase Auth), or null. */
export async function getSessionUser(supabase: SupabaseClient): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

/**
 * Defense in depth against CSRF on cookie-authenticated writes: browsers
 * always send Origin on POST/DELETE, so a mismatched Origin means another
 * site is making the request. (SameSite=Lax cookies already block most of it.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Public base URL used in magic-link emails. SITE_URL pins it in production;
 * otherwise it follows the request (http://localhost:3000 in dev).
 */
export function siteOrigin(request: Request): string {
  const configured = process.env.SITE_URL?.replace(/\/+$/, '');
  return configured || new URL(request.url).origin;
}

export type AuthResult =
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; response: Response };

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Shared guard for user-data routes: Supabase configured, same-origin for
 * writes, and a verified session. On success, queries run as that user (RLS).
 */
export async function requireUser(
  request: Request,
  { mutating, feature }: { mutating: boolean; feature: string }
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, response: jsonError(503, `${feature} is not configured on this server.`) };
  }
  if (mutating && !isSameOrigin(request)) {
    return { ok: false, response: jsonError(403, 'Cross-site request rejected.') };
  }
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser(supabase);
  if (!user) return { ok: false, response: jsonError(401, 'Sign in to continue.') };
  return { ok: true, supabase, userId: user.id };
}
