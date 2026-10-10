import { test, expect } from '@playwright/test';
import { waitFor, mouseDriver, touchDriver, snap, openFromMenu } from './helpers.js';
import { playStage5 } from './level-play.js';

// Step 9 logic + visual pass, focused checks (real input). Each case plays up to a stage and
// screenshots it (outline / targets visible); PHASE=before|after prefixes the files.
// Screenshots: project/screenshots/step9-logic/<project>/<PHASE>-<case>.png
const PHASE = process.env.PHASE ?? 'after';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;

// [case, level, stage to show (first match), extra: 'play' plays that stage too]
const CASES = [
  ['radio-grille', 'retro-radio', ['steam'], null],
  ['radio-front', 'retro-radio', ['swab', 'sponge'], null],
  ['bicycle-stages', 'bicycle', ['wire-brush'], null],
  ['sign-bolts', 'street-sign', ['screw-in'], 'play'],
  ['lion-outline', 'stone-lion', ['moss-brush'], null],
  ['shower', 'shower-cabin', ['descale', 'swab'], null],
  ['cleaver-polish', 'rusty-cleaver', ['polish'], null],
  ['fan-guard-off', 'desk-fan', ['guard-off'], 'play'],
  ['fan-guard-on', 'desk-fan', ['guard-on'], 'play'],
  ['cannon-final', 'cannon', ['__end__'], null],
].filter(([c]) => !ONLY || ONLY.includes(c));

for (const [name, id, stages, extra] of CASES) {
  test(`logic ${name}`, async ({ page }, info) => {
    test.setTimeout(500_000);
    const drv = info.project.name.includes('touch') ? await touchDriver(page) : mouseDriver(page);
    const dir = `project/screenshots/step9-logic/${info.project.name}`;
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?qa=1&devStorage=memory');
    await waitFor(page, (s) => s.scene === 'Menu');
    await openFromMenu(page, drv, id);
    let s = await waitFor(page, (x) => x.level?.id === id && x.level.state === 'playing', { timeout: 30000 });
    const ids = await page.evaluate(() => window.__cleanupQA.snapshot().level && null);
    void ids;
    console.log(`${info.project.name} ${id} stages: ${s.level.stageCount}`);
    for (let i = 0; i < 14; i++) {
      s = await waitFor(page, (x) => x.level && (x.level.state === 'playing' || x.level.state === 'result'), { timeout: 30000 });
      if (s.level.state === 'result') break;
      if (stages.includes(s.level.stageId)) break;
      await playStage5(page, drv);
    }
    if (stages[0] === '__end__') {
      await waitFor(page, (x) => x.level && (x.level.state === 'completing' || x.level.state === 'result'), { timeout: 30000 });
      await page.waitForTimeout(400);
    } else {
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: `${dir}/${PHASE}-${name}.png` });
    if (extra === 'play' && s.level.state === 'playing') {
      console.log(`${name}: stage ${s.level.stageId} targets ${JSON.stringify(s.level.targets?.points ?? s.level.targets?.items)}`);
      await playStage5(page, drv);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${dir}/${PHASE}-${name}-done.png` });
    }
    const log = await page.evaluate(() => window.__cleanupQA.snapshot().level?.stageLog?.map((x) => x.id));
    console.log(`${name}: played ${JSON.stringify(log)}`);
    expect(errors).toEqual([]);
  });
}
