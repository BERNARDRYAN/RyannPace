import 'server-only';
import { NextResponse } from 'next/server';

export function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Reads a small JSON object body. Returns an error response instead of
 * throwing so route handlers can `if ('error' in result) return result.error`.
 */
export async function readJsonObject(
  request: Request,
  maxBytes: number
): Promise<{ body: Record<string, unknown> } | { error: NextResponse }> {
  const raw = await request.text();
  if (raw.length > maxBytes) return { error: errorResponse(413, 'Request body is too large.') };
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { error: errorResponse(400, 'Body must be valid JSON.') };
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: errorResponse(400, 'Body must be a JSON object.') };
  }
  return { body: body as Record<string, unknown> };
}
