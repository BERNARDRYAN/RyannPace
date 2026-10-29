import { NextResponse, type NextRequest } from 'next/server';

/**
 * Fallback for the manifest share target when the service worker isn't active
 * yet (public/sw.js normally answers this on the device). The body is never
 * read: we just send the visitor to the studio to pick the file by hand.
 */
export function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/studio?shared=error', request.url), 303);
}
