// Entrypoint for the DEVELOPMENT platform profile (Steps 2–10).
// The YouTube Playables profile gets its own entrypoint and adapter at Step 11.
// Local fonts (OFL, bundled by Vite — no runtime font CDN).
import '@fontsource/rubik/800.css';
import '@fontsource/rubik/900.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import { createDevPlatform } from './platform/dev/DevPlatform.js';
import { createApp } from './app/App.js';

const params = new URLSearchParams(window.location.search);
const platform = createDevPlatform({ storage: params.get('devStorage') === 'local' ? 'local' : 'memory' });

try {
  createApp({ platform, parent: 'game' });
} catch (e) {
  const el = document.getElementById('fatal');
  el.style.display = 'flex';
  el.textContent = `Startup error: ${e.message}`;
  throw e;
}
