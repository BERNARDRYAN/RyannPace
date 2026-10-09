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
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
