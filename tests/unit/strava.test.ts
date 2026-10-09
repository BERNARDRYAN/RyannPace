import { beforeAll, describe, expect, it } from 'vitest';
import { authorizeUrl, seal, unseal, type StravaSession } from '@/lib/strava';

const session: StravaSession = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  expiresAt: 1_900_000_000,
  athlete: { id: 42, firstname: 'Ryan' },
};
const SECRET = 'x'.repeat(40);

beforeAll(() => {
  process.env.STRAVA_CLIENT_ID = '12345';
  process.env.STRAVA_CLIENT_SECRET = 'client-secret';
  process.env.STRAVA_TOKEN_SECRET = SECRET;
});

describe('Strava token cookie', () => {
  it('round-trips through AES-GCM without exposing the tokens', async () => {
    const sealed = await seal(session, SECRET);
    expect(sealed).not.toContain('access-123');
    expect(sealed).not.toContain('refresh-456');
    expect(await unseal(sealed, SECRET)).toEqual(session);
  });

  it('uses a fresh IV every time', async () => {
    expect(await seal(session, SECRET)).not.toBe(await seal(session, SECRET));
  });

  it('rejects tampered values and other secrets', async () => {
    const sealed = await seal(session, SECRET);
    const [iv, data] = sealed.split('.');
    const flipped = `${iv}.${data.slice(0, -2)}${data.endsWith('A') ? 'B' : 'A'}${data.slice(-1)}`;
    expect(await unseal(flipped, SECRET)).toBeNull();
    expect(await unseal(sealed, 'y'.repeat(40))).toBeNull();
    expect(await unseal('garbage', SECRET)).toBeNull();
  });
});

describe('authorizeUrl', () => {
  it('requests read-only activity access with the state value', () => {
    const url = new URL(authorizeUrl('https://example.com/api/strava/callback', 'state-abc'));
    expect(url.origin + url.pathname).toBe('https://www.strava.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('12345');
    expect(url.searchParams.get('scope')).toBe('activity:read_all');
    expect(url.searchParams.get('state')).toBe('state-abc');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/api/strava/callback');
    expect(url.toString()).not.toContain('client-secret');
  });
});
