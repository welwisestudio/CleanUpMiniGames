// Mock of https://www.youtube.com/game_api/v1 for the production checks (served by Playwright in
// place of the real SDK). `ytgame` is declared as a LEXICAL global (const), not a window property,
// exactly the case the adapter must handle. Behaviour comes from window.__ytMockConfig (set by an
// init script); every call is logged to window.__ytLog; window.__ytMockCtl drives host events.
const ytgame = (() => {
  const cfg = window.__ytMockConfig || {};
  const log = (window.__ytLog = []);
  const t = () => Math.round(performance.now());
  const cb = { audio: [], pause: [], resume: [] };
  let audio = cfg.audio !== undefined ? cfg.audio : true;
  let loads = 0;
  const SdkErrorType = { API_UNAVAILABLE: 'API_UNAVAILABLE', INVALID_PARAMS: 'INVALID_PARAMS', SIZE_LIMIT_EXCEEDED: 'SIZE_LIMIT_EXCEEDED', UNKNOWN: 'UNKNOWN' };
  class SdkError extends Error {
    constructor(errorType) {
      super(errorType);
      this.errorType = errorType;
    }
  }
  // held ads (cfg.adHold): the test ends them — finishAd(value?) resolves (default: the configured
  // result), rejectAd() rejects like the SDK does on a failure
  let finishAd = null;
  let rejectAd = null;
  const held = (value) =>
    cfg.adHold
      ? new Promise((res, rej) => {
          finishAd = (v) => res(v === undefined ? value : v);
          rejectAd = () => rej(new SdkError('UNKNOWN'));
        })
      : Promise.resolve(value);
  window.__ytMockCtl = {
    finishAd: (v) => finishAd?.(v),
    rejectAd: () => rejectAd?.(),
    pause: () => cb.pause.forEach((f) => f()),
    resume: () => cb.resume.forEach((f) => f()),
    setAudio: (v) => {
      audio = v;
      cb.audio.forEach((f) => f(v));
    },
    set: (k, v) => (cfg[k] = v),
  };
  const sub = (list) => (f) => {
    list.push(f);
    return () => list.splice(list.indexOf(f), 1);
  };
  return {
    IN_PLAYABLES_ENV: true,
    SDK_VERSION: 'mock-1',
    SdkError,
    SdkErrorType,
    game: {
      firstFrameReady: () => log.push({ e: 'firstFrameReady', t: t() }),
      gameReady: () => log.push({ e: 'gameReady', t: t() }),
      loadData: () => {
        loads += 1;
        const seq = cfg.loadSequence || [cfg.load !== undefined ? cfg.load : ''];
        const v = seq[Math.min(loads - 1, seq.length - 1)];
        log.push({ e: 'loadData', t: t(), n: loads });
        if (v === '__reject__') return Promise.reject(new SdkError('API_UNAVAILABLE'));
        if (v === '__undefined__') return Promise.resolve(undefined);
        return Promise.resolve(v);
      },
      saveData: (data) => {
        log.push({ e: 'saveData', t: t(), data });
        if (cfg.saveFail) return Promise.reject(new SdkError('UNKNOWN'));
        // cfg.saveDelayMs: a slow cloud save (the UI must not wait for it)
        return cfg.saveDelayMs ? new Promise((res) => setTimeout(() => (log.push({ e: 'saveDataDone', t: t() }), res()), cfg.saveDelayMs)) : Promise.resolve();
      },
    },
    system: {
      isAudioEnabled: () => audio,
      onAudioEnabledChange: sub(cb.audio),
      onPause: sub(cb.pause),
      onResume: sub(cb.resume),
      getLanguage: () => Promise.resolve('en-US'),
    },
    ads: {
      requestRewardedAd: (id) => {
        log.push({ e: 'requestRewardedAd', t: t(), id });
        const r = cfg.rewarded !== undefined ? cfg.rewarded : true;
        return r === '__reject__' ? Promise.reject(new SdkError('API_UNAVAILABLE')) : held(r);
      },
      requestInterstitialAd: () => {
        log.push({ e: 'requestInterstitialAd', t: t() });
        return held(undefined);
      },
    },
    engagement: {
      sendScore: (s) => {
        log.push({ e: 'sendScore', t: t(), value: s.value });
        return Promise.resolve();
      },
      openYTContent: () => Promise.resolve(),
    },
    health: {
      logError: () => log.push({ e: 'logError', t: t() }),
      logWarning: () => log.push({ e: 'logWarning', t: t() }),
    },
  };
})();
