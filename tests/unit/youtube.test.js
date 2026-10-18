import { describe, it, expect } from 'vitest';
import { createYouTubePlatform, PlatformStartError, SAVE_SAFE_BYTES } from '../../src/platform/youtube/YouTubePlatform.js';
import { assertPlatform } from '../../src/platform/contract.js';
import { SaveService } from '../../src/services/SaveService.js';
import { ScoreService } from '../../src/services/ScoreService.js';
import { InterstitialService } from '../../src/services/InterstitialService.js';
import { INTERSTITIAL } from '../../src/content/platformConfig.js';
import { PauseState } from '../../src/core/PauseState.js';

// Contract tests for the YouTube Playables adapter with a controllable fake SDK (same API surface
// as ytgame: game / system / ads / engagement / health, SdkError with errorType).
function fakeSdk({ audio = true, load = () => Promise.resolve(''), save = () => Promise.resolve(), rewarded = () => Promise.resolve(true), interstitial = () => Promise.resolve(), score = () => Promise.resolve(), language = () => Promise.resolve('de-DE') } = {}) {
  const cb = { audio: null, pause: null, resume: null };
  const log = [];
  const sdk = {
    IN_PLAYABLES_ENV: true,
    SdkErrorType: { API_UNAVAILABLE: 'API_UNAVAILABLE', UNKNOWN: 'UNKNOWN' },
    game: {
      firstFrameReady: () => log.push('firstFrameReady'),
      gameReady: () => log.push('gameReady'),
      loadData: () => (log.push('loadData'), load()),
      saveData: (d) => (log.push(['saveData', d]), save(d)),
    },
    system: {
      isAudioEnabled: () => audio,
      onAudioEnabledChange: (f) => ((cb.audio = f), () => (cb.audio = null)),
      onPause: (f) => ((cb.pause = f), () => (cb.pause = null)),
      onResume: (f) => ((cb.resume = f), () => (cb.resume = null)),
      getLanguage: () => language(),
    },
    ads: { requestRewardedAd: (id) => (log.push(['rewarded', id]), rewarded(id)), requestInterstitialAd: () => (log.push('interstitial'), interstitial()) },
    engagement: { sendScore: (s) => (log.push(['score', s]), score(s)) },
    health: { logError: () => log.push('logError'), logWarning: () => log.push('logWarning') },
  };
  return { sdk, cb, log };
}
const sdkError = (errorType) => Object.assign(new Error(errorType), { errorType });

