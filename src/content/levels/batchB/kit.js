import { LEVEL_META } from '../../generated/levelMeta.js';

// Levels 16–50 (Step 8 Batch B): a level = its generated art stack + a list of stages built with
// the helpers below. The layer stack (bottom → top), the regions, the snapped points (junk,
// leaves, dents, screws) and the background family come from LEVEL_META (written by
// scripts/prepare_batch_b.py, the single source of the art stack); the configs here only choose
// the stage sequence. Every stage is plain level data for the existing mechanics.

const JUNK = ['toolbox-junk-rag', 'bathroom-sink-junk-tissue', 'toolbox-junk-bag', 'bathroom-sink-junk-soap', 'toolbox-junk-glove', 'bathroom-sink-junk-tube', 'bathroom-sink-junk-brush', 'toolbox-junk-bolt'];
const LEAVES = ['garden-bench-leaf-1', 'garden-bench-leaf-2', 'garden-bench-leaf-3', 'garden-bench-leaf-4', 'garden-bench-leaf-5'];
const SCREW = 46;
const DENT = 112;

export const TINT = { red: 0xd8322a, yellow: 0xf2c230, black: 0x24242a, gold: 0xd9a632, white: 0xf4f1ea, brown: 0x7a4a26, walnut: 0x6b3f22, turquoise: 0x3fc1b8, gray: 0x9aa0a6 };

export function makeLevel(id, title, stageFns, opts = {}) {
  const M = LEVEL_META.levels[id] ?? { bounds: [150, 150, 870, 870], stack: [], regions: {}, points: {}, bg: 'studio' };
  const [bx0, by0, bx1, by1] = M.bounds;
  const W = bx1 - bx0;
  const H = by1 - by0;
  const ctx = { id, M, bx0, by0, bx1, by1, W, H, P: M.points ?? {}, decals: [] };
  const regions = Object.fromEntries(Object.keys(M.regions ?? {}).map((r) => [r, { mask: `${id}-${r}-mask` }]));
  const stages = [];
  const seen = new Map();
  for (const fn of stageFns) {
    const st = fn(ctx);
    const n = (seen.get(st.id) ?? 0) + 1;
    seen.set(st.id, n);
    if (n > 1) st.id = `${st.id}-${n}`;
    stages.push(st);
  }
  const layers = [
    { id: 'clean', texture: `${id}-clean`, initial: 'full', static: true },
    ...M.stack.map(([lid, initial, tex]) => ({ id: lid, texture: `${id}-${tex}`, initial: opts.init?.[lid] ?? initial })),
    ...ctx.decals,
  ];
  return {
    id,
    title,
    backgrounds: { portrait: `bg-${M.bg}-portrait`, landscape: `bg-${M.bg}-landscape` },
    thumbnail: `${id}-thumb`,
    thumbnailClean: `${id}-thumb-clean`,
    resultPicture: `${id}-result-picture`,
    object: {
      canvasSize: 1024,
      mask: `${id}-mask`,
      outsideMask: `${id}-mask-outside`,
      shadow: 'flat',
      regions,
      focus: {
        side: [bx0 - W * 0.04, by0 - H * 0.06, bx1 + W * 0.42, by1 + 30],
        paint: [bx0 - W * 0.02, by0, bx1 + W * 0.02, by1 + 210],
        gems: [bx0 - W * 0.04, by0 - H * 0.04, bx1 + W * 0.42, by1 + 20],
      },
      layers,
      ...(opts.maxLong ? { maxLong: opts.maxLong } : {}),
    },
    stages,
  };
}

// ---- stage helpers (each returns (ctx) => stage) --------------------------------------------
const brush = (id, tool, params, extra = {}) => () => ({ id, tool, mechanic: 'brush', params: { threshold: 0.95, ...params }, targetSeconds: [6, 10], ...extra });
const zone = (region, dim = true) => (region ? { region, dim } : {});

