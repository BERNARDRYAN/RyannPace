import 'server-only';
import { cookies } from 'next/headers';

/**
 * Strava OAuth + API helpers for the BFF.
 *
 * Tokens never reach the browser: they are encrypted with AES-GCM (key derived
 * from STRAVA_TOKEN_SECRET) and kept in an httpOnly cookie. Activities are
 * fetched on demand and returned to the studio; nothing from Strava is stored.
 */

const STRAVA_OAUTH = 'https://www.strava.com/oauth';
const STRAVA_API = 'https://www.strava.com/api/v3';
export const SESSION_COOKIE = 'rp-strava';
export const STATE_COOKIE = 'rp-strava-state';
/** Strava access tokens last 6 h; the refresh token keeps the connection for 90 days. */
const SESSION_MAX_AGE = 90 * 24 * 60 * 60;

export interface StravaSession {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  athlete: { id: number; firstname: string | null };
}

function env() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const tokenSecret = process.env.STRAVA_TOKEN_SECRET;
  if (!clientId || !clientSecret || !tokenSecret || tokenSecret.length < 32) return null;
  return { clientId, clientSecret, tokenSecret };
}

export function isStravaConfigured(): boolean {
  return env() !== null;
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  // Lax: the cookie must survive the top-level redirect back from strava.com.
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge,
});

/* ---------- Encryption (AES-GCM, Web Crypto: works on Node and Cloudflare) ---------- */

const encoder = new TextEncoder();

async function key(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encrypts a session for the cookie. Exported for tests. */
export async function seal(session: StravaSession, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(secret), encoder.encode(JSON.stringify(session)));
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(data))}`;
}

/** Decrypts a cookie value; null when tampered or sealed with another secret. Exported for tests. */
export async function unseal(value: string, secret: string): Promise<StravaSession | null> {
  try {
    const [iv, data] = value.split('.');
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64Url(iv) },
      await key(secret),
      fromBase64Url(data)
    );
    return JSON.parse(new TextDecoder().decode(plain)) as StravaSession;
  } catch {
    // Tampered, truncated, or encrypted with an old secret: treat as signed out.
    return null;
  }
}

/* ---------- OAuth ---------- */

export function authorizeUrl(redirectUri: string, state: string): string {
  const e = env();
  if (!e) throw new Error('Strava is not configured.');
  const params = new URLSearchParams({
    client_id: e.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    // read_all so private runs are importable too; nothing is ever written to Strava.
    scope: 'activity:read_all',
    state,
  });
  return `${STRAVA_OAUTH}/authorize?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string };
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const e = env();
  if (!e) throw new Error('Strava is not configured.');
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: e.clientId, client_secret: e.clientSecret, ...body }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Strava token request failed (${res.status})`);
  return (await res.json()) as TokenResponse;
}

export async function exchangeCode(code: string): Promise<StravaSession> {
  const t = await tokenRequest({ code, grant_type: 'authorization_code' });
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: t.expires_at,
    athlete: { id: t.athlete?.id ?? 0, firstname: t.athlete?.firstname ?? null },
  };
}

/* ---------- Session cookie ---------- */

export async function saveSession(session: StravaSession): Promise<void> {
  const e = env();
  if (!e) return;
  const store = await cookies();
  store.set(SESSION_COOKIE, await seal(session, e.tokenSecret), cookieOptions(SESSION_MAX_AGE));
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The current connection, refreshed if the access token expires within a minute. */
export async function getSession(): Promise<StravaSession | null> {
  const e = env();
  if (!e) return null;
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const session = await unseal(raw, e.tokenSecret);
  if (!session) return null;
  if (session.expiresAt - 60 > Date.now() / 1000) return session;
  try {
    const t = await tokenRequest({ refresh_token: session.refreshToken, grant_type: 'refresh_token' });
    const refreshed: StravaSession = {
      ...session,
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: t.expires_at,
    };
    await saveSession(refreshed);
    return refreshed;
  } catch {
    // Revoked on Strava's side, or the refresh token expired.
    await clearSession();
    return null;
  }
}

export async function stravaGet<T>(session: StravaSession, path: string): Promise<T> {
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
  });
  if (res.status === 429) throw new StravaError(429, 'Strava rate limit reached. Try again in 15 minutes.');
  if (res.status === 401) throw new StravaError(401, 'Your Strava connection expired. Connect again.');
  if (res.status === 404) throw new StravaError(404, 'Activity not found on Strava.');
  if (!res.ok) throw new StravaError(502, 'Strava did not respond. Try again shortly.');
  return (await res.json()) as T;
}

export async function deauthorize(session: StravaSession): Promise<void> {
  await fetch(`${STRAVA_OAUTH}/deauthorize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
  }).catch(() => undefined);
}

export class StravaError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
