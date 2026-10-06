import { describe, it, expect, vi } from 'vitest';
import { CoverageGrid } from '../../src/mechanics/CoverageGrid.js';
import { buildChunkMap } from '../../src/mechanics/chunkMap.js';
import { BrushMechanic } from '../../src/mechanics/BrushMechanic.js';
import { ChunkBreakMechanic } from '../../src/mechanics/ChunkBreakMechanic.js';
import { SaveService, parseSave, SaveCorruptError, createDefaultState } from '../../src/services/SaveService.js';
import { RewardService } from '../../src/services/RewardService.js';
import { AudioService } from '../../src/services/AudioService.js';
import { PauseState } from '../../src/core/PauseState.js';
import { createDevPlatform } from '../../src/platform/dev/DevPlatform.js';
import { assertPlatform } from '../../src/platform/contract.js';
import { DragToTargetMechanic } from '../../src/mechanics/DragToTargetMechanic.js';
import { SpotsMechanic } from '../../src/mechanics/SpotsMechanic.js';
import { validateCatalog, getLevel, DISPLAY_ORDER, nextLevelId } from '../../src/content/catalog.js';
import { economy } from '../../src/content/economy.js';
import { computeLayout, fitObject, UI } from '../../src/ui/layout.js';

const SIZE = 640;
const R = 300;
const inside = (x, y) => Math.hypot(x - SIZE / 2, y - SIZE / 2) <= R;

// Fake object stack: records surface operations, same geometry as the real one.
function fakeStack() {
  const ops = [];
  return {
    size: SIZE,
    radius: R,
    center: { x: 540, y: 860 },
    ops,
    toLocal: (w) => ({ x: w.x - 540 + SIZE / 2, y: w.y - 860 + SIZE / 2 }),
    isInside: inside,
    touchesObject: (x, y, r) => Math.hypot(x - SIZE / 2, y - SIZE / 2) <= R + r,
    erase: (id) => ops.push(['erase', id]),
    paint: (id) => ops.push(['paint', id]),
    clipToObject: (id) => ops.push(['clip', id]),
    fadeOutLayers: async () => {},
    fillLayer: async () => {},
    detachChunk: (id) => ops.push(['detach', id]),
    waitForFallingChunks: async () => {},
  };
}

// Serpentine sweep across the object in world coordinates.
function sweep(mech, step = 50) {
  let dir = 1;
  for (let y = 860 - R; y <= 860 + R; y += step) {
    const a = { x: 540 - R * dir, y };
    const b = { x: 540 + R * dir, y };
    mech.stroke(a, b);
    dir = -dir;
  }
}

describe('CoverageGrid', () => {
  it('counts only inside cells and never double-counts', () => {
    const g = new CoverageGrid({ size: SIZE, cells: 48, isInside: inside });
    expect(g.total).toBeGreaterThan(1000);
    const first = g.mark(320, 320, 40);
    expect(first).toBeGreaterThan(0);
    expect(g.mark(320, 320, 40)).toBe(0);
    expect(g.mark(5, 5, 20)).toBe(0); // corner is outside the circle
  });
});

describe('chunk map', () => {
  it('is deterministic and splits the crust into the requested number of chunks (±slivers merged)', () => {
    const a = buildChunkMap({ size: SIZE, res: 160, radius: 306, count: 24, seed: 1201 });
    const b = buildChunkMap({ size: SIZE, res: 160, radius: 306, count: 24, seed: 1201 });
    expect(Array.from(a.labels)).toEqual(Array.from(b.labels));
    expect(a.chunkCount).toBeGreaterThanOrEqual(16);
    expect(a.chunkCount).toBeLessThanOrEqual(24);
    expect(a.counts.every((n) => n > 0)).toBe(true);
    expect(a.labelAt(2, 2)).toBe(-1);
    expect(a.labelAt(320, 320)).toBeGreaterThanOrEqual(0);
  });
});

