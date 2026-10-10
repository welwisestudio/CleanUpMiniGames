// Development platform adapter. Explicitly selected by the entrypoint; shows TEST MODE.
// Storage: in-memory by default. `storage: 'local'` keeps a dev-only copy in localStorage
// so reloads can be tested; this is never used for a real platform profile.
// Rewarded ads (simulated, never a real ad): `rewardedOutcome` = 'ask' shows a TEST AD dialog
// where the tester picks the result (watched to the end / closed early / failed); or a fixed
// result: 'earned' | 'not-earned' | 'error' | 'unavailable'. Changeable at runtime via dev.

const LOCAL_KEY = 'cleanup-dev-save';
const AD_OUTCOMES = ['ask', 'earned', 'not-earned', 'error', 'unavailable'];

// Simulated rewarded ad for manual testing (dev profile only, plain DOM, clearly marked).
function askAdDialog(placementId) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.id = 'dev-ad-dialog';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,12,20,0.82);font-family:system-ui,sans-serif;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#1d2230;color:#fff;border:2px dashed #ffcf3a;border-radius:16px;padding:22px 20px;width:min(86vw,340px);text-align:center;';
    box.innerHTML = '<div style="font-weight:800;font-size:18px;color:#ffcf3a">TEST AD · dev adapter</div><div style="margin:8px 0 16px;font-size:13px;opacity:.8">Simulated rewarded ad — no real ad is shown.<br>Placement: <b></b></div>';
    box.querySelector('b').textContent = placementId;
    const choices = [
      ['earned', 'Watch to the end (reward)', '#31c339'],
      ['not-earned', 'Close early (no reward)', '#6b7280'],
      ['error', 'Ad failed (no reward)', '#c2410c'],
    ];
    for (const [result, label, color] of choices) {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.result = result;
      b.style.cssText = `display:block;width:100%;margin:8px 0;padding:12px;border:0;border-radius:10px;background:${color};color:#fff;font-weight:800;font-size:15px;cursor:pointer;`;
      b.onclick = () => {
        wrap.remove();
        resolve(result);
      };
      box.appendChild(b);
    }
    wrap.appendChild(box);
    document.body.appendChild(wrap);
  });
}

export function createDevPlatform({ storage = 'memory', rewardedOutcome = 'ask', rewardedDelayMs = 600 } = {}) {
  let adMode = AD_OUTCOMES.includes(rewardedOutcome) ? rewardedOutcome : 'ask';
  let adInFlight = false;
  const adLog = [];
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

    // Simulated rewarded ad. Only one at a time: a second request while one runs is an error.
    async requestRewarded(placementId) {
      if (!placementId) return { result: 'error' };
      if (adInFlight) return { result: 'error' };
      adInFlight = true;
      try {
        let result;
        if (adMode === 'ask' && typeof document !== 'undefined') result = await askAdDialog(placementId);
        else {
          await new Promise((r) => setTimeout(r, rewardedDelayMs));
          result = adMode === 'ask' ? 'earned' : adMode;
        }
        adLog.push({ placementId, result });
        return { result };
      } finally {
        adInFlight = false;
      }
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
      // Rewarded ad simulation: 'ask' | 'earned' | 'not-earned' | 'error' | 'unavailable'.
      setRewardedOutcome(mode) {
        if (!AD_OUTCOMES.includes(mode)) throw new Error(`Unknown rewarded outcome ${mode}`);
        adMode = mode;
      },
      get rewardedOutcome() {
        return adMode;
      },
      get rewardedLog() {
        return adLog.map((e) => ({ ...e }));
      },
    },
  };
}
