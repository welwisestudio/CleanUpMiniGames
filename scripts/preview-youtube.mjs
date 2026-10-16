// Serves a YouTube build under the CSP the YouTube host applies (see vite.config.js YT_CSP).
// Usage: node scripts/preview-youtube.mjs        → dist-youtube/    on http://127.0.0.1:4174
//        node scripts/preview-youtube.mjs --qa   → dist-youtube-qa/ on http://127.0.0.1:4175
import { preview } from 'vite';

process.env.PLATFORM_PROFILE = 'youtube';
if (process.argv.includes('--qa')) process.env.PLATFORM_QA = '1';
const server = await preview();
server.printUrls();