describe('BrushMechanic', () => {
  const reveal = { mode: 'reveal', layers: ['dusty'], radius: 88, threshold: 0.96 };

  it('completes only after the surface is actually covered', () => {
    const m = new BrushMechanic({ stack: fakeStack(), params: reveal });
    expect(m.completed).toBe(false);
    sweep(m, 60);
    expect(m.progress).toBeGreaterThanOrEqual(0.96);
    expect(m.completed).toBe(true);
  });

  it('ignores strokes outside the object', () => {
    const stack = fakeStack();
    const m = new BrushMechanic({ stack, params: reveal });
    m.stroke({ x: 0, y: 200 }, { x: 1080, y: 200 }); // far above the ball
    m.stroke({ x: 100, y: 1700 }, { x: 900, y: 1700 }); // far below
    expect(m.progress).toBe(0);
    expect(stack.ops.length).toBe(0);
  });

  it('a tap or repeated taps in one spot can never complete a stage', () => {
    const m = new BrushMechanic({ stack: fakeStack(), params: reveal });
    for (let i = 0; i < 200; i++) m.tap({ x: 540, y: 860 });
    expect(m.progress).toBeLessThan(0.2);
    expect(m.completed).toBe(false);
  });

  it('a held jet on one spot cannot complete; spraying off the object adds nothing', () => {
    const m = new BrushMechanic({ stack: fakeStack(), params: { mode: 'apply', layer: 'foam', stamp: 's', radius: 95, threshold: 0.96 } });
    for (let i = 0; i < 600; i++) m.spray({ x: 100, y: 200 }, 1 / 60); // off the ball
    expect(m.progress).toBe(0);
    for (let i = 0; i < 600; i++) m.spray({ x: 540, y: 860 }, 1 / 60); // 10 s on one spot
    expect(m.progress).toBeLessThan(0.25);
    expect(m.completed).toBe(false);
  });

  it('scrub mode lays the scrubbed foam under the fresh foam once, then only erases foam and grime', () => {
    const stack = fakeStack();
    const filled = [];
    stack.fillLayer = async (id, d) => filled.push([id, d]);
    const m = new BrushMechanic({ stack, params: { mode: 'scrub', from: 'foam', under: 'scrubbed', clear: ['stained'], radius: 85, threshold: 0.96 } });
    expect(filled).toEqual([['scrubbed', 0]]);
    m.stroke({ x: 500, y: 860 }, { x: 580, y: 860 });
    const kinds = new Set(stack.ops.map(([k, id]) => `${k}:${id}`));
    expect(kinds).toEqual(new Set(['erase:foam', 'erase:stained']));
  });
});

describe('ChunkBreakMechanic', () => {
  const map = buildChunkMap({ size: SIZE, res: 320, radius: 306, count: 24, seed: 1201 });
  const params = { layer: 'mud', chunkCount: 24, breakDistance: 120, tipRadius: 26 };

  it('taps and holding still remove nothing', () => {
    const m = new ChunkBreakMechanic({ stack: fakeStack(), params, chunkMap: map });
    for (let i = 0; i < 100; i++) {
      m.tap({ x: 540, y: 860 });
      m.stroke({ x: 540, y: 860 }, { x: 540, y: 860 });
    }
    expect(m.removedCount).toBe(0);
  });

  it('dragging across the crust removes chunks until all are gone', () => {
    const stack = fakeStack();
    const m = new ChunkBreakMechanic({ stack, params, chunkMap: map });
    for (let pass = 0; pass < 12 && !m.completed; pass++) sweep(m, 30);
    expect(m.completed).toBe(true);
    expect(m.removedCount).toBe(map.chunkCount);
    expect(stack.ops.filter(([k]) => k === 'detach').length).toBe(map.chunkCount);
  });
});

