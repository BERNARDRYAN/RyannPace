import type { MetadataRoute } from 'next';

/** Makes RyannPace installable ("Add to Home Screen") as a standalone app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RyannPace — Editorial Running Posters',
    short_name: 'RyannPace',
    description: 'Turn a GPX file from your watch into a magazine-grade running poster in seconds.',
    start_url: '/studio',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3f1ec',
    theme_color: '#141413',
    categories: ['sports', 'health', 'photo'],
    // Installed on Android, RyannPace appears in the share sheet for activity files.
    // public/sw.js catches the POST on the device, so the file is never uploaded.
    share_target: {
      action: '/share-target',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        files: [
          {
            name: 'activity',
            accept: [
              '.gpx',
              '.fit',
              '.tcx',
              'application/gpx+xml',
              'application/vnd.garmin.tcx+xml',
              'application/vnd.ant.fit',
              'application/xml',
              'text/xml',
              'application/octet-stream',
            ],
          },
        ],
      },
    },
    shortcuts: [
      { name: 'New poster', url: '/studio' },
      { name: 'Monthly recap', url: '/recap' },
    ],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
