export const AUTH_NEXT_COOKIE = 'rp-auth-next';

/** Raw nonce for Google sign-in; its SHA-256 goes into Google's ID token. */
export const GOOGLE_NONCE_COOKIE = 'rp-google-nonce';

/** Pages a magic link may return to. A fixed list rules out open redirects. */
const ALLOWED_NEXT_PATHS = ['/', '/studio', '/gallery'] as const;

export function safeNextPath(value: unknown): string {
  return typeof value === 'string' && (ALLOWED_NEXT_PATHS as readonly string[]).includes(value)
    ? value
    : '/studio';
}
