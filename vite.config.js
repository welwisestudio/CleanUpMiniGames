import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Build metadata is injected by scripts/build.mjs (production) or defaults (dev server).
const buildNumber = process.env.BUILD_NUMBER ?? 'dev';
const buildTime = process.env.BUILD_TIME ?? new Date().toISOString();

// Platform profile (Step 11): 'dev' (dev adapter, default) or 'youtube' (YouTube Playables).
// PLATFORM_QA=1 adds the read-only QA snapshot to a youtube build — ONLY for the automated
// mock-SDK test build (dist-youtube-qa); the release build (dist-youtube) never contains it.
const profile = process.env.PLATFORM_PROFILE === 'youtube' ? 'youtube' : 'dev';
const youtube = profile === 'youtube';
const qa = !youtube || process.env.PLATFORM_QA === '1';
const outDir = youtube ? (qa ? 'dist-youtube-qa' : 'dist-youtube') : 'dist';

export const YT_SDK_URL = 'https://www.youtube.com/game_api/v1';
// CSP the YouTube host applies (Playables SDK Test Suite guide, "Test http response headers",
// fetched 2026-10-15) — served by the youtube preview so local checks run under the same policy.
export const YT_CSP = [
  "default-src 'none'",
  "script-src 'report-sample' 'self' 'unsafe-eval' 'unsafe-inline' blob: https://www.youtube.com/game_api/v0 https://www.youtube.com/game_api/v0/ https://www.youtube.com/game_api/v1 https://www.youtube.com/game_api/v1/",
  "object-src 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",
  "connect-src 'self' blob: data:",
  'sandbox allow-pointer-lock allow-same-origin allow-scripts',
  "base-uri 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join('; ');

// YouTube profile: the SDK script goes first in <head> (before any game code) and the entry
// switches to src/main.youtube.js.
function youtubeIndex() {
  return {
    name: 'youtube-index',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes('/src/main.js')) throw new Error('youtube-index: entry script not found');
        return html
          .replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <script src="${YT_SDK_URL}"></script>`)
          .replace('/src/main.js', '/src/main.youtube.js');
      },
    },
  };
}

// YouTube profile: Phaser 3.90 registers Page Visibility + window blur/focus handlers at boot
// (`VisibilityHandler(this);` in Game.boot). Playables MUST pause / resume only via the SDK, so the
// one call is removed from the bundled engine. The build fails if the engine code changed (not
// exactly one match) — node_modules is never edited.
function stripPhaserVisibility() {
  let done = 0;
  return {
    name: 'strip-phaser-visibility',
    enforce: 'pre',
    transform(code, id) {
      // the engine's Game.boot (custom entry: phaser/src/core/Game.js)
      if (!/node_modules[\\/]phaser[\\/]src[\\/]core[\\/]Game\.js$/.test(id.split('?')[0])) return null;
      const needle = 'VisibilityHandler(this);';
      const n = code.split(needle).length - 1;
      if (n !== 1) throw new Error(`strip-phaser-visibility: expected exactly 1 "${needle}", found ${n} — check the Phaser version`);
      done += 1;
      return { code: code.replace(needle, '/* YouTube Playables: lifecycle only via SDK onPause / onResume */'), map: null };
    },
    buildEnd(err) {
      if (!err && done !== 1) throw new Error(`strip-phaser-visibility: the Phaser engine file was transformed ${done} times (expected 1)`);
    },
  };
}

// Phaser source modules (custom entry src/vendor/phaser-game.js) read build flags that Phaser's own
// webpack build replaces: WebGL + Canvas renderers and sound on; debug, experimental, camera3d and
// Facebook Instant plugins off.
function phaserFlags() {
  const on = /typeof (WEBGL_RENDERER|CANVAS_RENDERER|FEATURE_SOUND)\b/g;
  const off = /typeof (WEBGL_DEBUG|EXPERIMENTAL|PLUGIN_CAMERA3D|PLUGIN_FBINSTANT)\b/g;
  return {
    name: 'phaser-flags',
    enforce: 'pre',
    transform(code, id) {
      if (!/node_modules[\\/]phaser[\\/]src[\\/]/.test(id)) return null;
      if (!code.includes('typeof ')) return null;
      const out = code.replace(on, 'true').replace(off, 'false');
      return out === code ? null : { code: out, map: null };
    },
  };
}

export default defineConfig(({ command }) => ({
  // Relative asset paths: the build must work from any folder / platform host.
  base: './',
  plugins: youtube ? [phaserFlags(), youtubeIndex(), stripPhaserVisibility()] : [phaserFlags()],
  // the game imports 'phaser' → the size-trimmed custom entry (exact match only; phaser/src/* stays)
  // (builds only: the dev server pre-bundles the stock Phaser build, which has the same API)
  resolve: command === 'build' ? { alias: [{ find: /^phaser$/, replacement: fileURLToPath(new URL('./src/vendor/phaser-game.js', import.meta.url)) }] } : {},
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __BUILD_TIME__: JSON.stringify(buildTime),
    __PLATFORM_PROFILE__: JSON.stringify(profile),
    __QA__: JSON.stringify(qa),
    global: 'globalThis', // Phaser source modules (custom entry) assign global.Phaser
  },
  build: {
    target: 'es2020',
    outDir,
    emptyOutDir: true,
    // Phaser alone is ~1.2 MB minified; it is split into its own chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') || id.includes('src/vendor/phaser') ? 'phaser' : undefined),
      },
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
  preview: youtube
    ? { host: '127.0.0.1', port: qa ? 4175 : 4174, strictPort: true, headers: { 'Content-Security-Policy': YT_CSP } }
    : { host: '127.0.0.1', port: 4173, strictPort: true },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
}));