describe('SaveService', () => {
  it('starts from defaults on an empty save and writes only after load', async () => {
    const p = createDevPlatform();
    const save = new SaveService(p);
    expect(() => save.update(() => {})).toThrow();
    await save.load();
    expect(save.get('coins')).toBe(0);
    await save.update((s) => (s.coins = 7));
    expect(JSON.parse(p.dev.peekStoredData()).coins).toBe(7);
  });

  it('a read error is not an empty save and keeps writes disabled', async () => {
    const p = createDevPlatform();
    await p.saveData(JSON.stringify({ ...createDefaultState(), coins: 99 }));
    p.dev.failNextLoad();
    const save = new SaveService(p);
    await expect(save.load()).rejects.toThrow();
    expect(save.loaded).toBe(false);
    expect(() => save.update((s) => (s.coins = 0))).toThrow();
    expect(JSON.parse(p.dev.peekStoredData()).coins).toBe(99);
    await save.load();
    expect(save.get('coins')).toBe(99);
  });

  it('save failure is reported and retried on the next write', async () => {
    const p = createDevPlatform();
    const save = new SaveService(p);
    await save.load();
    p.dev.failNextSave();
    await expect(save.update((s) => (s.coins = 1))).rejects.toThrow();
    expect(save.status).toBe('error');
    await save.update((s) => (s.coins = 2));
    expect(JSON.parse(p.dev.peekStoredData()).coins).toBe(2);
    expect(save.status).toBe('ready');
  });

  it('migration sanitises values and rejects corrupt or future saves', () => {
    expect(parseSave(JSON.stringify({ version: 1, coins: -5, levels: { x: { completed: 1, completions: '3' } } }))).toMatchObject({ coins: 0, levels: { x: { completed: true, completions: 3 } } });
    expect(() => parseSave('{not json')).toThrow(SaveCorruptError);
    expect(() => parseSave(JSON.stringify({ version: 99 }))).toThrow(SaveCorruptError);
  });
});

describe('RewardService', () => {
  it('grants once per run and records completion', async () => {
    const p = createDevPlatform();
    const save = new SaveService(p);
    await save.load();
    const rewards = new RewardService({ save, economy });
    const listener = vi.fn();
    rewards.on('granted', listener);
    const a = rewards.grantLevelCompletion('soccer-ball', 1);
    const b = rewards.grantLevelCompletion('soccer-ball', 1);
    expect(a).toBe(b);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(save.get('coins')).toBe(15);
    rewards.grantLevelCompletion('soccer-ball', 2); // a replay is a new run
    expect(save.get('coins')).toBe(30);
    expect(save.get('levels.soccer-ball')).toEqual({ completed: true, completions: 2 });
    await a.savePromise;
  });
});

