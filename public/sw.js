/*
 * RyannPace service worker. Its only job is the Android share target: when an
 * activity file is shared to the installed app, the browser POSTs it to
 * /share-target. We catch that here, on the device, park the file in a
 * cache and open the studio, which picks it up. Nothing is sent to the server.
 * Every other request goes straight to the network (no offline caching).
 */
const SHARE_CACHE = 'rp-shared-file';
const SHARE_KEY = '/__shared-activity';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.origin !== self.location.origin || url.pathname !== '/share-target') {
    return;
  }
  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData();
        const file = form.getAll('activity').find((f) => f instanceof File);
        if (!file) return Response.redirect('/studio?shared=empty', 303);
        const cache = await caches.open(SHARE_CACHE);
        await cache.put(
          SHARE_KEY,
          new Response(file, { headers: { 'X-File-Name': encodeURIComponent(file.name || 'activity') } })
        );
        return Response.redirect('/studio?shared=1', 303);
      } catch {
        return Response.redirect('/studio?shared=error', 303);
      }
    })()
  );
});
