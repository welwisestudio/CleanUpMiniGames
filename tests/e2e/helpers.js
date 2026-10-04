import { expect } from '@playwright/test';

// Helpers that drive the game ONLY through real pointer input (mouse or CDP touch events).
// The read-only QA snapshot (?qa=1) is used to find on-screen geometry and to observe state.

export async function openGame(page, errors) {
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await page.goto('/?qa=1');
  await waitFor(page, (s) => s.scene === 'Menu');
}

export function snap(page) {
  return page.evaluate(() => window.__cleanupQA.snapshot());
}

export async function waitFor(page, predicate, { timeout = 20000, label = 'condition' } = {}) {
  const start = Date.now();
  for (;;) {
    const s = await page.evaluate(() => (window.__cleanupQA ? window.__cleanupQA.snapshot() : null)).catch(() => null);
    if (s && predicate(s)) return s;
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for ${label}; last snapshot: ${JSON.stringify(s)?.slice(0, 600)}`);
    await page.waitForTimeout(50);
  }
}

// ---- pointer drivers -------------------------------------------------------------------
export function mouseDriver(page) {
  return {
    kind: 'mouse',
    down: async (x, y) => {
      await page.mouse.move(x, y);
      await page.mouse.down();
    },
    move: (x, y) => page.mouse.move(x, y),
    up: () => page.mouse.up(),
    tap: async (x, y) => {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.up();
    },
  };
}

export async function touchDriver(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  let last = null;
  return {
    kind: 'touch',
    down: async (x, y) => {
      last = { x, y };
      await send('touchStart', [{ x, y, id: 1 }]);
    },
    move: async (x, y) => {
      last = { x, y };
      await send('touchMove', [{ x, y, id: 1 }]);
    },
    up: async () => {
      await send('touchEnd', []);
      last = null;
    },
    tap: async (x, y) => {
      await send('touchStart', [{ x, y, id: 1 }]);
      await send('touchEnd', []);
    },
    get last() {
      return last;
    },
  };
}

export async function pressButton(page, driver, id) {
  const s = await waitFor(page, (x) => x.buttons && x.buttons[id] && x.buttons[id].visible !== false, { label: `button ${id}` });
  const b = s.buttons[id];
  await driver.tap(b.x, b.y);
}

// ---- stage play ------------------------------------------------------------------------
// Converts a desired working point / jet impact (screen px) into the pointer position.
export function pointerFor(tool, target) {
  if (tool.kind === 'jet') return { x: target.x - tool.workOffset.x, y: target.y + tool.jetLength - tool.workOffset.y };
  return { x: target.x - tool.workOffset.x, y: target.y - tool.workOffset.y };
}

// One serpentine pass over the object. `vertical` alternates the sweep direction.
async function pass(page, driver, s, { spacingFactor, vertical, jet }) {
  const { x: cx, y: cy, radius: R } = s.level.object;
  const tool = s.level.tool;
  const spacing = R * spacingFactor;
  const rows = [];
  for (let o = -R * 0.97; o <= R * 0.97; o += spacing) rows.push(o);
  let first = true;
  let dir = 1;
  for (const o of rows) {
    const half = Math.sqrt(Math.max(0, R * R - o * o)) * 0.97;
    const a = vertical ? { x: cx + o, y: cy - half * dir } : { x: cx - half * dir, y: cy + o };
    const b = vertical ? { x: cx + o, y: cy + half * dir } : { x: cx + half * dir, y: cy + o };
    const steps = Math.max(4, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (jet ? 10 : 14)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = pointerFor(tool, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      if (first) {
        await driver.down(p.x, p.y);
        first = false;
      } else {
        await driver.move(p.x, p.y);
      }
      if (jet) await page.waitForTimeout(12);
    }
    dir = -dir;
  }
  await driver.up();
}

// Plays the current stage with real input until the game advances. Asserts that the stage never
// advances before the mechanic reports completion.
export async function playStage(page, driver, { maxPasses = 14 } = {}) {
  const s0 = await waitFor(page, (s) => s.level && s.level.state === 'playing', { label: 'stage playing' });
  const index = s0.level.stageIndex;
  const jet = s0.level.tool.kind === 'jet';
  const chisel = s0.level.stageId === 'chisel';
  let lastProgress = 0;
  for (let i = 0; i < maxPasses; i++) {
    const s = await snap(page);
    if (s.level.stageIndex !== index || s.level.state !== 'playing') break;
    await pass(page, driver, s, { spacingFactor: chisel ? 0.12 : jet ? 0.3 : 0.36, vertical: i % 2 === 1, jet });
    const after = await snap(page);
    if (after.level.stageIndex === index && after.level.state === 'playing') {
      expect(after.level.progress).toBeGreaterThanOrEqual(lastProgress - 1e-9); // progress never goes back
      lastProgress = after.level.progress;
    }
    if (after.level.state !== 'playing' || after.level.stageIndex !== index) {
      expect(after.level.completedFlag || after.level.stageIndex !== index || after.level.state === 'completing' || after.level.state === 'result').toBe(true);
      break;
    }
  }
  const done = await snap(page);
  expect(done.level.state === 'playing' && done.level.stageIndex === index, `stage ${s0.level.stageId} did not complete`).toBe(false);
  if (done.level.state === 'transition') expect(done.level.progress).toBe(1);
  return { stageId: s0.level.stageId, passes: lastProgress };
}

export async function playWholeLevel(page, driver) {
  const s = await waitFor(page, (x) => x.level && x.level.state === 'playing' && x.level.stageIndex === 0, { label: 'level start' });
  const count = s.level.stageCount;
  const order = [];
  for (let i = 0; i < count; i++) {
    const st = await waitFor(page, (x) => x.level && ((x.level.state === 'playing' && x.level.stageIndex === i) || x.level.state === 'result'), { label: `stage ${i}` });
    if (st.level.state === 'result') break;
    order.push(st.level.stageId);
    await playStage(page, driver);
  }
  return { order, result: await waitFor(page, (x) => x.level && x.level.state === 'result', { label: 'result card', timeout: 15000 }) };
}