describe('Rewards: boost x2…x5, timed chest, level-progress chest (Step 6 reward pass)', () => {
  async function setup({ ad = 'earned', now = 1_000_000 } = {}) {
    const platform = createDevPlatform({ rewardedOutcome: ad, rewardedDelayMs: 1 });
    const save = new SaveService(platform);
    await save.load();
    const clock = { now };
    const pause = new PauseState();
    const rewards = new RewardService({ save, economy, platform, pause, clock: () => clock.now });
    return { platform, save, rewards, clock, pause };
  }

  it('boost: the locked multiplier (x2 / x3 / x5) pays base × multiplier once; invalid values and repeated / parallel claims pay nothing', async () => {
    for (const m of [2, 3, 5]) {
      const { save, rewards, pause } = await setup();
      const c = rewards.grantLevelCompletion('chair', 1); // +20
      expect(rewards.boostOffer(c.completionId)).toMatchObject({ available: true, base: 20, values: [2, 3, 5], zones: [2, 3, 5, 3, 2] });
      const pausedDuringAd = [];
      pause.on('change', (sn) => pausedDuringAd.push(sn.reasons.includes('adBusy')));
      const [a, b] = await Promise.all([rewards.claimBoost(c.completionId, m), rewards.claimBoost(c.completionId, m)]);
      expect([a.status, b.status].sort()).toEqual(['granted', 'unavailable']);
      expect(save.get('coins')).toBe(20 * m);
      expect(pausedDuringAd).toContain(true);
      expect(pause.has('adBusy')).toBe(false);
      expect((await rewards.claimBoost(c.completionId, 5)).status).toBe('unavailable');
      expect(save.get('coins')).toBe(20 * m);
      expect(rewards.boostOffer(c.completionId)).toMatchObject({ available: false, claimed: true, boost: m });
    }
    const { save, rewards } = await setup();
    const c = rewards.grantLevelCompletion('chair', 1);
    for (const bad of [1, 4, 6, 3.5, 10]) expect((await rewards.claimBoost(c.completionId, bad)).status).toBe('invalid');
    expect(save.get('coins')).toBe(20);
    // an older completion's boost can never be claimed once a newer level is completed
    const c2 = rewards.grantLevelCompletion('rug', 2);
    expect(rewards.boostOffer(c.completionId).available).toBe(false);
    expect(rewards.boostOffer(c2.completionId).available).toBe(true);
  });

  it('boost: cancelled, failed or unavailable ads grant nothing and keep the offer', async () => {
    for (const ad of ['not-earned', 'error', 'unavailable']) {
      const { save, rewards } = await setup({ ad });
      const c = rewards.grantLevelCompletion('chair', 1);
      const r = await rewards.claimBoost(c.completionId, 5);
      expect(r.status).toBe(ad);
      expect(save.get('coins')).toBe(20);
      expect(rewards.boostOffer(c.completionId).available).toBe(true);
    }
  });

  it('boost claim survives a reload (multiplier stored in the save); old x3 saves migrate', async () => {
    const { platform, rewards } = await setup();
    const c = rewards.grantLevelCompletion('chair', 1);
    await rewards.claimBoost(c.completionId, 5);
    const save2 = new SaveService(platform);
    await save2.load();
    const r2 = new RewardService({ save: save2, economy, platform });
    expect(r2.boostOffer(c.completionId)).toMatchObject({ available: false, claimed: true, boost: 5 });
    expect(save2.get('coins')).toBe(100);
    const old = parseSave(JSON.stringify({ version: 2, lastCompletion: { id: 3, levelId: 'rug', amount: 15, x3: true } }));
    expect(old.lastCompletion).toEqual({ id: 3, levelId: 'rug', amount: 15, boost: 3 });
  });

  it('progress chest: skipping a full chest after the warning forfeits it (no reward); not possible before 100 %', async () => {
    const { save, rewards } = await setup();
    rewards.grantLevelCompletion('chair', 1);
    expect(rewards.forfeitProgressChest().status).toBe('unavailable');
    for (let run = 2; run <= 5; run++) rewards.grantLevelCompletion('chair', run);
    const coins = save.get('coins');
    expect(rewards.forfeitProgressChest().status).toBe('forfeited');
    expect(rewards.forfeitProgressChest().status).toBe('unavailable');
    expect(save.get('progressChest')).toEqual({ steps: 0, opened: 0, forfeited: 1 });
    expect(save.get('coins')).toBe(coins);
  });

  it('timed chest: countdown, claim once, reset, persistence, clock jump repair', async () => {
    const { platform, save, rewards, clock } = await setup();
    const cfg = economy.rewards.timedChest;
    await rewards.ensureTimedChest();
    expect(rewards.timedChestState()).toMatchObject({ ready: false, remainingMs: cfg.firstDelaySec * 1000 });
    expect(rewards.claimTimedChest().status).toBe('not-ready');
    clock.now += 30_000;
    expect(rewards.timedChestState().remainingMs).toBe((cfg.firstDelaySec - 30) * 1000);
    clock.now += cfg.firstDelaySec * 1000;
    expect(rewards.timedChestState().ready).toBe(true);
    const a = rewards.claimTimedChest();
    const b = rewards.claimTimedChest();
    expect(a.status).toBe('granted');
    expect(b.status).toBe('not-ready');
    expect(save.get('coins')).toBe(cfg.coins);
    expect(rewards.timedChestState()).toMatchObject({ ready: false, remainingMs: cfg.intervalSec * 1000 });
    await a.savePromise;
    // reload: the timer continues from the saved time (not reset)
    const save2 = new SaveService(platform);
    await save2.load();
    const r2 = new RewardService({ save: save2, economy, platform, clock: () => clock.now + 10_000 });
    await r2.ensureTimedChest();
    expect(r2.timedChestState().remainingMs).toBe((cfg.intervalSec - 10) * 1000);
    // device clock moved far back: the timer is repaired to one interval, never stuck
    const r3 = new RewardService({ save: save2, economy, platform, clock: () => clock.now - 86_400_000 });
    await r3.ensureTimedChest();
    expect(r3.timedChestState().remainingMs).toBe(cfg.intervalSec * 1000);
  });

  it('progress chest: +20 % per completed run, offer at 100 %, no reset on cancel, reset after a successful claim', async () => {
    const { platform, save, rewards } = await setup({ ad: 'not-earned' });
    const seen = [];
    for (let run = 1; run <= 5; run++) {
      const r = rewards.grantLevelCompletion(run % 2 ? 'chair' : 'chair', run); // same level counts: completions, not unique levels
      rewards.grantLevelCompletion('chair', run); // duplicate call for the same run: ignored
      seen.push(Math.round(rewards.progressChestState().progress * 100));
      expect(r.chestStepsAfter).toBe(run);
    }
    expect(seen).toEqual([20, 40, 60, 80, 100]);
    expect(rewards.progressChestState().full).toBe(true);
    rewards.grantLevelCompletion('rug', 99); // more completions while full: stays at 100 %
    expect(rewards.progressChestState().steps).toBe(5);
    const coins = save.get('coins');
    for (const ad of ['not-earned', 'error', 'unavailable']) {
      platform.dev.setRewardedOutcome(ad);
      expect((await rewards.claimProgressChest()).status).toBe(ad);
      expect(rewards.progressChestState().full).toBe(true); // never silently reset
    }
    expect(save.get('coins')).toBe(coins);
    platform.dev.setRewardedOutcome('earned');
    const [a, b] = await Promise.all([rewards.claimProgressChest(), rewards.claimProgressChest()]);
    expect([a.status, b.status].sort()).toEqual(['granted', 'unavailable']);
    expect(save.get('coins')).toBe(coins + economy.rewards.progressChest.coins);
    expect(save.get('diamonds')).toBe(economy.rewards.progressChest.diamonds);
    expect(rewards.progressChestState()).toMatchObject({ steps: 0, full: false });
    expect((await rewards.claimProgressChest()).status).toBe('unavailable');
    // persisted
    const save2 = new SaveService(platform);
    await save2.load();
    expect(save2.get('progressChest')).toEqual({ steps: 0, opened: 1, forfeited: 0 });
  });

  it('save v1 migrates to v2 with empty reward state', () => {
    const st = parseSave(JSON.stringify({ version: 1, coins: 40, levels: { rug: { completed: true, completions: 2 } } }));
    expect(st).toMatchObject({ version: 2, coins: 40, completionSeq: 0, lastCompletion: null, timedChest: { readyAt: 0 }, progressChest: { steps: 0, opened: 0, forfeited: 0 } });
  });
});

