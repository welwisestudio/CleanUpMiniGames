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
  return { x: c.x, y: c.y, w: r.w / layout.dpr, h: r.h / layout.dpr, visible: r.visible ?? true };
}

// Work targets of the current stage in object-local units (read-only).
function qaTargetsLocal(scene) {
  const m = scene.mechanic;
  const st = scene.stack;
  if (!m || !st) return null;
  if (m.itemsLocal) return { kind: 'drag', items: m.itemsLocal(), target: m.targetLocal() };
  if (m.spotsLocal) return { kind: 'spots', spots: m.spotsLocal(), needsLoad: Boolean(m.needsLoad?.()), tub: m.params.source ? m.tubOpening() : null };
  const region = scene.stage?.region ?? scene.stage?.params?.region;
  const b = st.regionBounds(region);
  // sample the valid area on a coarse grid so tests can sweep exactly the work area
  const pts = [];
  const step = (b[2] - b[0]) / 40;
  for (let y = b[1]; y <= b[3]; y += step) for (let x = b[0]; x <= b[2]; x += step) if (st.inRegion(x, y, region)) pts.push([Math.round(x), Math.round(y)]);
  return { kind: 'area', bounds: b, points: pts, step };
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
    pause: s.pause.snapshot(),
    build: s.build,
    audio: { requested: s.audio.requested, played: s.audio.played },
  };
  if (!scene || !scene.layout) return base;
  const layout = scene.layout;
  const buttons = {};
  for (const [id, b] of scene.qaButtons ?? []) buttons[id] = rectToScreen(layout, b.worldRect());
  for (const [id, r] of scene.qaTargets ?? []) buttons[id] = rectToScreen(layout, r);
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
      stageCount: scene.level.stages.length,
      progress: scene.mechanic?.progress ?? 0,
      completedFlag: scene.mechanic?.completed ?? false,
      tool: scene.tool && {
        id: scene.tool.id,
        kind: scene.tool.kind,
        workOffset: { x: (scene.tool.workOffset?.x ?? 0) * k, y: (scene.tool.workOffset?.y ?? 0) * k },
        jetLength: (scene.tool.jetLength ?? 0) * k,
      },
      object: { x: c.x, y: c.y, radius: (scene.stack.radius ?? 0) * k },
      // object-local → CSS px transform (for driving real input on any object shape)
      xf: { cx: c.x, cy: c.y, k, size: scene.stack.size },
      region: scene.stage?.region ?? scene.stage?.params?.region ?? null,
      family: scene.family,
      brush: { radius: scene.stage?.params?.radius ?? null, aspect: scene.stage?.params?.aspect ?? 1, mechanic: scene.stage?.mechanic },
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