describe('YouTube Playables adapter (contract)', () => {
  it('implements the contract; a missing SDK is a start error, never a silent fallback', () => {
    const { sdk } = fakeSdk();
    expect(() => assertPlatform(createYouTubePlatform({ sdk }))).not.toThrow();
    expect(() => createYouTubePlatform({ sdk: undefined })).toThrow(PlatformStartError);
    expect(createYouTubePlatform({ sdk }).testMode).toBe(false);
  });

  it('initial mute from isAudioEnabled; audio / pause / resume changes reach subscribers; unsubscribe and dispose', async () => {
    const { sdk, cb } = fakeSdk({ audio: false });
    const p = createYouTubePlatform({ sdk });
    expect(await p.init()).toMatchObject({ audioEnabled: false, paused: false });
    const seen = [];
    const off = p.subscribe((s) => seen.push(s));
    cb.audio(true);
    cb.pause();
    cb.resume();
    expect(seen).toEqual([{ paused: false, audioEnabled: false }, { paused: false, audioEnabled: true }, { paused: true, audioEnabled: true }, { paused: false, audioEnabled: true }]);
    off();
    cb.pause();
    expect(seen).toHaveLength(4);
    p.dispose();
    expect([cb.audio, cb.pause, cb.resume]).toEqual([null, null, null]);
  });

  it('firstFrameReady before gameReady, each exactly once', () => {
    const { sdk, log } = fakeSdk();
    const p = createYouTubePlatform({ sdk });
    p.gameReady();
    p.firstFrameReady();
    p.gameReady();
    expect(log).toEqual(['firstFrameReady', 'gameReady']);
  });

  it('load: string → as is; empty / {} / null → no progress; undefined, reject and timeout are errors', async () => {
    for (const [raw, out] of [['{"version":4,"coins":5}', '{"version":4,"coins":5}'], ['', ''], ['   ', ''], ['{}', ''], ['null', '']]) {
      const { sdk } = fakeSdk({ load: () => Promise.resolve(raw) });
      expect(await createYouTubePlatform({ sdk }).loadData()).toBe(out);
    }
    const bad = [() => Promise.resolve(undefined), () => Promise.resolve(42), () => Promise.reject(sdkError('API_UNAVAILABLE')), () => new Promise(() => {})];
    for (const load of bad) {
      const { sdk } = fakeSdk({ load });
      await expect(createYouTubePlatform({ sdk, loadTimeoutMs: 30 }).loadData()).rejects.toThrow();
    }
  });

  it('save: refused before a successful load; success; SDK reject surfaces; size guard (UTF-16 and UTF-8)', async () => {
    const { sdk, log } = fakeSdk({ load: () => Promise.reject(new Error('x')) });
    const p = createYouTubePlatform({ sdk });
    await expect(p.saveData('{}')).rejects.toThrow(/before a successful loadData/);
    await expect(p.loadData()).rejects.toThrow();
    await expect(p.saveData('{}')).rejects.toThrow(/before a successful loadData/);
    expect(log.filter((e) => e[0] === 'saveData')).toEqual([]);
    const ok = fakeSdk();
    const p2 = createYouTubePlatform({ sdk: ok.sdk });
    await p2.loadData();
    await p2.saveData('{"a":1}');
    expect(ok.log).toContainEqual(['saveData', '{"a":1}']);
    await expect(p2.saveData('x'.repeat(SAVE_SAFE_BYTES / 2 + 1))).rejects.toThrow(/too large/);
    await expect(p2.saveData('я'.repeat(Math.floor(SAVE_SAFE_BYTES / 2) + 10))).rejects.toThrow(/too large/); // UTF-8 2 B / char
    const rej = fakeSdk({ save: () => Promise.reject(sdkError('UNKNOWN')) });
    const p3 = createYouTubePlatform({ sdk: rej.sdk });
    await p3.loadData();
    await expect(p3.saveData('{}')).rejects.toThrow();
  });

  it('SaveService on the adapter: a failed cloud read never becomes a fresh save and never writes', async () => {
    const { sdk, log } = fakeSdk({ load: () => Promise.reject(sdkError('API_UNAVAILABLE')) });
    const save = new SaveService(createYouTubePlatform({ sdk }));
    await expect(save.load()).rejects.toThrow();
    expect(save.loaded).toBe(false);
    expect(() => save.update((s) => (s.coins = 1))).toThrow(/not loaded/);
    expect(log.filter((e) => e[0] === 'saveData')).toEqual([]);
    // corrupt JSON / a newer version are errors too (Retry), not a reset
    for (const raw of ['{bad', '{"version":99}']) {
      const f = fakeSdk({ load: () => Promise.resolve(raw) });
      const s2 = new SaveService(createYouTubePlatform({ sdk: f.sdk }));
      await expect(s2.load()).rejects.toThrow();
      expect(f.log.filter((e) => e[0] === 'saveData')).toEqual([]);
    }
    // an older (v3) save migrates and keeps everything earned
    const old = fakeSdk({ load: () => Promise.resolve(JSON.stringify({ version: 3, coins: 321, diamonds: 17, levels: { rug: { completed: true, completions: 2 } }, tools: { owned: ['foam-gun'] } })) });
    const s3 = new SaveService(createYouTubePlatform({ sdk: old.sdk }));
    await s3.load();
    expect([s3.get('coins'), s3.get('diamonds'), s3.get('levels').rug.completed, s3.get('tools.owned')]).toEqual([321, 17, true, ['foam-gun']]);
  });

  it('rewarded: true = earned, false = not-earned, reject = unavailable / error; stable valid id; one at a time', async () => {
    const cases = [[() => Promise.resolve(true), 'earned'], [() => Promise.resolve(false), 'not-earned'], [() => Promise.reject(sdkError('API_UNAVAILABLE')), 'unavailable'], [() => Promise.reject(sdkError('UNKNOWN')), 'error']];
    for (const [rewarded, result] of cases) {
      const { sdk } = fakeSdk({ rewarded });
      expect((await createYouTubePlatform({ sdk }).requestRewarded('store-reward-gems')).result).toBe(result);
    }
    const { sdk, log } = fakeSdk();
    const p = createYouTubePlatform({ sdk });
    for (const bad of ['', 'Store Gems', 'user:123@x', undefined]) expect((await p.requestRewarded(bad)).result).toBe('error');
    expect(log.filter((e) => e[0] === 'rewarded')).toEqual([]);
    let release;
    const slow = fakeSdk({ rewarded: () => new Promise((r) => (release = r)) });
    const p2 = createYouTubePlatform({ sdk: slow.sdk });
    const a = p2.requestRewarded('level-unlock');
    const b = await p2.requestRewarded('level-unlock');
    expect(b.result).toBe('unavailable'); // second concurrent request
    release(true);
    expect((await a).result).toBe('earned');
    expect(slow.log.filter((e) => e[0] === 'rewarded')).toEqual([['rewarded', 'level-unlock']]);
  });

  it('rewarded result arriving during a host pause is applied only after resume', async () => {
    let release;
    const { sdk, cb } = fakeSdk({ rewarded: () => new Promise((r) => (release = r)) });
    const p = createYouTubePlatform({ sdk });
    await p.init();
    const req = p.requestRewarded('wheel-spin');
    cb.pause();
    release(true);
    let done = false;
    req.then(() => (done = true));
    await new Promise((r) => setTimeout(r, 10));
    expect(done).toBe(false);
    cb.resume();
    expect((await req).result).toBe('earned');
  });

  it('interstitial reports only request completion (no impression); rejects map to unavailable / error', async () => {
    expect((await createYouTubePlatform({ sdk: fakeSdk().sdk }).requestInterstitial()).result).toBe('request-completed');
    expect((await createYouTubePlatform({ sdk: fakeSdk({ interstitial: () => Promise.reject(sdkError('API_UNAVAILABLE')) }).sdk }).requestInterstitial()).result).toBe('unavailable');
  });

  it('score: non-negative integer via sendScore({ value }); invalid values and SDK errors reject; language with fallback', async () => {
    const { sdk, log } = fakeSdk();
    const p = createYouTubePlatform({ sdk });
    await p.sendScore(12);
    expect(log).toContainEqual(['score', { value: 12 }]);
    for (const bad of [-1, 1.5, NaN, '3']) await expect(p.sendScore(bad)).rejects.toThrow();
    await expect(createYouTubePlatform({ sdk: fakeSdk({ score: () => Promise.reject(sdkError('UNKNOWN')) }).sdk }).sendScore(1)).rejects.toThrow();
    expect(await p.getLanguage()).toBe('de-DE');
    expect(await createYouTubePlatform({ sdk: fakeSdk({ language: () => Promise.reject(new Error('x')) }).sdk }).getLanguage()).toBe('en');
  });
});