describe('PauseState and AudioService gate', () => {
  it('host resume does not lift the user pause', () => {
    const ps = new PauseState();
    ps.set('user', true);
    ps.set('host', true);
    ps.set('host', false);
    expect(ps.isPaused).toBe(true);
    ps.set('user', false);
    expect(ps.isPaused).toBe(false);
  });

  it('audio plays only when setting, platform and pause all allow it', async () => {
    const p = createDevPlatform();
    const save = new SaveService(p);
    await save.load();
    const pause = new PauseState();
    const audio = new AudioService({ save, pause });
    expect(audio.canPlay).toBe(false); // platform state unknown yet
    audio.setPlatformAudio(true);
    expect(audio.canPlay).toBe(true);
    pause.set('host', true);
    expect(audio.canPlay).toBe(false);
    pause.set('host', false);
    await save.update((s) => (s.settings.sound = false));
    expect(audio.canPlay).toBe(false);
  });
});

describe('Dev platform contract', () => {
  it('implements every contract method and reports explicit results', async () => {
    const p = assertPlatform(createDevPlatform());
    const info = await p.init();
    expect(info.capabilities).toMatchObject({ cloudSave: true });
    expect(await p.loadData()).toBe('');
    await expect(p.saveData(123)).rejects.toThrow();
    expect((await p.requestRewarded('x')).result).toBe('earned');
    expect((await p.requestRewarded('')).result).toBe('error');
    await expect(p.sendScore(1.5)).rejects.toThrow();
    const seen = [];
    const unsub = p.subscribe((s) => seen.push(s));
    p.dev.setPaused(true);
    unsub();
    p.dev.setPaused(false);
    expect(seen).toEqual([{ paused: false, audioEnabled: true }, { paused: true, audioEnabled: true }]);
  });
});

