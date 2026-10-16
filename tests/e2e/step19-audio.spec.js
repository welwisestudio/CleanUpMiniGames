import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, pressButton, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 9 audio (2026-10-13), focused: one music instance shared by menu / level / Store / Wheel,
// Music and Sound toggles independent, tool loops play only while the tool works and stop on
// release / leaving, the right sound per tool, hits per strike, stage / level complete, chest,
// Wheel and UI events. Reads the read-only QA audio snapshot (no audio output is inspected).
const KEY = 'cleanup-dev-save';
const driver = async (page, info) => (info.project.name.includes('touch') ? touchDriver(page) : mouseDriver(page));

async function toStage(page, drv, id) {
  for (let i = 0; i < 9; i++) {
    const s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
    if (s.level.stageId === id) return s;
    await playStage5(page, drv);
  }
  throw new Error(`stage ${id} not reached`);
}

// plays the current stage; records the tool loop heard in the middle of the first stroke
async function playAndListen(page, drv) {
  let heard = null;
  const log0 = (await snap(page)).audio.log;
  await playStage5(page, drv, { mid: async () => {
    const s = await snap(page);
    heard = { tool: s.audio.tool, vol: s.audio.toolVolume, loops: s.audio.playingLoops, stage: s.level?.stageId };
  } });
  await page.waitForTimeout(450);
  const after = await snap(page);
  // loops started during the stage (robust when a quick stage completes inside the first stroke)
  const started = Object.fromEntries(Object.entries(after.audio.log).filter(([k, v]) => k.startsWith('loop-') && v > (log0[k] ?? 0)).map(([k, v]) => [k, v - (log0[k] ?? 0)]));
  return { heard, started, after: { tool: after.audio.tool, loops: after.audio.playingLoops } };
}

