// Development platform adapter. Explicitly selected by the entrypoint; shows TEST MODE.
// Storage: in-memory by default. `storage: 'local'` keeps a dev-only copy in localStorage
// so reloads can be tested; this is never used for a real platform profile.

const LOCAL_KEY = 'cleanup-dev-save';

export function createDevPlatform({ storage = 'memory', rewardedOutcome = 'earned' } = {}) {
  let memory = '';
  let failNextLoad = false;
  let failNextSave = false;
  let snapshot = { paused: false, audioEnabled: true };
  const listeners = new Set();
  const emit = () => listeners.forEach((l) => l({ ...snapshot }));

  return {
    id: 'dev',
    testMode: true,

    async init() {
      return {
        capabilities: { cloudSave: true, rewarded: true, interstitial: true, score: true, hostLifecycle: true },
        audioEnabled: snapshot.audioEnabled,
        paused: snapshot.paused,
      };
    },
    firstFrameReady() {},
    gameReady() {},

    async loadData() {
      if (failNextLoad) {
        failNextLoad = false;
        throw new Error('DEV: simulated load failure');
      }
      if (storage === 'local') {
        try {
          return window.localStorage.getItem(LOCAL_KEY) ?? '';
        } catch {
          return memory;
        }
      }
      return memory;
    },

    async saveData(serialized) {
      if (typeof serialized !== 'string') throw new TypeError('saveData expects a string');
      if (failNextSave) {
        failNextSave = false;
        throw new Error('DEV: simulated save failure');
      }
      memory = serialized;
      if (storage === 'local') {
        try {
          window.localStorage.setItem(LOCAL_KEY, serialized);
        } catch {
          /* dev convenience only */
        }
      }
    },

    // Not used before Step 7 (monetization), kept to satisfy the contract.
    async requestRewarded(placementId) {
      if (!placementId) return { result: 'error' };
      return { result: rewardedOutcome };
    },
    async requestInterstitial() {
      return { result: 'request-completed' };
    },
    async sendScore(value) {
      if (!Number.isInteger(value)) throw new TypeError('score must be an integer');
    },
    async getLanguage() {
      return (typeof navigator !== 'undefined' && navigator.language) || 'en';
    },

    // Optional capability (not every platform has haptics): short vibration if available.
    vibrate(ms) {
      try {
        navigator.vibrate?.(ms);
      } catch {
        /* unsupported */
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      listener({ ...snapshot });
      return () => listeners.delete(listener);
    },
    reportWarning(...args) {
      console.warn('[dev platform]', ...args);
    },
    reportError(...args) {
      console.error('[dev platform]', ...args);
    },
    dispose() {
      listeners.clear();
    },

    // Dev-only controls for tests (host pause / mute / failures).
    dev: {
      setPaused(paused) {
        snapshot = { ...snapshot, paused };
        emit();
      },
      setAudioEnabled(audioEnabled) {
        snapshot = { ...snapshot, audioEnabled };
        emit();
      },
      failNextLoad() {
        failNextLoad = true;
      },
      failNextSave() {
        failNextSave = true;
      },
      peekStoredData() {
        return memory;
      },
    },
  };
}