describe('Content', () => {
  it('catalog is valid and the soccer ball has the 6 reference stages in order', () => {
    expect(validateCatalog()).toEqual([]);
    expect(DISPLAY_ORDER).toEqual(['soccer-ball', 'rug', 'golden-trophy', 'chair', 'sneaker']);
    const lvl = getLevel('soccer-ball');
    expect(lvl.stages.map((s) => s.tool)).toEqual(['chisel', 'dry-brush', 'foam-sprayer', 'scrub-brush', 'washer-lance', 'cloth']);
    expect(nextLevelId('soccer-ball')).toBe('rug');
    expect(nextLevelId('chair')).toBe('sneaker');
    expect(nextLevelId('sneaker')).toBe(null);
  });
});

describe('Responsive layout', () => {
  const sizes = [[390, 844, 2], [360, 640, 3], [844, 390, 2], [1280, 800, 1], [1920, 1080, 1], [768, 1024, 2], [320, 240, 1]];

  it('UI is larger than the CP1 prototype and touch targets stay ≥ 48 CSS px', () => {
    const phone = computeLayout(390 * 2, 844 * 2, 2);
    // CP1 prototype: current tile ≈ 53 CSS px on a 390-px phone; now 80.
    expect((UI.tile * phone.u) / phone.dpr).toBeGreaterThanOrEqual(78);
    for (const [w, h, d] of sizes) {
      const l = computeLayout(w * Math.min(d, 2), h * Math.min(d, 2), Math.min(d, 2));
      expect((UI.pause * l.u) / l.dpr).toBeGreaterThanOrEqual(48);
    }
  });

  it('narrow phones use the two-row HUD; wide screens keep the single reference row', () => {
    expect(computeLayout(390 * 2, 844 * 2, 2).compact).toBe(true);
    expect(computeLayout(1280, 800, 1).compact).toBe(false);
    expect(computeLayout(1920, 1080, 1).compact).toBe(false);
  });

  it('the object fits below the HUD, inside the screen, with room for jets below it', () => {
    for (const [w, h, dd] of sizes) {
      const d = Math.min(dd, 2);
      const l = computeLayout(w * d, h * d, d);
      const f = fitObject(l, 440);
      expect(f.cy - f.R).toBeGreaterThanOrEqual(l.hudBottom - 0.5);
      expect(f.cx - f.R).toBeGreaterThanOrEqual(0);
      expect(f.cx + f.R).toBeLessThanOrEqual(l.W);
      if (h >= 390) {
        // finger position for a jet aimed at the bottom of the ball stays on screen
        const fingerY = f.cy + f.R + 520 * f.scale + 60 * f.scale;
        expect(fingerY).toBeLessThanOrEqual(l.H);
      }
      expect(f.scale).toBeGreaterThan(0);
    }
  });
});

describe('Levels 2–5 content (reference stage order)', () => {
  it('stage tool sequences follow REFERENCE-BREAKDOWN', () => {
    const tools = (id) => getLevel(id).stages.map((s) => s.tool);
    expect(tools('rug')).toEqual(['washer-lance', 'squeegee', 'foam-sprayer', 'scrub-brush', 'washer-lance', 'squeegee']);
    expect(tools('golden-trophy')).toEqual(['chisel', 'dry-brush', 'detail-brush', 'mist-nozzle', 'foam-sprayer', 'scrub-brush', 'washer-lance', 'cloth']);
    expect(tools('chair')).toEqual(['trash-bin', 'duster', 'duster', 'foam-can', 'drill-brush', 'cloth', 'putty-knife', 'sandpaper', 'stain-sponge']);
    expect(tools('sneaker')).toEqual(['chisel', 'washer-lance', 'foam-sprayer', 'drill-brush', 'washer-lance', 'cloth', 'eraser']);
  });
});

