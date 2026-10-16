# YouTube Playables integration (Step 11, 2026-10-15)

Release build: **#168** (2026-10-16 23:02 UTC), `dist-youtube/` (profile `youtube-playables`), built from the #164 game state with the approved adapter unchanged. ZIP for the YouTube test: `CleanUpMiniGames_release/CleanUpMiniGames_youtube_build168.zip` (1059 files, 19,157,649 bytes unpacked, 18,134,534 bytes zipped). Previous: #139.
Sources: `platform/YOUTUBE-PLAYABLES.md` and `platform/SDK-CONTRACT.md`. The official SDK reference, integration requirements and the SDK Test Suite guide CSP were re-checked on 2026-10-15.

## Architecture

- `src/platform/youtube/YouTubePlatform.js` is the only module that uses `ytgame`, together with the entrypoint `src/main.youtube.js`. It implements the shared platform contract, so game code never sees the SDK. It is injectable (`createYouTubePlatform({ sdk })`) for contract tests.
- **Profiles are picked by the build, never at runtime:**

  | Command | Output | Contents |
  |---|---|---|
  | `npm run build` | `dist/` | dev adapter, TEST MODE |
  | `npm run build:youtube` | `dist-youtube/` | YouTube release |
  | `npm run build:youtube-qa` | `dist-youtube-qa/` | YouTube + read-only QA snapshot, for automated mock tests only |

  A missing SDK never switches to the mock. The release bundle contains no dev adapter, no mock and no `__cleanupQA`.
- **YouTube profile build steps (`vite.config.js`):**
  - `<script src="https://www.youtube.com/game_api/v1">` is placed right after `<meta charset>`, before any game code.
  - The entry switches to `main.youtube.js`.
  - Phaser's `VisibilityHandler(this)` (Page Visibility + `window.onblur/onfocus`) is removed from the bundled engine. The build fails if the match count is not exactly 1, or if the engine file was not transformed. node_modules is not edited.
- No inline scripts or styles: page CSS is in `src/styles.css`.

## Start order and start errors

1. The index loads the SDK, then the game module.
2. Phaser renders the loading screen. On its first rendered frame the game calls `firstFrameReady()`.
3. The game reads `loadData()` (15 s timeout), then parses, checks the version, migrates, and only then allows writes.
4. Assets finish loading, the menu is created and becomes interactive, then the game calls `gameReady()` (once).

Separate error screens:

| Error | Message | Action |
|---|---|---|
| SDK missing | "Could not connect to YouTube" | reload |
| Cloud read failed | "Could not load your progress" | Retry re-reads the cloud save; no write happens before success |
| Game file failed to load | "Some game files could not be loaded" | reload |
| Engine start failed | "The game could not start on this device" | reload |

A failing optional font is not an error.

## Progress: cloud only

- **Storage:** the release saves only through `saveData`. There is no localStorage, sessionStorage or IndexedDB fallback; the game runs with all three blocked. Phaser only feature-checks `localStorage.getItem` once at boot and stores nothing.
- **Empty data:** `''`, whitespace, `{}` and `null` mean no progress yet.
- **Load errors:** a non-string result (e.g. `undefined`), a reject, a timeout, corrupt JSON or a newer save version are errors. They show Retry; nothing is written and no fresh save is created.
- **Writes:** `saveData` is refused until `loadData` has succeeded, both in the adapter and in SaveService. Writes go through one sequential queue, and each write sends the current state, so an older snapshot can never overwrite a newer one.
- **Save size:** checked before sending, as UTF-16 (`length×2`) and as UTF-8; the hard stop is 2.5 MiB (platform limit 3 MiB). A current save is a few KB.
- **Migrations keep everything earned:** v1 → v4 keeps coins, diamonds, completed levels, tools, chests and Store/Wheel progress. Old diamond-VIP purchases stay accessible.
- **Host pause:** the current progress is flushed to the cloud.

## Lifecycle and sound

- **Initial state:** `isAudioEnabled()` sets the starting audio state; `onAudioEnabledChange`, `onPause` and `onResume` are registered once.
- **Host pause:** stops everything. The Phaser loop sleeps, so there is no update, rendering, tweens, timers or input. Music and effects stop, and progress is flushed.
- **Host resume:** wakes the loop and lifts only the host pause. A pause the player opened stays open (tested).
- **YouTube mute has priority:** when YouTube is muted, no audio plays, whatever the in-game Music / Sound toggles say. Those toggles only act while YouTube is unmuted. There is no overall in-game mute button.

