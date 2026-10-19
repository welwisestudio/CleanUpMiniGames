import { worldToScreen } from '../ui/layout.js';

// Read-only QA snapshot for automated tests, enabled only with `?qa=1`.
// It exposes state and on-screen geometry so tests can perform REAL pointer input.
// It offers no way to set progress, complete stages or grant rewards.

let enabled = false;
let current = null;
let servicesRef = null;

export function installQa(services) {
  if (typeof window === 'undefined') return;
  enabled = new URLSearchParams(window.location.search).get('qa') === '1';
  if (!enabled) return;
  servicesRef = services;
  window.__cleanupQA = Object.freeze({
    snapshot,
    // Dev-adapter controls (host pause/mute, simulated failures). Only exist in the dev profile.
    platformDev: services.platform.dev ?? null,
  });
}

export function registerQaScene(scene) {
  if (!enabled) return;
  current = scene;
}

// World = device px; tests work in CSS px (what mouse / touch events use).
function rectToScreen(layout, r) {
  const c = worldToScreen(layout, r.x, r.y);
  return { x: c.x, y: c.y, w: r.w / layout.dpr, h: r.h / layout.dpr, ...(r.tapW ? { tapW: r.tapW / layout.dpr, tapH: r.tapH / layout.dpr } : {}), visible: r.visible ?? true };
}

// Work targets of the current stage in object-local units (read-only).
function qaTargetsLocal(scene) {
  const m = scene.mechanic;
  const st = scene.stack;
  if (!m || !st) return null;
  if (m.itemsLocal) return { kind: 'drag', items: m.itemsLocal(), target: m.targetLocal() };
  if (m.pointsLocal) return { kind: 'points', mode: m.mode, points: m.pointsLocal() };
  if (m.spotsLocal) return { kind: 'spots', spots: m.spotsLocal(), needsLoad: Boolean(m.needsLoad?.()), tub: m.params.source ? m.tubOpening() : null };
  const region = scene.stage?.region ?? scene.stage?.params?.region;
  const b = st.regionBounds(region);
  // sample the valid area on a coarse grid so tests can sweep exactly the work area
  const pts = [];
  const step = (b[2] - b[0]) / 40;
  for (let y = b[1]; y <= b[3]; y += step) for (let x = b[0]; x <= b[2]; x += step) if (st.inRegion(x, y, region)) pts.push([Math.round(x), Math.round(y)]);
  // chisel: the grid points that still lie on a remaining crust chunk
  const crust = m.map ? pts.filter(([x, y]) => {
    const id = m.map.labelAt(x, y);
    return id >= 0 && !m.removed[id];
  }) : undefined;
  // paint source (Step 8): where the tool is dipped while it is empty
  const load = m.source ? { needsLoad: m.needsLoad(), source: m.sourceOpening() } : {};
  return { kind: 'area', bounds: b, points: pts, step, crust, ...load };
}

