// Internal platform contract (see platform/SDK-CONTRACT.md).
// Game code talks only to this interface; concrete adapters live in platform/dev/ and,
// at Step 11, platform/youtube/. No other folder may reference a platform SDK.

export const PLATFORM_METHODS = [
  'init', // () => Promise<{ capabilities, audioEnabled, paused }>
  'firstFrameReady', // () => void, once
  'gameReady', // () => void, once the game is interactive
  'loadData', // () => Promise<string> ('' = no save yet); rejects on read error
  'saveData', // (string) => Promise<void>; rejects on write error
  'requestRewarded', // (placementId) => Promise<{ result: 'earned'|'not-earned'|'unavailable'|'error' }>
  'requestInterstitial', // () => Promise<{ result: 'request-completed'|'unavailable'|'error' }>
  'sendScore', // (integer) => Promise<void>
  'getLanguage', // () => Promise<string>
  'subscribe', // (listener({ paused, audioEnabled })) => unsubscribe
  'reportWarning',
  'reportError',
  'dispose',
];

export const CAPABILITIES = ['cloudSave', 'rewarded', 'interstitial', 'score', 'hostLifecycle'];

export function assertPlatform(platform) {
  const missing = PLATFORM_METHODS.filter((m) => typeof platform?.[m] !== 'function');
  if (missing.length) {
    throw new Error(`Platform adapter is missing: ${missing.join(', ')}`);
  }
  return platform;
}
