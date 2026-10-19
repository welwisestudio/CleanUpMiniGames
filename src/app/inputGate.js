// Central input gate (2026-10-19, YouTube host-pause input fix).
//
// Root cause it fixes: a host pause put the Phaser loop to sleep, but the canvas keeps its DOM
// mouse / touch / wheel listeners and Phaser's InputManager hands every event straight to the
// scenes — so taps, drags and scrolls made DURING the pause still reached buttons, menu cards and
// tools, and whatever they changed or scheduled played out when the loop woke up.
//
// The gate: while YouTube has the game host-paused, or an ad (rewarded / interstitial) is running
// ('adBusy'), Phaser's input manager is DISABLED — its DOM handlers then drop every event
// (nothing is queued). On entering AND leaving the blocked state every pointer is reset and the
// scenes get 'input-cancel' to drop in-progress gestures (strokes, drags, pressed buttons, aiming),
// so after resume input starts from a neutral state and only a NEW input acts. The player's own
// pause ('user') is a separate reason and is never touched here.
export const BLOCKING_REASONS = ['host', 'adBusy'];

export function installInputGate(game, pause, services) {
  services.inputEpoch = 0;
  let blocked = false;
  const apply = (snap) => {
    const reasons = snap?.reasons ?? [];
    const want = BLOCKING_REASONS.some((r) => reasons.includes(r));
    if (want === blocked) return;
    blocked = want;
    services.inputEpoch += 1; // deferred UI actions scheduled before this moment are void
    const im = game.input;
    if (!im) return;
    im.enabled = !want;
    if (im.keyboard) im.keyboard.enabled = !want;
    for (const p of im.pointers ?? []) p.reset?.();
    game.events.emit('input-cancel', { blocked: want });
  };
  pause.on('change', apply);
  apply(pause.snapshot());
  return {
    get blocked() {
      return blocked;
    },
  };
}

// Run `fn` after `ms` of scene time only if no input-blocking pause started in between (a UI action
// that a tap scheduled must not fire after a host pause / ad).
export function deferUi(scene, ms, fn) {
  const services = scene.registry.get('services');
  const epoch = services?.inputEpoch;
  return scene.time.delayedCall(ms, () => {
    if (services && services.inputEpoch !== epoch) return;
    fn();
  });
}

// A scene listens to the gate's 'input-cancel' for its own lifetime.
export function onInputCancel(scene, fn) {
  const h = (e) => scene.sys.isActive() && fn(e);
  scene.game.events.on('input-cancel', h);
  scene.events.once('shutdown', () => scene.game.events.off('input-cancel', h));
}