describe('Score and interstitial pacing', () => {
  it('score: disabled sends nothing; enabled sends the completed-level count once per improvement', async () => {
    const { sdk, log } = fakeSdk({ load: () => Promise.resolve(JSON.stringify({ version: 4, levels: { rug: { completed: true }, chair: { completed: true }, sneaker: { completed: false } } })) });
    const platform = createYouTubePlatform({ sdk });
    const save = new SaveService(platform);
    await save.load();
    expect(await new ScoreService({ save, platform, config: { enabled: false } }).report()).toBe('skipped');
    const sc = new ScoreService({ save, platform, config: { enabled: true } });
    expect(await sc.report()).toBe('sent');
    expect(await sc.report()).toBe('unchanged');
    expect(log.filter((e) => e[0] === 'score')).toEqual([['score', { value: 2 }]]);
  });

  it('interstitial rules (2026-10-18): approved triggers only; ≥ 30 s since the last SUCCESSFUL one (failures do not reset it); not in the first 30 s of the session; not within 30 s after a rewarded ad; never during host pause', async () => {
    const now = { t: 0 };
    let mode = 'ok';
    const { sdk } = fakeSdk({ interstitial: () => (mode === 'ok' ? Promise.resolve() : Promise.reject(sdkError(mode === 'na' ? 'API_UNAVAILABLE' : 'UNKNOWN'))) });
    const platform = createYouTubePlatform({ sdk });
    const pause = new PauseState();
    const it3 = new InterstitialService({ platform, pause, config: INTERSTITIAL, clock: () => now.t });
    expect(INTERSTITIAL).toEqual(expect.objectContaining({ enabled: true, minIntervalMs: 30_000, firstAfterMs: 30_000, afterRewardedMs: 30_000 }));
    expect((await it3.maybeShow('level-start')).result).toBe('skipped'); // first 30 s of the session
    now.t = 30_000;
    expect((await it3.maybeShow('somewhere-else')).result).toBe('skipped'); // not an approved trigger
    expect((await it3.maybeShow('level-start')).result).toBe('request-completed');
    now.t = 59_999;
    expect((await it3.maybeShow('result-next')).result).toBe('skipped'); // < 30 s since the last success
    now.t = 60_000;
    mode = 'na';
    expect((await it3.maybeShow('result-next')).result).toBe('unavailable');
    now.t = 61_000;
    mode = 'err';
    expect((await it3.maybeShow('chest-skip')).result).toBe('error');
    expect(it3.lastInterstitialRequestCompleted).toBe(30_000); // failures never reset the timer
    mode = 'ok';
    it3.noteRewarded(); // a rewarded ad at 61 s
    now.t = 90_999;
    expect((await it3.maybeShow('pause-menu')).result).toBe('skipped'); // < 30 s after the rewarded ad
    now.t = 91_000;
    pause.set('host', true);
    expect((await it3.maybeShow('pause-menu')).result).toBe('skipped'); // host pause
    pause.set('host', false);
    pause.set('user', true); // the player's own pause (Pause → Menu) does not block it
    expect((await it3.maybeShow('pause-menu')).result).toBe('request-completed');
    expect(it3.lastInterstitialRequestCompleted).toBe(91_000);
    for (const p2 of ['chest-skip', 'pause-resume', 'pause-restart', 'pause-menu', 'result-next', 'result-restart', 'result-menu', 'level-start']) expect(INTERSTITIAL.placements).toContain(p2);
  });
});