## Rewarded ads

`requestRewardedAd(rewardId)`:

| SDK response | Result |
|---|---|
| `true` | earned — the reward is applied once |
| `false` | not earned — nothing |
| reject `API_UNAVAILABLE` | unavailable — nothing |
| other reject | error — nothing |

- One request at a time; a second request returns unavailable.
- A result that arrives during a host pause is applied only after resume.
- Stable rewardIds, one per reward type, with no user data: `reward-boost`, `chest-progress`, `level-unlock`, `vip-unlock`, `tool-unlock`, `wheel-spin`, `store-reward-gems`, `store-reward-coins`, `store-reward-chest`, `store-reward-bundle-coins`, `store-reward-bundle-mixed`, `store-reward-bundle-mega`.

## Interstitials

- **Signal:** `requestInterstitialAd()` only resolves when the REQUEST completes. There is no impression signal, so the result is named `request-completed` and never treated as "ad shown".
- **Interval rule (`InterstitialService`, `INTERSTITIAL` in `src/content/platformConfig.js`):**
  - never in the first 2 minutes of a session;
  - at least 2 minutes after the last completed request; a rejected request does not reset the timer;
  - never within 1 minute after a rewarded ad;
  - never while paused.
- **Status:** not placed anywhere and disabled; placements (for example Result → Home) need the designer's approval.

## Score — needs approval

Proposal: the number of different levels completed at least once (0–50). Replays don't raise it. It is computed from the cloud save, so the best score sent always matches the save. It is sent only after the completion is saved, with no duplicate sends. Built in `ScoreService` but disabled (`SCORE.enabled = false`) until approved.

## Checks performed (local, mock SDK; the real platform is checked separately)

- **Unit tests:** 94 pass, including 12 adapter contract tests:
  - initial mute; pause, resume, unsubscribe, dispose;
  - first-frame/game-ready order and once-only;
  - load success, empty, reject, timeout, non-string;
  - save before load, success, reject, size guard;
  - SaveService never writes after a failed read; corrupt and newer-version data block writes; v3 migration keeps everything earned;
  - rewarded true / false / unavailable / error; id validation; concurrent requests; result held during a host pause;
  - interstitial without impression; score validation and errors; language fallback;
  - interstitial pacing rules.
- **Production builds under the YouTube CSP, with a lexical mock SDK (`ytgame` not on `window`) and browser storages blocked** — `tests/e2e-youtube/`, `playwright.youtube.config.js`, 10/10 on desktop and phone:
  - **Release build:**
    - SDK script first; no inline scripts or styles;
    - order `firstFrameReady → loadData → gameReady`, with every `saveData` after `loadData`;
    - no CSP violations by the game;
    - no Page Visibility or lifecycle listeners and no `window.onblur/onfocus` (the only such listeners on the test machine come from its Kaspersky antivirus injection);
    - no QA hook; no score sent;
    - initial bundle before `gameReady`: 4.85 MB;
    - load reject → Retry → recovered, and the earned coins were kept;
    - corrupt JSON, `undefined` and a newer version → Retry with no writes;
    - missing SDK → its own error.
  - **Mock-test build:**
    - a v3 save migrates and keeps coins, diamonds and the old VIP purchase;
    - host pause freezes the canvas (identical screenshots 1.5 s apart), stops the music and flushes to the cloud;
    - host resume keeps the player's own pause;
    - YouTube mute wins over the in-game settings;
    - rewarded pays only on `true`, and the reward lands in the cloud save.
- **Bundle (ZIP):**
  - 1069 files, 19,777,959 bytes unpacked, 18,515,945 bytes zipped;
  - file names match the analyzer pattern; no file ≥ 30 MiB; `index.html` at the root;
  - above the 512 KiB recommendation (SHOULD): `phaser-*.js` (1.2 MB) and `music-main.ogg` (593 KB).

## Real SDK: still to do on the platform

See `project/YOUTUBE-TEST.md`. Not verified locally:
- the real SDK and the real CSP of the host;
- the real cloud account;
- ad availability, monetization settings in the portal;
- Ogg audio on iOS.