export const S = {
  // drag junk / leaves off the object into the bin (or the skimmer net held at the pool side)
  trash: (pointsKey = 'junk', { leaves = false, target = 'trash-bin', id = leaves ? 'leaves' : 'trash' } = {}) => (c) => {
    const pts = c.P[pointsKey] ?? [];
    const tex = leaves ? LEAVES : JUNK;
    return {
      id,
      tool: target === 'trash-bin' ? 'trash-bin' : 'skimmer-net',
      mechanic: 'dragToTarget',
      focus: 'side',
      params: {
        target: { texture: target === 'trash-bin' ? 'trash-bin' : 'tool-skimmer-net', x: c.bx1 + c.W * 0.26, y: c.by1 - 60, size: 230, mouth: target === 'trash-bin' ? 0.62 : 0.55 },
        items: pts.map(([x, y], i) => ({ texture: tex[i % tex.length], x, y, size: leaves ? 140 : 170, angle: (i * 47) % 360 })),
      },
      targetSeconds: [5, 9],
    };
  },
  dust: (layers = ['dusty'], region) => brush('dust', 'duster', { mode: 'reveal', layers, radius: 55 }, zone(region)),
  foam: (region) => brush('foam-spray', 'foam-sprayer', { mode: 'apply', layer: 'foam', stamp: 'stamp-foam', radius: 100, threshold: 0.96 }, { family: 'foam', ...zone(region) }),
  scrub: (clear, region) => brush('scrub', 'scrub-brush', { mode: 'scrub', from: 'foam', under: 'scrubbed', clear, radius: 96, threshold: 0.96 }, { family: 'scrub', ...zone(region) }),
  rinse: (layers, region) => brush('rinse', 'washer-lance', { mode: 'reveal', layers, radius: 85, threshold: 0.96 }, { family: 'rinse', ...zone(region) }),
  wipe: (layers, region, id = 'wipe') => brush(id, 'cloth', { mode: 'reveal', layers, radius: 115 }, { family: 'wipe', ...zone(region) }),
  dry: (layers = ['wet'], region) => S.wipe(layers, region, 'dry'),
  polish: (layers = ['dull'], region) => brush('polish', 'polisher', { mode: 'reveal', layers, radius: 80 }, { family: 'polish', ...zone(region) }),
  laser: (layers, region) => brush('laser', 'laser', { mode: 'reveal', layers, radius: 62 }, { family: 'laser', ...zone(region) }),
  grind: (layers, region) => brush('grind', 'angle-grinder', { mode: 'reveal', layers, radius: 82 }, { family: 'grind', ...zone(region) }),
  wire: (layers, region) => brush('wire-brush', 'wire-brush', { mode: 'reveal', layers, radius: 44, aspect: 2.0, threshold: 0.94 }, { family: 'rust', ...zone(region) }),
  sand: (layers, region) => brush('sand', 'sandpaper', { mode: 'reveal', layers, radius: 60 }, { family: 'sand', fx: 'sawdust', ...zone(region) }),
  spray: (layers, region, tint) => brush('spray-paint', 'spray-gun', { mode: 'reveal', layers, radius: 95, threshold: 0.96, paintTint: tint }, { family: 'spray', ...zone(region) }),
  roll: (layers, region, tint) => (c) => ({ ...brush('roll', 'paint-roller', { mode: 'reveal', layers, radius: 38, aspect: 2.6, source: tray(c, tint) }, { family: 'roll', focus: 'paint', ...zone(region) })() }),
  paint: (layers, region, tint, id = 'paint') => (c) => ({ ...brush(id, 'paint-brush', { mode: 'reveal', layers, radius: 32, aspect: 1.8, threshold: 0.94, source: can(c, tint) }, { focus: 'paint', ...zone(region) })() }),
  stain: (layers, region, id = 'varnish') => brush(id, 'stain-sponge', { mode: 'reveal', layers, radius: 90 }, zone(region)),
  scrape: (layers, region, id = 'scrape') => brush(id, 'wide-scraper', { mode: 'reveal', layers, radius: 60 }, { family: 'scrape', ...zone(region) }),
  // Step 9: hold the skimmer net and sweep its head through the floating debris (collect mechanic)
  skim: (pointsKey = 'leaves') => (c) => ({
    id: 'skim',
    tool: 'skimmer-net',
    mechanic: 'collect',
    params: { catch: 70, items: (c.P[pointsKey] ?? []).map(([x, y], i) => ({ texture: LEAVES[i % LEAVES.length], x, y, size: 78, angle: (i * 47) % 360 })) },
    targetSeconds: [5, 8],
  }),
  // Step 9 large surfaces: the telescopic pool brush scrubs basins and paving (scrub mode)
  poolScrub: (clear, region) => brush('scrub', 'pool-brush', { mode: 'scrub', from: 'foam', under: 'scrubbed', clear, radius: 120, aspect: 1.6, threshold: 0.96 }, zone(region)),
  mitt: (layers, region, id = 'wash-mitt') => brush(id, 'wash-mitt', { mode: 'reveal', layers, radius: 120 }, zone(region)),
  crevice: (layers, region, id = 'crevice-brush') => brush(id, 'crevice-brush', { mode: 'reveal', layers, radius: 30 }, zone(region)),
  // scraping a crust with strokes (no chip hunting) — used where chips were tediously long
  scrapeCrust: (layers, region) => brush('scrape', 'wide-scraper', { mode: 'reveal', layers, radius: 48, aspect: 2.0, threshold: 0.94 }, { family: 'scrape', fx: 'chips', ...zone(region) }),
  steam: (layers, region) => brush('steam', 'steam-cleaner', { mode: 'reveal', layers, radius: 72 }, { fx: 'steam', ...zone(region) }),
  mist: (layers, region, id = 'spray-clean') => brush(id, 'spray-bottle', { mode: 'reveal', layers, radius: 88 }, zone(region)),
  blow: (layers, region) => brush('blow', 'air-blower', { mode: 'reveal', layers, radius: 80 }, zone(region)),
  swab: (layers, region) => brush('swab', 'cotton-swab', { mode: 'reveal', layers, radius: 34, threshold: 0.94 }, zone(region)),
  detail: (layers, region, id = 'detail-brush') => brush(id, 'detail-brush', { mode: 'reveal', layers, radius: 42 }, zone(region)),
  eraser: (layers, region) => brush('magic-eraser', 'eraser', { mode: 'reveal', layers, radius: 60 }, zone(region)),
  squeegee: (layers, region) => brush('squeegee', 'squeegee', { mode: 'reveal', layers, radius: 75 }, zone(region)),
  mop: (layers, region) => brush('mop', 'mop', { mode: 'reveal', layers, radius: 105 }, zone(region)),
  sharpen: (layers, region) => brush('sharpen', 'whetstone', { mode: 'reveal', layers, radius: 40, aspect: 1.6, threshold: 0.94 }, { fx: 'sparks', ...zone(region) }),
  // break a crust / caked mud / barnacles / old paint into chips
  chunks: (layer, { tool = 'wide-scraper', family = 'scrape', count = 18, seed = 1600, tip = 48 } = {}) => () => ({
    id: tool === 'chisel' ? 'chisel' : 'scrape',
    ...(family ? { family } : {}),
    tool,
    mechanic: 'chunkBreak',
    fx: 'chips',
    params: { layer, chunkCount: count, breakDistance: 120, tipRadius: tip, seed },
    targetSeconds: [9, 13],
  }),
  // hammer the dents out (watering-can dent decals, approved art)
  hammer: (pointsKey = 'dents') => (c) => {
    const pts = c.P[pointsKey] ?? [];
    const tex = (i) => `${c.id}-dent-${i + 1}`; // Step 9: dents made from this object's own surface
    if (!c.decals.some((d) => d.id === 'dents')) c.decals.push({ id: 'dents', initial: 'decals', decals: pts.map(([x, y], i) => ({ texture: tex(i), x, y, size: DENT })) });
    return {
      id: 'hammer',
      family: 'hammer',
      tool: 'hammer',
      mechanic: 'points',
      params: { mode: 'repeatedTap', action: 'remove', taps: 3, outline: false, targets: pts.map(([x, y], i) => ({ x, y, r: DENT * 0.6, texture: tex(i), size: DENT, layer: 'dents' })) },
      targetSeconds: [4, 7],
    };
  },
  // screws / bolts: out (remove, they leave the 'screws' decal layer) or in (install into 'screwsNew')
  screws: (pointsKey, action = 'remove') => (c) => {
    const pts = c.P[pointsKey] ?? [];
    const layer = action === 'remove' ? 'screws' : 'screwsNew';
    if (action === 'remove' && !c.decals.some((d) => d.id === 'screws')) c.decals.push({ id: 'screws', initial: 'decals', decals: pts.map(([x, y]) => ({ texture: 'desk-fan-screw', x, y, size: SCREW })) });
    if (!c.decals.some((d) => d.id === layer) && action !== 'remove') c.decals.push({ id: layer, initial: 'empty' });
    return {
      id: action === 'remove' ? 'unscrew' : 'screw-in',
      family: 'screw',
      tool: 'screwdriver',
      mechanic: 'points',
      params: { mode: action === 'remove' ? 'screw' : 'place', action, holdMs: 700, targets: pts.map(([x, y]) => ({ x, y, r: 40, texture: 'desk-fan-screw', size: SCREW, layer })) },
      targetSeconds: [4, 7],
    };
  },
  // carpet beater: tap the marked spots; each hit knocks the dust out around it, the rest of the
  // dust layer falls out when every spot is beaten
  beat: (pointsKey = 'beat', layer = 'dusty', region) => (c) => ({
    id: 'beat',
    tool: 'carpet-beater',
    mechanic: 'points',
    params: {
      mode: 'repeatedTap',
      action: 'remove',
      taps: 3,
      ...(region ? { region } : {}),
      clearOnFinish: [layer],
      targets: (c.P[pointsKey] ?? defaultGrid(c)).map(([x, y]) => ({ x, y, r: 70, eraseOnHit: { layer, r: 150 } })),
    },
    targetSeconds: [5, 8],
  }),
  drain: (layer, region) => () => ({ id: 'drain', tool: 'pump', mechanic: 'fill', params: { mode: 'drain', layer, region, seconds: 4 }, targetSeconds: [4, 6] }),
  fill: (layer, region) => () => ({ id: 'fill', tool: 'hose', mechanic: 'fill', params: { mode: 'fill', layer, region, seconds: 4 }, targetSeconds: [4, 6] }),
  // royal throne: set the cleaned gems back into their sockets (the empty socket art is erased)
  gems: () => (c) => {
    const gems = c.M.gems ?? [];
    c.decals.push({ id: 'gemsSet', initial: 'empty' });
    return {
      id: 'gems',
      tool: 'gem-set',
      mechanic: 'dragToTarget',
      focus: 'gems',
      params: {
        items: gems.map(([x, y, size], i) => ({ texture: `${c.id}-gem-${i + 1}`, x: c.bx1 + c.W * 0.22, y: c.by0 + c.H * (0.15 + i * 0.13), size: Math.max(60, size * 1.6), angle: 0, slot: { x, y, size } })),
        onPlace: { stamp: 'gemsSet', erase: 'sockets' },
      },
      targetSeconds: [4, 8],
    };
  },
};

function defaultGrid(c) {
  const out = [];
  for (const fy of [0.3, 0.7]) for (const fx of [0.25, 0.5, 0.75]) out.push([Math.round(c.bx0 + c.W * fx), Math.round(c.by0 + c.H * fy)]);
  return out;
}

function can(c, tint) {
  return { texture: 'garden-bench-paint-can', x: c.bx1 - c.W * 0.1, y: c.by1 + 95, size: 190, opening: { dx: 0, dy: -0.12, r: 0.26 }, capacity: 2200, load: 'fx-dot', tint };
}

function tray(c, tint) {
  return { texture: 'garden-bench-paint-tray', x: c.bx0 + c.W * 0.2, y: c.by1 + 95, size: 260, opening: { dx: 0.08, dy: 0.05, r: 0.24 }, capacity: 2600, load: 'fx-dot', tint };
}
