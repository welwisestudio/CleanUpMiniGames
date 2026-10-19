// Label of a rewarded CTA that is waiting for its ad (2026-10-19): "Loading…" while the ad is being
// fetched / shown, "Finishing…" once YouTube has handed the game back and only the SDK result is
// still pending (RewardService.adPhase). Only the CTA that started the request shows it.
export function adBusyLabel(services, loading = 'Loading…') {
  return services?.rewards?.adPhase?.state === 'finishing' ? 'Finishing…' : loading;
}

// re-render a busy CTA when the phase changes; returns the unsubscribe function
export function onAdPhase(services, fn) {
  return services?.rewards?.on?.('adPhase', fn) ?? (() => {});
}
