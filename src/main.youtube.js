// Entrypoint for the YOUTUBE PLAYABLES profile (Step 11). Built with `npm run build:youtube`:
// the index loads https://www.youtube.com/game_api/v1 BEFORE this module (vite youtube profile),
// progress lives only in the YouTube cloud save, ads / score / lifecycle come from the SDK.
// No dev adapter, mock or QA hook is part of this bundle.
import './fonts.css'; // Latin-only WOFF2 (size pass 2026-10-16)
import './styles.css';
import { createYouTubePlatform, PlatformStartError } from './platform/youtube/YouTubePlatform.js';
import { createApp } from './app/App.js';

// Separate start errors (each with its own message): SDK missing ≠ save read error (handled by
// App with a Retry that re-reads the cloud save) ≠ asset load error (Boot) ≠ engine start error.
function fatal(message, retry) {
  const el = document.getElementById('fatal');
  el.style.display = 'flex';
  el.textContent = '';
  const p = document.createElement('p');
  p.textContent = message;
  el.append(p);
  if (retry) {
    const b = document.createElement('button');
    b.textContent = 'Retry';
    b.addEventListener('click', retry, { once: true });
    el.append(b);
  }
}

let platform;
try {
  platform = createYouTubePlatform();
} catch (e) {
  if (e instanceof PlatformStartError) fatal('Could not connect to YouTube. Please try again.', () => window.location.reload());
  else fatal(`Startup error: ${e.message}`);
  throw e;
}

try {
  createApp({ platform, parent: 'game' });
} catch (e) {
  platform.reportError();
  fatal('The game could not start on this device.', () => window.location.reload());
  throw e;
}