// Minimal fake scene/stack for the drag and spot mechanics (no Phaser).
function fakeImage(x = 0, y = 0) {
  const o = { x, y, angle: 0, scale: 1, alpha: 1, visible: true, width: 100, height: 100, displayWidth: 100, displayHeight: 100 };
  o.setScale = (s) => ((o.scale = s), (o.displayWidth = 100 * s), (o.displayHeight = 100 * s), o);
  o.setAngle = (a) => ((o.angle = a), o);
  o.setPosition = (a, b) => ((o.x = a), (o.y = b), o);
  o.setVisible = (v) => ((o.visible = v), o);
  o.destroy = () => {};
  return o;
}
function fakeScene() {
  return {
    add: { image: (x, y) => fakeImage(x, y), graphics: () => ({ clear() {}, lineStyle() {}, beginPath() {}, arc() {}, strokePath() {}, destroy() {} }) },
    // tween stub: applies end values immediately
    tweens: { add: (cfg) => { Object.assign(cfg.targets, Object.fromEntries(Object.entries(cfg).filter(([k]) => ['x', 'y', 'alpha', 'angle'].includes(k)))); cfg.onComplete?.(); } },
  };
}
function overlayStack() {
  const ops = [];
  return {
    size: 1024,
    ops,
    overlay: { add() {}, addAt() {}, bringToTop() {}, moveBelow() {} },
    childPos: (x, y) => ({ x: x - 512, y: y - 512 }),
    toLocal: (w) => ({ x: w.x, y: w.y }), // world == local in this fake
    regionCircles: () => [[300, 300, 40], [700, 300, 40]],
    stampTexture: (...a) => ops.push(a),
    clipToObject: (id) => ops.push(['clip', id]),
  };
}

describe('DragToTargetMechanic', () => {
  const params = { target: { texture: 'bin', x: 512, y: 900, size: 200 }, items: [{ texture: 'a', x: 300, y: 300, size: 100 }, { texture: 'b', x: 700, y: 300, size: 100 }] };
  it('drops only over the target; empty-space presses and wrong drops do nothing', () => {
    const m = new DragToTargetMechanic({ stack: overlayStack(), params, scene: fakeScene() });
    expect(m.grab({ x: 50, y: 50 })).toBe(false); // empty space
    expect(m.grab({ x: 300, y: 300 })).toBe(true);
    m.drag({ x: 300, y: 600 });
    m.release(); // not over the bin → back home
    expect(m.progress).toBe(0);
    expect(m.grab({ x: 300, y: 300 })).toBe(true);
    m.drag({ x: 512, y: 880 });
    m.release();
    expect(m.progress).toBe(0.5);
    m.grab({ x: 700, y: 300 });
    m.drag({ x: 512, y: 890 });
    m.release();
    expect(m.completed).toBe(true);
  });
});

describe('SpotsMechanic', () => {
  it('needs rubbing inside each spot; taps and strokes elsewhere add nothing', () => {
    const m = new SpotsMechanic({ stack: overlayStack(), params: { region: 'spots', layer: 'putty', stamps: ['p'], fillDistance: 200 }, scene: fakeScene() });
    for (let i = 0; i < 50; i++) m.tap({ x: 300, y: 300 });
    m.stroke({ x: 500, y: 600 }, { x: 900, y: 600 });
    expect(m.progress).toBe(0);
    for (let i = 0; i < 10; i++) m.stroke({ x: 280, y: 300 }, { x: 320, y: 300 });
    expect(m.progress).toBe(0.5);
    for (let i = 0; i < 10; i++) m.stroke({ x: 680, y: 300 }, { x: 720, y: 300 });
    expect(m.completed).toBe(true);
  });
});