test('music: one shared instance; Music and Sound toggles are independent', async ({ page }, info) => {
  test.setTimeout(240_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.goto('/?qa=1');
  let s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-settings']);
  await drv.tap(s.layout.W / 2, s.layout.H * 0.95); // first gesture unlocks web audio
  s = await waitFor(page, (x) => x.audio.musicPlaying === 1, { label: 'music playing' });
  // menu → level → menu → Store → Wheel: still exactly one music instance, never restarted twice
  await pressButton(page, drv, 'menu-level-soccer-ball');
  s = await waitFor(page, (x) => x.level?.state === 'playing', { timeout: 30000 });
  expect(s.audio.musicPlaying).toBe(1);
  expect(s.audio.music.instances).toBe(1);
  await pressButton(page, drv, 'hud-pause');
  await pressButton(page, drv, 'pause-menu');
  s = await waitFor(page, (x) => x.scene === 'Menu' && x.buttons?.['menu-store']);
  expect([s.audio.musicPlaying, s.audio.music.instances]).toEqual([1, 1]);
  await pressButton(page, drv, 'menu-store');
  s = await waitFor(page, (x) => x.store);
  expect(s.audio.musicPlaying).toBe(1);
  await pressButton(page, drv, 'store-close');
  await waitFor(page, (x) => !x.store);
  // Music off: music paused, SFX still allowed; Sound off: SFX muted, music unaffected
  await pressButton(page, drv, 'menu-settings');
  await waitFor(page, (x) => x.buttons?.['settings-music']);
  await pressButton(page, drv, 'settings-music');
  s = await waitFor(page, (x) => x.audio.musicPlaying === 0, { label: 'music off' });
  expect(s.audio.canPlay).toBe(true);
  await pressButton(page, drv, 'settings-music');
  s = await waitFor(page, (x) => x.audio.musicPlaying === 1, { label: 'music on again' });
  expect(s.audio.music.instances).toBe(1);
  await pressButton(page, drv, 'settings-sound');
  s = await waitFor(page, (x) => x.audio.canPlay === false, { label: 'sound off' });
  expect(s.audio.musicPlaying).toBe(1);
  await pressButton(page, drv, 'settings-sound');
  await waitFor(page, (x) => x.audio.canPlay === true);
  await pressButton(page, drv, 'settings-close');
  // Wheel: open (pop), free spin (ticks), reward
  await pressButton(page, drv, 'menu-wheel');
  await waitFor(page, (x) => x.wheel && x.buttons?.['wheel-spin']);
  await pressButton(page, drv, 'wheel-spin');
  s = await waitFor(page, (x) => x.wheel?.state === 'result', { timeout: 15000 });
  await page.waitForTimeout(300);
  s = await snap(page);
  expect(s.audio.musicPlaying).toBe(1);
  console.log('UI', JSON.stringify(s.audio.log));
  for (const k of ['ui-tap', 'ui-pop', 'wheel-tick']) expect(s.audio.log[k] ?? 0, k).toBeGreaterThan(0);
  expect((s.audio.log.reward ?? 0) + (s.audio.log['reward-big'] ?? 0)).toBe(1); // ordinary prize = pop, jackpot = win
});

test('tools: the right loop while working, nothing after release; hits per strike; stage / level complete', async ({ page }, info) => {
  test.setTimeout(900_000);
  const drv = await driver(page, info);
  await page.goto('/?qa=1&devStorage=memory');
  let s = await waitFor(page, (x) => x.scene === 'Menu');
  await drv.tap(s.layout.W / 2, s.layout.H * 0.95);
  const out = {};
  // watering can: hammer, wire brush, foam, lather scrub, washer, cloth, spray gun
  await openFromMenu(page, drv, 'watering-can');
  s = await toStage(page, drv, 'hammer');
  const hits0 = s.audio.log.hit ?? 0;
  const r0 = await playAndListen(page, drv);
  s = await snap(page);
  out.hammer = { hits: (s.audio.log.hit ?? 0) - hits0, loopAfter: r0.after.loops };
  expect(out.hammer.hits).toBeGreaterThan(2);
  const expectLoop = { 'wire-brush': 'loop-file', 'foam-spray': 'loop-foam', scrub: 'loop-lather', rinse: 'loop-water', dry: 'loop-wipe', 'spray-paint': 'loop-aerosol' };
  for (const [stage, loop] of Object.entries(expectLoop)) {
    await toStage(page, drv, stage);
    const r = await playAndListen(page, drv);
    out[stage] = r;
    expect(Object.keys(r.started), `${stage} plays ${loop}`).toEqual([loop]);
    if (r.heard.tool) expect(r.heard.tool).toBe(loop);
    expect(r.after.loops, `${stage}: silent after release`).toEqual([]);
  }
  s = await waitFor(page, (x) => x.level?.state === 'result', { timeout: 30000 });
  // celebration policy: every stage end is decided (chime on some, silent on the rest); one level clip
  expect((s.audio.log['stage-chime'] ?? 0) + (s.audio.log['stage-silent'] ?? 0)).toBeGreaterThanOrEqual(6);
  expect(Object.entries(s.audio.log).filter(([k]) => k.startsWith('level-clip-')).reduce((a, [, v]) => a + v, 0)).toBe(1);
  // retro radio: blower + steam (air / steam hiss); rusty cleaver: laser crackle; leave mid-level
  for (const [level, stages] of [['retro-radio', { blow: 'loop-spray', steam: 'loop-spray', sponge: 'loop-paint' }], ['rusty-cleaver', { laser: 'loop-laser', sand: 'loop-file' }]]) {
    await page.goto('/?qa=1&devStorage=memory');
    s = await waitFor(page, (x) => x.scene === 'Menu');
    await drv.tap(s.layout.W / 2, s.layout.H * 0.95);
    await openFromMenu(page, drv, level);
    for (const [stage, loop] of Object.entries(stages)) {
      await toStage(page, drv, stage);
      const r = await playAndListen(page, drv);
      out[`${level}/${stage}`] = r;
      expect(Object.keys(r.started), `${level}/${stage}`).toEqual([loop]);
      expect(r.after.loops).toEqual([]);
    }
  }
  // leaving a level: start a stroke (loop on), release, Pause → Menu → no loop keeps playing
  s = await waitFor(page, (x) => x.level?.state === 'playing');
  const L = s.level;
  const toCss = (x, y) => ({ x: L.xf.cx + (x - L.xf.size / 2) * L.xf.k, y: L.xf.cy + (y - L.xf.size / 2) * L.xf.k });
  const pts = L.targets.points.slice(0, 40).map(([x, y]) => toCss(x, y));
  const f = (p) => (L.tool.kind === 'jet' ? { x: p.x - L.tool.jet.x - L.tool.workOffset.x, y: p.y - L.tool.jet.y - L.tool.workOffset.y } : { x: p.x - L.tool.workOffset.x, y: p.y - L.tool.workOffset.y });
  await drv.down(f(pts[0]).x, f(pts[0]).y);
  for (const p of pts) await drv.move(f(p).x, f(p).y);
  s = await snap(page);
  out.leave = { during: s.audio.playingLoops };
  await drv.up();
  await pressButton(page, drv, 'hud-pause');
  await pressButton(page, drv, 'pause-menu');
  s = await waitFor(page, (x) => x.scene === 'Menu');
  await page.waitForTimeout(400);
  s = await snap(page);
  out.leave.after = s.audio.playingLoops;
  expect(s.audio.playingLoops).toEqual([]);
  expect(s.audio.musicPlaying).toBe(1);
  console.log('TOOLS', JSON.stringify(out));
});
