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

  it('transform mode erases from-layer, paints to-layer and clears listed layers', () => {
    const stack = fakeStack();
    const m = new BrushMechanic({ stack, params: { mode: 'transform', from: 'foam', to: 'swirl', stamp: 's', clear: ['stained'], radius: 85, threshold: 0.96 } });
    m.stroke({ x: 500, y: 860 }, { x: 580, y: 860 });
    const kinds = new Set(stack.ops.map(([k, id]) => `${k}:${id}`));
    expect(kinds).toEqual(new Set(['erase:foam', 'paint:swirl', 'erase:stained', 'clip:swirl']));
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
    expect(DISPLAY_ORDER).toEqual(['soccer-ball']);
    const lvl = getLevel('soccer-ball');
    expect(lvl.stages.map((s) => s.tool)).toEqual(['chisel', 'dry-brush', 'foam-sprayer', 'scrub-brush', 'washer-lance', 'cloth']);
    expect(nextLevelId('soccer-ball')).toBe(null);
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