describe('Step 6: soft auto-complete and putty dip', () => {
  it('finishes when only small scattered remnants are left, never with a big unfinished patch', async () => {
    const { BrushMechanic: B } = await import('../../src/mechanics/BrushMechanic.js');
    // big patch: cover everything except the left 12 % band (one connected area)
    const m1 = new B({ stack: fakeStack(), params: { mode: 'reveal', layers: ['d'], radius: 40, threshold: 0.99 } });
    for (let y = 860 - R; y <= 860 + R; y += 25) m1.stroke({ x: 540 - R * 0.55, y }, { x: 540 + R, y });
    expect(m1.progress).toBeGreaterThan(0.85);
    m1.stroke({ x: 540, y: 860 }, { x: 541, y: 860 });
    expect(m1.completed).toBe(false);
    // scattered remnants: dense sweep leaving only gaps of a few cells
    const m2 = new B({ stack: fakeStack(), params: { mode: 'reveal', layers: ['d'], radius: 40, threshold: 0.99 } });
    for (let y = 860 - R; y <= 860 + R; y += 46) m2.stroke({ x: 540 - R, y }, { x: 540 + R, y });
    const g = m2.grid;
    if (!m2.completed) {
      await new Promise((r) => setTimeout(r, 160));
      m2.stroke({ x: 540, y: 860 }, { x: 541, y: 860 });
    }
    expect(g.progress).toBeGreaterThanOrEqual(0.85);
    expect(m2.completed).toBe(true);
  });

  it('chisel: the last small crumbs break off by themselves; a large piece still needs the chisel', () => {
    const map = buildChunkMap({ size: SIZE, res: 320, radius: 306, count: 24, seed: 1201 });
    const params = { layer: 'mud', chunkCount: 24, breakDistance: 120, tipRadius: 26 };
    const ids = [...Array(map.chunkCount).keys()].sort((a, b) => map.counts[a] - map.counts[b]);
    const area = map.counts.reduce((a, b) => a + b, 0);
    // remove the smallest chunks first, keep the three largest: big remaining piece → no auto-complete
    const big = new ChunkBreakMechanic({ stack: fakeStack(), params, chunkMap: map });
    const keep = ids.slice(-3);
    for (const id of ids.slice(0, -3)) big._remove(id, 1);
    const leftBig = keep.reduce((a, id) => a + map.counts[id], 0) / area;
    expect(big.progress).toBeGreaterThanOrEqual(0.85);
    expect(leftBig).toBeGreaterThan(0.08);
    expect(big.completed).toBe(false);
    // remove the largest first: once only the smallest crumbs are left (≤ 8 %), they fall off
    const small = new ChunkBreakMechanic({ stack: fakeStack(), params, chunkMap: map });
    for (const id of [...ids].reverse()) {
      if (small.completed) break;
      small._remove(id, 1);
    }
    expect(small.completed).toBe(true);
    expect(small.removedCount).toBe(map.chunkCount);
  });

  it('a long soft head (duster) cleans an upright band of the head shape, not a circle', () => {
    const plain = new BrushMechanic({ stack: fakeStack(), params: { mode: 'reveal', layers: ['d'], radius: 30, threshold: 0.99 } });
    const duster = new BrushMechanic({ stack: fakeStack(), params: { mode: 'reveal', layers: ['d'], radius: 30, threshold: 0.99 }, tool: { head: [0.2, 0.5] } });
    expect(duster.aspectY).toBeCloseTo(2.25, 2);
    plain.stroke({ x: 440, y: 860 }, { x: 640, y: 860 });
    duster.stroke({ x: 440, y: 860 }, { x: 640, y: 860 });
    // same sweep, the band is about head-length tall instead of head-width
    expect(duster.grid.progress / plain.grid.progress).toBeGreaterThan(1.8);
    expect(duster.grid.progress / plain.grid.progress).toBeLessThan(2.6);
  });

  it('putty: rubbing a dent with an empty knife does nothing; after dipping it fills one dent', () => {
    const stack = overlayStack();
    const m = new SpotsMechanic({ stack, params: { region: 'spots', layer: 'putty', stamps: ['p'], fillDistance: 200, source: { texture: 'tub', x: 512, y: 900, size: 200, load: 'p' } }, scene: { ...fakeScene(), tools: { setLoad() {} } } });
    for (let i = 0; i < 10; i++) m.stroke({ x: 280, y: 300 }, { x: 320, y: 300 });
    expect(m.progress).toBe(0);
    expect(m.needsLoad()).toBe(true);
    const t = m.tubOpening();
    for (let i = 0; i < 4; i++) m.stroke({ x: t.x - 30, y: t.y }, { x: t.x + 30, y: t.y });
    expect(m.needsLoad()).toBe(false);
    for (let i = 0; i < 10; i++) m.stroke({ x: 280, y: 300 }, { x: 320, y: 300 });
    expect(m.progress).toBe(0.5);
    expect(m.needsLoad()).toBe(true); // next dent needs a new dip
  });
});