function snapshot() {
  const scene = current;
  const s = servicesRef;
  const base = {
    scene: scene?.scene?.key ?? null,
    active: scene?.scene?.isActive?.() ?? false,
    coins: s.save.loaded ? s.save.get('coins') : null,
    levels: s.save.loaded ? JSON.parse(JSON.stringify(s.save.get('levels'))) : null,
    saveStatus: s.save.status,
    // level access (read-only): the saved sets + dev unlock-all flag (no unlock popup since 2026-10-13)
    progression: s.save.loaded ? { ...JSON.parse(JSON.stringify(s.save.get('progression'))), devUnlockAll: s.progression.devUnlockAll } : null,
    vipLevels: [...(s.progression.config.vip ?? [])],
    minigame: scene?.minigameQa ? scene.minigameQa() : null,
    diamondsNow: s.save.loaded ? s.save.get('diamonds') : null,
    // Store bundles / Wheel free-spin day as saved (read-only)
    storeSave: s.save.loaded ? JSON.parse(JSON.stringify(s.save.get('store'))) : null,
    wheelSave: s.save.loaded ? { ...s.save.get('wheel') } : null,
    // chest images' local x (a not-ready nudge must always return to 0) + the paint source texture
    chestX: { timed: (scene?.timedChest ?? scene?.hudTimedChest)?.chest?.x ?? null, progress: (scene?.progressChest ?? scene?.hudProgressChest)?.chest?.x ?? null },
    paintSource: scene?.mechanic?.sourceImg?.texture?.key ?? null,
    // Store / Wheel (read-only): open flags; wheel state + the segment it chose / landed on
    store: scene?.store ? { open: true } : null,
    wheel: scene?.wheel ? { state: scene.wheel.state, chosen: scene.wheel.result?.index ?? null, landed: scene.wheel.landedIndex(), free: s.wheel.freeAvailable() } : null,
    toolsOwned: s.save.loaded ? [...s.save.get('tools.owned')] : null,
    toolsEquipped: s.save.loaded ? { ...s.save.get('tools.equipped') } : null,
    firstHint: Boolean(scene?.firstHint),
    menuLayout: scene?.listRect && scene?.scene?.key === 'Menu' ? { listW: scene.listRect.w / (scene.layout?.dpr ?? 1), listX: scene.listRect.x / (scene.layout?.dpr ?? 1), headerH: scene.headerH / (scene.layout?.dpr ?? 1), phoneRow: Boolean(scene.phoneRow) } : null,
    tutorialFlags: s.save.loaded ? { ...s.save.get('tutorial') } : null,
    pause: s.pause.snapshot(),
    inputEnabled: Boolean(scene?.game?.input?.enabled),
    adPhase: s.rewards.adPhase ?? null,
    adTrace: s.rewards.adTrace ? [...s.rewards.adTrace] : [],
    settingsOpen: Boolean(scene?.settings || scene?.settingsModal),
    pauseModal: Boolean(scene?.pauseModal),
    build: s.build,
    // interstitial pacing (read-only): last completed request, last placement, the dev adapter's log
    interstitial: { last: s.interstitial.lastInterstitialRequestCompleted, placement: s.interstitial.lastPlacement ?? null, busy: s.interstitial.busy, log: s.platform.interstitialLog ? s.platform.interstitialLog.map((x) => x.result) : null },
    // audio (read-only): counts, plays per event, the music instance and the tool loop now playing
    audio: { requested: s.audio.requested, played: s.audio.played, log: { ...s.audio.log }, music: s.audio.music ? { playing: s.audio.music.isPlaying, paused: s.audio.music.isPaused, instances: s.audio.sound?.getAll?.('music-main')?.length ?? null } : null, tool: s.audio.toolPlaying, toolVolume: s.audio.tool?.sound?.volume ?? 0, playingLoops: (s.audio.sound?.getAllPlaying?.() ?? []).filter((x) => x.key.startsWith('loop-')).map((x) => x.key), musicPlaying: (s.audio.sound?.getAllPlaying?.() ?? []).filter((x) => x.key === 'music-main').length, canPlay: s.audio.canPlay, locked: Boolean(s.audio.sound?.locked) },
    // reward state (read-only): balances, boost receipt, timed chest, level-progress chest
    rewards: s.save.loaded
      ? {
          diamonds: s.save.get('diamonds'),
          lastCompletion: s.save.get('lastCompletion'),
          timedChest: s.rewards.timedChestState(),
          timedReadyAt: s.save.get('timedChest.readyAt'),
          progressChest: s.rewards.progressChestState(),
          opened: s.save.get('progressChest.opened'),
          boostState: scene?.result?.boostState ?? null,
          boostValue: scene?.result?.boostValue ?? null,
          chestOffer: Boolean(scene?.chestOffer),
          chestOfferPhase: scene?.chestOffer?.phase ?? null,
          adDialog: typeof document !== 'undefined' && Boolean(document.getElementById('dev-ad-dialog')),
        }
      : null,
  };
  if (!scene || !scene.layout) return base;
  const layout = scene.layout;
  const buttons = {};
  for (const [id, b] of scene.qaButtons ?? []) buttons[id] = rectToScreen(layout, b.worldRect());
  for (const [id, r] of scene.qaTargets ?? []) buttons[id] = { ...rectToScreen(layout, r), ...(r.thumb ? { thumb: r.thumb, check: r.check / layout.dpr } : {}), ...(r.state ? { state: r.state } : {}), ...(r.vip ? { vip: true } : {}), ...(r.currency ? { currency: r.currency, price: r.price } : {}) };
  base.layout = { W: layout.cssW, H: layout.cssH, dpr: layout.dpr, u: layout.u / layout.dpr, compact: layout.compact, hudBottom: layout.hudBottom / layout.dpr };
  base.buttons = buttons;
  if (scene.scene.key === 'Level' && scene.stack) {
    const c = worldToScreen(layout, scene.stack.center.x, scene.stack.center.y);
    const k = scene.stack.scale / layout.dpr; // object-local → CSS px
    base.level = {
      id: scene.levelId,
      runId: scene.runId,
      state: scene.state,
      stageIndex: scene.stageIndex,
      stageId: scene.stage?.id,
      fxLog: { ...(scene.fxLog ?? {}) }, // effect events by type (tool variety pass)
      stageCount: scene.level.stages.length,
      progress: scene.mechanic?.progress ?? 0,
      completedFlag: scene.mechanic?.completed ?? false,
      // Step 7 tool cards (CSS px) and the active family
      toolFamily: scene.stage?.family ?? null,
      toolCards: scene.selector ? scene.selector.cardRects().map((r) => ({ ...r, x: r.x / layout.dpr, y: r.y / layout.dpr, w: r.w / layout.dpr, h: r.h / layout.dpr })) : null,
      ownedTools: s.save.loaded ? [...s.save.get('tools.owned')] : null,
      equippedTools: s.save.loaded ? { ...s.save.get('tools.equipped') } : null,
      diamonds: s.save.loaded ? s.save.get('diamonds') : null,
      tool: scene.tool && {
        texture: scene.tools.sprite?.texture?.key ?? null,
        id: scene.tool.id,
        kind: scene.tool.kind,
        // effective finger → work point offset and nozzle → impact vector, CSS px
        workOffset: scene.tool.kind === 'target' ? { x: 0, y: 0 } : { x: scene.tools.offset().x / layout.dpr, y: scene.tools.offset().y / layout.dpr },
        jet: scene.tool.kind === 'jet' ? { x: scene.tools.jetVector().x / layout.dpr, y: scene.tools.jetVector().y / layout.dpr } : { x: 0, y: 0 },
        jetLength: (scene.tool.jetLength ?? 0) * k,
        holdAngle: scene.tool.holdAngle ?? 0,
        shown: Boolean(scene.tools.sprite?.visible && scene.tools.sprite.alpha > 0.5),
        inert: Boolean(scene.tools.inert),
      },
      object: { x: c.x, y: c.y, radius: (scene.stack.radius ?? 0) * k },
      // object-local → CSS px transform (for driving real input on any object shape)
      xf: { cx: c.x, cy: c.y, k, size: scene.stack.size },
      region: scene.stage?.region ?? scene.stage?.params?.region ?? null,
      family: scene.family,
      brush: { radius: scene.stage?.params?.radius ?? null, effectiveRadius: scene.mechanic?.radius ?? null, aspect: scene.stage?.params?.aspect ?? 1, aspectY: scene.mechanic?.aspectY ?? 1, mechanic: scene.stage?.mechanic },
      // painting cost counters (systems pass 2026-10-12): stamps, render passes, Mpx blitted, JS ms
      paintStats: scene.stack?.paintStats ? { ...scene.stack.paintStats } : null,
      // active-area indicator: null, 'traced' (region outline) or circles (count still shown)
      outline: scene.stack.outlineRings ? { kind: 'circles', shown: scene.stack.outlineRings.filter((r) => !r.done).length, r: scene.stack.outlineRings[0]?.r ?? null } : scene.stack.outline ? { kind: 'traced' } : null,
      // repair-spot centres of the level (object-local), e.g. the chair holes
      repairSpots: (scene.level.object.regions?.spots?.circles ?? []).map(([x, y]) => [x, y]),
      hint: Boolean(scene.hint?.visible),
      hintHand: scene.hint?.visible && scene.hint.hand.alpha > 0.5 ? { x: scene.hint.hand.x / layout.dpr, y: scene.hint.hand.y / layout.dpr } : null,
      targets: qaTargetsLocal(scene),
      stageLog: scene.stageLog,
      levelSeconds: scene.levelSeconds ?? null,
      reward: scene.reward ? { amount: scene.reward.amount, coinsAfter: scene.reward.coinsAfter } : null,
      pauseModal: Boolean(scene.pauseModal),
    };
  }
  return base;
}
