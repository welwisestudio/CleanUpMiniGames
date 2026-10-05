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
// Dev profile: the save survives page reloads (dev-only localStorage copy; `?devStorage=memory`
// starts clean every time). Rewarded ads are simulated: `?devAd=earned|not-earned|error|unavailable`
// fixes the result, default 'ask' shows a TEST AD dialog.
const platform = createDevPlatform({
  storage: params.get('devStorage') === 'memory' ? 'memory' : 'local',
  rewardedOutcome: params.get('devAd') ?? 'ask',
});

try {
  createApp({ platform, parent: 'game' });
} catch (e) {
  const el = document.getElementById('fatal');
  el.style.display = 'flex';
  el.textContent = `Startup error: ${e.message}`;
  throw e;
}
