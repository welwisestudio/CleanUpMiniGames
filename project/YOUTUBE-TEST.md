# Real-platform check (SDK Test Suite + Developer Portal)

The local checks used a mock SDK. The real SDK is a no-op when the game is served locally, so these steps are required.

## 1. Official SDK Test Suite (local build, real SDK)

1. Start the YouTube release preview with `npm run build:youtube`, then `npm run preview:youtube`. It serves `dist-youtube/` at http://127.0.0.1:4174 with the YouTube CSP header already applied: the string from the Test Suite guide ("Test http response headers"), so no DevTools override is needed.
2. Open the SDK Test Suite: https://developers.google.com/youtube/gaming/playables/test_suite
3. Enter the game URL `http://127.0.0.1:4174/` and run all checks.
4. Things to watch:
   - [ ] `firstFrameReady` while the loading screen is visible, and `gameReady` only on the interactive menu;
   - [ ] `loadData` before any `saveData`; progress is restored after a reload;
   - [ ] mute toggle: no sound while muted, even with the game's Music and Sound settings on;
   - [ ] pause/resume: everything stops and resumes; a pause the player opened stays open;
   - [ ] rewarded ads with each reward id (Store Diamonds / Coins, a level unlock, the Wheel after the free spin, the x2–x5 boost, a tool variant without enough coins);
   - [ ] no console errors and no CSP violations.

## 2. Developer Portal (ZIP)

1. Upload `CleanUpMiniGames_release/CleanUpMiniGames_youtube_build139.zip` (`index.html` is at the root).
2. Run the portal's checks and the Test Suite on the uploaded build.
3. Turn on monetization in the portal, otherwise rewarded ads are unavailable. Rewarded ads use YouTube-provided ad functions (public preview).
4. Play on a phone (Android + iOS YouTube app) and on a PC:
   - the cloud save continues across devices;
   - sound plays on iOS (the audio files are Ogg Vorbis);
   - performance during paint stages.

## 3. Still needs a decision from the designer

- Score metric (proposal: number of different levels completed, 0–50). Disabled until approved.
- Interstitial placements. The rule is ready but disabled.
