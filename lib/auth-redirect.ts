export const AUTH_NEXT_COOKIE = 'rp-auth-next';

/** Pages a magic link may return to. A fixed list rules out open redirects. */
const ALLOWED_NEXT_PATHS = ['/', '/studio', '/gallery'] as const;

export function safeNextPath(value: unknown): string {
  return typeof value === 'string' && (ALLOWED_NEXT_PATHS as readonly string[]).includes(value)
    ? value
    : '/studio';
}
