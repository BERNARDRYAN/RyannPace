import 'server-only';

export interface AuthProviders {
  google: boolean;
}

let cached: { value: AuthProviders; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

/**
 * Which social sign-ins are switched on in Supabase (Authentication → Providers),
 * so the UI only shows buttons that work. Reads Supabase's public settings
 * endpoint and caches the answer for five minutes.
 */
export async function getAuthProviders(): Promise<AuthProviders> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  let value: AuthProviders = { google: false };
  if (url && key) {
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/settings`, {
        headers: { apikey: key },
        cache: 'no-store',
      });
      if (res.ok) {
        const settings = (await res.json()) as { external?: Record<string, boolean> };
        value = { google: settings.external?.google === true };
      }
    } catch {
      // Network hiccup: hide social buttons rather than show a broken one.
    }
  }
  cached = { value, at: Date.now() };
  return value;
}
