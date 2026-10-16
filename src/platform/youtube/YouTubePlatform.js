// YouTube Playables adapter (Step 11, 2026-10-15). The ONLY module that talks to `ytgame`
// (together with the YouTube entrypoint src/main.youtube.js). Implements platform/SDK-CONTRACT.md.
// Official API checked 2026-10-15: developers.google.com/youtube/gaming/playables/reference/sdk
//
// Rules implemented here:
// - SDK presence: `typeof ytgame !== 'undefined'` (the SDK global may be a lexical binding, not a
//   window property); no SDK in the YouTube profile is a start error — never a silent fallback;
// - firstFrameReady / gameReady: each sent once, gameReady only after firstFrameReady;
// - cloud save only (no browser storage). loadData must resolve with a string; '' / whitespace /
//   '{}' / 'null' mean "no progress yet"; anything else (reject, timeout, non-string) is an error
//   and keeps writes blocked. saveData is refused until a load succeeded, checks the size (UTF-16
//   and UTF-8 estimates, far below the 3 MiB limit) and reports SDK failures;
// - lifecycle: onPause / onResume / onAudioEnabledChange registered once at init and fanned out
//   to subscribers; the initial audio state comes from isAudioEnabled();
// - rewarded: `requestRewardedAd(rewardId)` → true = earned, false = not-earned, reject =
//   unavailable (API_UNAVAILABLE) / error. One request at a time. A result that arrives during a
//   host pause is held until the host resumes;
// - interstitial: `requestInterstitialAd()` resolves when the REQUEST completed — the SDK gives no
//   impression signal, so the result is named 'request-completed' (never "shown");
// - score: integer ≥ 0 via engagement.sendScore({ value }); language via system.getLanguage();
// - health: logWarning / logError (best effort, locally rate-limited).

export const SAVE_LIMIT_BYTES = 3 * 1024 * 1024; // platform limit
export const SAVE_SAFE_BYTES = 2.5 * 1024 * 1024; // our hard stop, well below the limit
export const SAVE_WARN_BYTES = 500 * 1024; // platform recommendation
const LOAD_TIMEOUT_MS = 15000;
const REWARD_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export class PlatformStartError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // 'sdk-missing'
  }
}

// The SDK global, resolved without assuming it is a window property.
export function resolveSdk() {
  // eslint-disable-next-line no-undef
  return typeof ytgame !== 'undefined' ? ytgame : undefined;
}

const EMPTY = new Set(['', '{}', 'null']);
const utf8Bytes = (s) => new TextEncoder().encode(s).length;

function errorResult(e) {
  const type = e?.errorType;
  const T = resolveSdk()?.SdkErrorType;
  if (type != null && T && type === T.API_UNAVAILABLE) return 'unavailable';
  if (type === 'API_UNAVAILABLE' || type === 0) return 'unavailable';
  return 'error';
}

