import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Defaults are right for RyannPace: no ISR cache or image optimization needed
// (posters render in the browser; pages are static or small API routes).
export default defineCloudflareConfig();