export function createYouTubePlatform({ sdk = resolveSdk(), loadTimeoutMs = LOAD_TIMEOUT_MS, clock = () => Date.now() } = {}) {
  if (!sdk || !sdk.game || !sdk.system) throw new PlatformStartError('sdk-missing', 'YouTube Playables SDK is not available');
  const listeners = new Set();
  const unsets = [];
  let state = { paused: false, audioEnabled: true };
  let firstFrameSent = false;
  let gameReadySent = false;
  let loaded = false;
  let rewardedBusy = false;
  let resumeWaiters = [];
  let lastHealth = 0;

  const emit = () => listeners.forEach((l) => l({ ...state }));
  const waitForResume = () => (state.paused ? new Promise((r) => resumeWaiters.push(r)) : Promise.resolve());

  const health = (fn) => {
    const now = clock();
    if (now - lastHealth < 2000) return; // local rate limit (the SDK is best effort and rate-limited too)
    lastHealth = now;
    try {
      sdk.health?.[fn]?.();
    } catch {
      /* diagnostics must never break the game */
    }
  };

  return {
    id: 'youtube-playables',
    testMode: false,
    capabilities: {
      cloudSave: true,
      rewarded: typeof sdk.ads?.requestRewardedAd === 'function',
      interstitial: typeof sdk.ads?.requestInterstitialAd === 'function',
      score: typeof sdk.engagement?.sendScore === 'function',
      hostLifecycle: true,
    },

    async init() {
      let audioEnabled = true;
      try {
        audioEnabled = Boolean(sdk.system.isAudioEnabled());
      } catch {
        audioEnabled = false; // unknown → silent, never unexpected sound
      }
      state = { paused: false, audioEnabled };
      if (!unsets.length) {
        unsets.push(
          sdk.system.onAudioEnabledChange((enabled) => {
            state = { ...state, audioEnabled: Boolean(enabled) };
            emit();
          }),
          sdk.system.onPause(() => {
            state = { ...state, paused: true };
            emit();
          }),
          sdk.system.onResume(() => {
            state = { ...state, paused: false };
            const w = resumeWaiters;
            resumeWaiters = [];
            w.forEach((r) => r());
            emit();
          }),
        );
      }
      return { capabilities: this.capabilities, audioEnabled, paused: false };
    },

    firstFrameReady() {
      if (firstFrameSent) return;
      firstFrameSent = true;
      sdk.game.firstFrameReady();
    },

    gameReady() {
      if (gameReadySent) return;
      if (!firstFrameSent) this.firstFrameReady(); // order guarantee
      gameReadySent = true;
      sdk.game.gameReady();
    },

    async loadData() {
      let timer;
      const timeout = new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error('loadData timed out')), loadTimeoutMs);
      });
      let data;
      try {
        data = await Promise.race([sdk.game.loadData(), timeout]);
      } finally {
        clearTimeout(timer);
      }
      if (typeof data !== 'string') throw new Error(`loadData returned ${data === undefined ? 'undefined' : typeof data}, expected a string`);
      loaded = true;
      return EMPTY.has(data.trim()) ? '' : data;
    },

    async saveData(serialized) {
      if (typeof serialized !== 'string') throw new TypeError('saveData expects a string');
      if (!loaded) throw new Error('saveData before a successful loadData is refused');
      const u16 = serialized.length * 2;
      const u8 = utf8Bytes(serialized);
      if (u16 > SAVE_SAFE_BYTES || u8 > SAVE_SAFE_BYTES) throw new Error(`save too large (utf16 ${u16} B, utf8 ${u8} B)`);
      if (u16 > SAVE_WARN_BYTES) health('logWarning');
      await sdk.game.saveData(serialized);
    },

    async requestRewarded(placementId) {
      if (!REWARD_ID.test(String(placementId ?? ''))) return { result: 'error' };
      if (typeof sdk.ads?.requestRewardedAd !== 'function') return { result: 'unavailable' };
      if (rewardedBusy) return { result: 'unavailable' };
      rewardedBusy = true;
      try {
        let earned;
        try {
          earned = await sdk.ads.requestRewardedAd(placementId);
        } catch (e) {
          return { result: errorResult(e) };
        }
        await waitForResume(); // apply the outcome only once the host lets the game run again
        return { result: earned === true ? 'earned' : 'not-earned' };
      } finally {
        rewardedBusy = false;
      }
    },

    async requestInterstitial() {
      if (typeof sdk.ads?.requestInterstitialAd !== 'function') return { result: 'unavailable' };
      try {
        await sdk.ads.requestInterstitialAd();
        await waitForResume();
        return { result: 'request-completed' }; // NOT proof that an ad was shown
      } catch (e) {
        return { result: errorResult(e) };
      }
    },

    async sendScore(value) {
      if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('score must be a non-negative safe integer');
      if (typeof sdk.engagement?.sendScore !== 'function') throw new Error('score is not available');
      await sdk.engagement.sendScore({ value });
    },

    async getLanguage() {
      try {
        const l = await sdk.system.getLanguage();
        return typeof l === 'string' && l ? l : 'en';
      } catch {
        return 'en';
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      listener({ ...state });
      return () => listeners.delete(listener);
    },

    reportWarning() {
      health('logWarning');
    },

    reportError() {
      health('logError');
    },

    dispose() {
      unsets.splice(0).forEach((u) => {
        try {
          u?.();
        } catch {
          /* ignore */
        }
      });
      listeners.clear();
    },
  };
}
