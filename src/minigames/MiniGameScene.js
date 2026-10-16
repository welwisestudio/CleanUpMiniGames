import Phaser from 'phaser';
import { getLevel } from '../content/catalog.js';
import { IMAGE_ASSETS, levelAssets } from '../content/assets.js';
import { attachResponsiveLayout, refreshTextResolution } from '../ui/layout.js';
import { makeText, fitText } from '../ui/text.js';
import { TEXT, FONT_UI, FONT_DISPLAY } from '../ui/theme.js';
import { Button } from '../ui/Button.js';
import { registerQaScene } from '../app/qa.js';
import { MINIGAMES } from './registry.js';

// the minigame sprites (Nano Banana 2 + Higgsfield Background Remover, 2026-10-15; project/MINIGAMES.md)
const MG = 'assets/minigames/';
export const MG_SPRITES = {
  'mg-keeper': `${MG}mg-keeper.webp`,
  'mg-log': `${MG}mg-log.webp`,
  'mg-target': `${MG}mg-target.webp`,
  'mg-smoke': `${MG}mg-smoke.webp`,
  'mg-note': `${MG}mg-note.webp`,
};
// expansion sprites (2026-10-16, same pipeline): loaded only by the games that list them
// (registry `sprites`), so one minigame never downloads the others' art
const MG_EXTRA = ['pancake', 'sausage', 'bubble', 'duck', 'crystal', 'apple', 'pot', 'rose', 'swimring', 'beachball', 'toast', 'plate', 'fish', 'puddle', 'cone', 'balloon', 'gnome', 'grass', 'barrier', 'hay', 'arrow', 'road', 'lawn'];
for (const n of MG_EXTRA) MG_SPRITES[`mg-${n}`] = `${MG}mg-${n}.webp`;
const MG_BASE = ['mg-keeper', 'mg-log', 'mg-target', 'mg-smoke', 'mg-note'];

// Post-cleaning minigames (2026-10-15 prototype batch). The cleaned object flies from where it was
// cleaned into a short themed game (5–12 s), then hands back to the normal completion flow.
// The level reward is granted BEFORE the minigame starts (LevelScene.completeLevel) — the minigame
// never changes rewards, and losing never blocks anything. Skip is always available.
//
// Shell responsibilities: backdrop + title + hint + progress pips + Skip, the hero texture (the
// level's clean layer cropped to the object), the fly-in from the cleaning position, the result
// banner and the fade back. A game module (registry.js) does the actual play:
//   new Game(shell) · heroPose(l) → { x, y, size, angle } · start() · layout(l) · update(dt)
//   onDown / onMove / onUp(pointer) · qa() (read-only test data)
// and calls shell.progress(n), shell.flash(text), shell.finish(win).
export class MiniGameScene extends Phaser.Scene {
  constructor() {
    super('MiniGame');
  }

  init(data) {
    this.data_ = data;
    this.levelId = data.levelId;
    this.def = MINIGAMES[data.levelId];
    this.state = 'loading';
  }

  preload() {
    // the level's clean art + backdrops (already loaded inside a level; standalone QA runs load
    // them) and the small minigame sprites (assets/minigames, ~100 KB, loaded on first use)
    const level = getLevel(this.levelId);
    const keys = [cleanKey(this.levelId), level.backgrounds?.portrait, level.backgrounds?.landscape].filter(Boolean);
    for (const key of keys) {
      if (this.textures.exists(key)) continue;
      const url = levelAssets(this.levelId)[key] ?? IMAGE_ASSETS[key];
      if (url) this.load.image(key, url);
    }
    for (const key of [...MG_BASE, ...(this.def.sprites ?? [])]) if (!this.textures.exists(key)) this.load.image(key, MG_SPRITES[key]);
    // shared game art a minigame reuses (tool sprites, coin icon …) — normally already loaded at boot
    for (const key of this.def.assets ?? []) if (!this.textures.exists(key) && IMAGE_ASSETS[key]) this.load.image(key, IMAGE_ASSETS[key]);
  }

  create() {
    this.services = this.registry.get('services');
    this.services.pause.set('navigationBusy', false);
    this.qaTargets = new Map();
    this.qaButtons = new Map();
    this.heroKey = makeHeroTexture(this, this.levelId);
    // backdrop: the level's own scene image (cover) under a soft dim / vignette for readability
    this.bgRoot = this.add.container(0, 0).setAlpha(0);
    this.bgImg = this.add.image(0, 0, '__WHITE');
    this.backdrop = this.add.graphics();
    this.bgRoot.add([this.bgImg, this.backdrop]);
    this.world = this.add.container(0, 0); // game props
    this.hero = this.add.image(0, 0, this.heroKey);
    this.fx = this.add.container(0, 0);
    this.ui = this.add.container(0, 0).setAlpha(0);
    // header (polish 2026-10-17): a calmer title, the hint on a soft pill, then pips / timer
    this.title = makeText(this, 0, 0, this.def.title, { size: 29, color: TEXT.white, family: FONT_DISPLAY, weight: '900', stroke: '#2F4E8C', strokeThickness: 6, shadow: { y: 3, color: 'rgba(13,35,62,0.35)' } });
    this.hintBg = this.add.graphics();
    this.hint = makeText(this, 0, 0, this.def.hint, { size: 15, color: '#FFFFFF', weight: '800', family: FONT_UI });
    this.pips = this.add.graphics();
    this.timeBar = this.add.graphics();
    this.timeK = null;
    this.chips = [];
    this.ui.add([this.title, this.hintBg, this.hint, this.pips, this.timeBar]);
    this.skipBtn = new Button(this, { id: 'minigame-skip', x: 0, y: 0, w: 96, h: 40, label: 'Skip', style: 'white', fontSize: 17, onClick: () => this.finish(null) });
    this.skipBtn.container.setAlpha(0);
    this.done = 0;
    this.total = this.def.total;
    this.game_ = new this.def.Game(this);
    this.input.on('pointerdown', (p) => this.state === 'play' && this.game_.onDown?.(p));
    this.input.on('pointermove', (p) => this.state === 'play' && this.game_.onMove?.(p));
    this.input.on('pointerup', (p) => this.state === 'play' && this.game_.onUp?.(p));
    attachResponsiveLayout(this, (l) => this.relayout(l));
    registerQaScene(this);
    this.intro();
  }

  // ---- intro: the cleaned object flies from its cleaning spot into the game -------------------
  intro() {
    const l = this.layout;
    const f = this.data_.from;
    const pose = this.game_.heroPose(l);
    const baseScale = (size) => size / Math.max(this.hero.width, this.hero.height);
    if (f) {
      const w = f.x1 - f.x0;
      const h = f.y1 - f.y0;
      this.hero.setPosition(f.x0 + w / 2, f.y0 + h / 2).setScale(Math.max(w, h) / Math.max(this.hero.width, this.hero.height));
    } else {
      this.hero.setPosition(l.W / 2, l.H / 2).setScale(baseScale(pose.size) * 0.6).setAlpha(0);
    }
    this.data_.onReady?.();
    this.services.audio.play('ui-pop');
    this.tweens.add({ targets: this.bgRoot, alpha: 1, duration: 450 });
    this.tweens.add({
      targets: this.hero,
      x: pose.x,
      y: pose.y,
      angle: pose.angle ?? 0,
      scale: baseScale(pose.size),
      alpha: 1,
      duration: 750,
      ease: 'Back.easeInOut',
      onComplete: () => {
        // arrival: a soft light ring + sparkles around the hero
        this.ring(this.hero.x, this.hero.y, pose.size * 0.75);
        this.state = 'play';
        this.tweens.add({ targets: [this.ui, this.skipBtn.container], alpha: 1, duration: 300 });
        this.game_.start();
      },
    });
  }

  // expanding light ring (arrival, impacts)
  ring(x, y, r, color = 0xffffff, ms = 420) {
    const l = this.layout;
    const g = this.add.graphics();
    this.fx.add(g);
    const o = { k: 0 };
    this.tweens.add({
      targets: o,
      k: 1,
      duration: ms,
      ease: 'Cubic.easeOut',
      onUpdate: () => g.clear().lineStyle(10 * l.u * (1 - o.k) + 1, color, 0.9 * (1 - o.k)).strokeCircle(x, y, r * (0.35 + 0.75 * o.k)),
      onComplete: () => g.destroy(),
    });
  }

  // a soft-image particle burst (smoke puffs / sparkles / chips use their own textures)
  puffs(x, y, { key = 'mg-smoke', n = 6, size = 70, speed = 160, tint = 0xffffff, life = 900, rise = -60, alpha = 0.85 } = {}) {
    const l = this.layout;
    const e = this.add.particles(x, y, key, {
      speed: { min: speed * 0.3 * l.u, max: speed * l.u },
      angle: { min: 0, max: 360 },
      lifespan: { min: life * 0.7, max: life },
      scale: { start: (size * l.u) / 220, end: (size * 1.9 * l.u) / 220 },
      alpha: { start: alpha, end: 0 },
      rotate: { min: -40, max: 40 },
      gravityY: rise * l.u,
      tint,
      emitting: false,
    });
    this.fx.add(e);
    e.explode(n);
    this.time.delayedCall(life + 100, () => e.destroy());
    return e;
  }

  heroScale(size) {
    return size / Math.max(this.hero.width, this.hero.height);
  }

  // ---- shell services for the games -----------------------------------------------------------
  progress(n) {
    this.done = n;
    this.drawPips();
  }

  // per-pip states instead of a count: 'ok' (gold) · 'miss' (grey cross) · null (open)
  setPips(states) {
    this.pipStates = states;
    this.done = states.filter((x) => x === 'ok').length;
    this.drawPips();
  }

  // remaining-time bar under the pips (0..1), null hides it (games with a time limit)
  setTime(k) {
    this.timeK = k == null ? null : Math.max(0, Math.min(1, k));
    this.drawTime();
  }

  drawTime() {
    const l = this.layout;
    const g = this.timeBar.clear();
    if (!l || this.timeK == null) return;
    const w = Math.min(200 * l.u, l.W * 0.5);
    const h = 8 * l.u;
    const x = l.W / 2 - w / 2;
    const y = this.pipsY + 17 * l.u;
    const k = this.timeK;
    g.fillStyle(0x000000, 0.28).fillRoundedRect(x, y + 2 * l.u, w, h, h / 2);
    g.fillStyle(0xffffff, 0.85).fillRoundedRect(x, y, w, h, h / 2);
    if (k > 0.02) g.fillStyle(k > 0.3 ? 0x4fc84b : 0xff8a3c, 1).fillRoundedRect(x + 2 * l.u, y + 2 * l.u, (w - 4 * l.u) * k, h - 4 * l.u, (h - 4 * l.u) / 2);
  }

  // Floating feedback (polish 2026-10-17): a compact rounded chip instead of a huge outlined word.
  // `color` = text colour, `stroke` = the chip's colour (games keep their call signature). The chip
  // stays inside the screen margins, below the header and above Skip, and never overlaps another
  // live chip (it steps aside instead).
  flash(text, x, y, color = '#FFFFFF', stroke = '#2F4E8C') {
    const l = this.layout;
    const u = l.u;
    const ink = color === '#D6DCE8' ? '#FFFFFF' : color;
    const bg = parseInt(stroke.replace('#', ''), 16); // (no Phaser.Display in the trimmed engine)
    const t = makeText(this, 0, 0, text, { size: l.portrait ? 18 : 21, color: ink, family: FONT_DISPLAY, weight: '900', stroke: '#0D233E', strokeThickness: 2.5 }).setScale(u);
    fitText(t, l.W - 2 * l.margin - 40 * u, u);
    t.setResolution(Math.min(4, Math.max(1, Math.round(u * 4) / 4)));
    const w = t.displayWidth + 28 * u;
    const h = (l.portrait ? 34 : 38) * u;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.22).fillRoundedRect(-w / 2, -h / 2 + 3 * u, w, h, h / 2);
    g.fillStyle(bg, 0.94).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(0xffffff, 0.16).fillRoundedRect(-w / 2 + 3 * u, -h / 2 + 2 * u, w - 6 * u, h * 0.42, h * 0.21);
    g.lineStyle(2 * u, 0xffffff, 0.6).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const c = this.add.container(0, 0, [g, t]);
    const top = (this.pipsY ?? l.margin + 100 * u) + 34 * u + h / 2;
    const bottom = l.H - l.margin - 64 * u - h / 2;
    const cx = Math.max(l.margin + w / 2, Math.min(l.W - l.margin - w / 2, x));
    let cy = Math.max(top, Math.min(bottom, y));
    this.chips = this.chips.filter((q) => q.c.active);
    for (let i = 0; i < 4; i++) {
      const hit = this.chips.find((q) => Math.abs(q.x - cx) < (q.w + w) / 2 + 4 * u && Math.abs(q.y - cy) < h + 4 * u);
      if (!hit) break;
      cy = hit.y - h - 6 * u < top ? hit.y + h + 6 * u : hit.y - h - 6 * u;
    }
    c.setPosition(cx, cy).setScale(0.55);
    this.chips.push({ c, x: cx, y: cy, w });
    this.fx.add(c);
    this.tweens.add({ targets: c, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: cy - 26 * u, alpha: 0, delay: 620, duration: 380, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
  }

  burst(x, y, tint, n = 14, size = 1) {
    const l = this.layout;
    const e = this.add.particles(x, y, 'fx-dot', { speed: { min: 110 * l.u, max: 360 * l.u }, lifespan: 600, scale: { start: 0.95 * l.u * size, end: 0 }, gravityY: 600 * l.u, tint, emitting: false });
    this.fx.add(e);
    e.explode(n);
    this.time.delayedCall(900, () => e.destroy());
  }

  shake(intensity = 0.006, ms = 140) {
    this.cameras.main.shake(ms, intensity);
  }

  finish(win) {
    if (this.state === 'end') return;
    const skipped = win === null;
    this.state = 'end';
    this.result = skipped ? 'skipped' : win ? 'win' : 'lose';
    const l = this.layout;
    this.tweens.add({ targets: this.skipBtn.container, alpha: 0, duration: 150 });
    const end = () =>
      this.tweens.add({
        targets: [this.world, this.hero, this.fx, this.ui, this.bgRoot],
        alpha: 0,
        duration: 380,
        onComplete: () => this.close(),
      });
    if (skipped) return end();
    this.services.audio.play(win ? 'stage-chime' : 'ui-pop');
    const word = win ? this.def.winText : 'NICE TRY!';
    for (const q of this.chips) if (q.c.active) this.tweens.add({ targets: q.c, alpha: 0, duration: 120 });
    const dim = this.add.graphics().fillStyle(0x0d233e, 0.32).fillRect(0, 0, l.W, l.H).setAlpha(0);
    this.fx.add(dim);
    this.tweens.add({ targets: dim, alpha: 1, duration: 220 });
    const banner = this.resultRibbon(word, win);
    this.ui.add(banner); // top layer: never covered by the celebration particles
    banner.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    if (win) {
      this.time.delayedCall(120, () => this.puffs(l.W / 2, l.H * 0.42, { key: 'fx-sparkle', n: 14, size: 26, speed: 330, life: 900, rise: 160, alpha: 1 }));
      for (let i = 0; i < 2; i++) this.time.delayedCall(200 + i * 160, () => this.burst(l.W * (0.36 + 0.28 * i), l.H * 0.4, [0xffd23f, 0x4fc84b, 0x45a3e6, 0xff6fa8], 14, 0.8));
    }
    this.time.delayedCall(1300, end);
  }

  // The result (polish 2026-10-17): a ribbon banner — gold for a win, blue otherwise — sized to its
  // word and never wider than the screen minus the margins; three small stars above a win.
  resultRibbon(word, win) {
    const l = this.layout;
    const u = l.u;
    const t = makeText(this, 0, 0, word, { size: 30, color: '#FFFFFF', family: FONT_DISPLAY, weight: '900', stroke: win ? '#8A3A12' : '#1E3766', strokeThickness: 5, shadow: { y: 2, color: 'rgba(0,0,0,0.25)' } }).setScale(u);
    const maxBody = Math.min(l.W - 2 * l.margin - 70 * u, 420 * u);
    fitText(t, maxBody - 40 * u, u);
    t.setResolution(Math.min(4, Math.max(1, Math.round(u * 4) / 4)));
    const bw = Math.max(t.displayWidth + 56 * u, 180 * u);
    const bh = 58 * u;
    const main = win ? 0xf2a531 : 0x4a78c2;
    const light = win ? 0xffc94a : 0x6f9ce0;
    const dark = win ? 0xb4621e : 0x2f4e8c;
    const g = this.add.graphics();
    const tw = 30 * u;
    for (const sd of [-1, 1]) {
      const x0 = sd * (bw / 2 - 8 * u);
      const x1 = sd * (bw / 2 + tw);
      g.fillStyle(dark, 1).fillPoints([{ x: x0, y: -bh * 0.28 + 8 * u }, { x: x1, y: -bh * 0.28 + 8 * u }, { x: x1 - sd * 12 * u, y: bh * 0.2 + 4 * u }, { x: x1, y: bh * 0.62 }, { x: x0, y: bh * 0.62 }], true);
    }
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-bw / 2, -bh / 2 + 5 * u, bw, bh, 14 * u);
    g.fillStyle(main, 1).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 14 * u);
    g.fillStyle(light, 1).fillRoundedRect(-bw / 2 + 4 * u, -bh / 2 + 4 * u, bw - 8 * u, bh * 0.42, 11 * u);
    g.lineStyle(3 * u, 0xffffff, 0.85).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 14 * u);
    const parts = [g, t];
    if (win) {
      const sg = this.add.graphics();
      [-1, 0, 1].forEach((k) => star(sg, k * 36 * u, -bh / 2 - (k === 0 ? 24 : 15) * u, (k === 0 ? 17 : 13) * u, u));
      parts.push(sg);
    }
    return this.add.container(l.W / 2, l.H * 0.42, parts);
  }

  close() {
    const cb = this.data_.onDone;
    const result = this.result;
    this.scene.stop();
    cb?.(result);
  }

  // ---- layout ---------------------------------------------------------------------------------
  relayout(l) {
    const { W, H, u, margin: m } = l;
    // the level's scene image, cover-fitted (portrait / landscape variant), + dim and vignette
    const level = getLevel(this.levelId);
    const portrait = W / H < 1;
    const bgKey = (portrait ? level.backgrounds?.portrait : level.backgrounds?.landscape) ?? level.backgrounds?.portrait;
    if (bgKey && this.textures.exists(bgKey)) {
      this.bgImg.setTexture(bgKey).setVisible(true);
      const k = Math.max(W / this.bgImg.width, H / this.bgImg.height);
      this.bgImg.setScale(k).setPosition(W / 2, H / 2);
      // the image's rectangle on screen (games map scene features — the goal, the water — from it)
      this.bgRect = { x: W / 2 - (this.bgImg.width * k) / 2, y: H / 2 - (this.bgImg.height * k) / 2, w: this.bgImg.width * k, h: this.bgImg.height * k, portrait };
    } else {
      this.bgImg.setVisible(false);
      this.bgRect = { x: 0, y: 0, w: W, h: H, portrait };
    }
    const th = this.def.theme ?? {};
    const g = this.backdrop.clear();
    g.fillStyle(th.dim ?? 0x0d233e, th.dimAlpha ?? 0.18).fillRect(0, 0, W, H);
    // soft top band behind the title / hint / pips (readability on any backdrop)
    g.fillGradientStyle(0x0d233e, 0x0d233e, 0x0d233e, 0x0d233e, 0.4, 0.4, 0, 0).fillRect(0, 0, W, m + 140 * u);
    const top = m + 30 * u;
    this.title.setPosition(W / 2, top).setScale(u);
    fitText(this.title, W - 2 * m - 24 * u, u);
    const hy = top + 37 * u;
    this.hint.setPosition(W / 2, hy).setScale(u);
    fitText(this.hint, Math.min(W - 2 * m - 44 * u, 560 * u), u);
    const hw = this.hint.displayWidth + 30 * u;
    const hh = 26 * u;
    this.hintBg.clear().fillStyle(0x0d233e, 0.5).fillRoundedRect(W / 2 - hw / 2, hy - hh / 2, hw, hh, hh / 2);
    this.hintBg.lineStyle(1.5 * u, 0xffffff, 0.25).strokeRoundedRect(W / 2 - hw / 2, hy - hh / 2, hw, hh, hh / 2);
    this.pipsY = top + 68 * u;
    this.drawPips();
    this.drawTime();
    this.skipBtn.setPlacement(W - m - 56 * u, H - m - 28 * u, u);
    this.game_?.layout?.(l);
    if (this.state !== 'loading' && this.state !== 'intro') {
      const p = this.game_.heroPose(l);
      if (!this.game_.ownsHero) this.hero.setPosition(p.x, p.y).setScale(this.heroScale(p.size));
    }
    refreshTextResolution(this);
  }

  drawPips() {
    const l = this.layout;
    if (!l) return;
    const g = this.pips.clear();
    const n = this.total;
    const r = 8 * l.u;
    const gap = Math.min(24 * l.u, (l.W - 2 * l.margin) / (n + 1));
    for (let i = 0; i < n; i++) {
      const x = l.W / 2 + (i - (n - 1) / 2) * gap;
      const st = this.pipStates ? this.pipStates[i] : i < this.done ? 'ok' : null;
      g.fillStyle(0x000000, 0.25).fillCircle(x, this.pipsY + 2 * l.u, r);
      g.fillStyle(st === 'ok' ? 0xffd23f : st === 'miss' ? 0x9aa3ad : 0xffffff, 1).fillCircle(x, this.pipsY, r);
      g.lineStyle(2.5 * l.u, 0x2f4e8c, 1).strokeCircle(x, this.pipsY, r);
      if (st === 'miss') g.lineStyle(2.5 * l.u, 0xffffff, 1).lineBetween(x - r * 0.45, this.pipsY - r * 0.45, x + r * 0.45, this.pipsY + r * 0.45).lineBetween(x + r * 0.45, this.pipsY - r * 0.45, x - r * 0.45, this.pipsY + r * 0.45);
    }
  }

  update(time, delta) {
    if (this.state === 'play' || this.state === 'end') this.game_?.update?.(Math.min(delta, 50) / 1000);
  }

  // QA (read-only)
  minigameQa() {
    const l = this.layout;
    return { id: this.levelId, state: this.state, done: this.done, total: this.total, result: this.result ?? null, dpr: l.dpr, ...(this.game_?.qa?.() ?? {}) };
  }
}

// a glossy gold star (result ribbon)
function star(g, x, y, r, u) {
  const pts = (rad, dy = 0) =>
    Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? rad * 0.46 : rad;
      return { x: x + Math.cos(a) * rr, y: y + dy + Math.sin(a) * rr };
    });
  g.fillStyle(0x000000, 0.25).fillPoints(pts(r + 2.5 * u, 3 * u), true);
  g.fillStyle(0xb4621e, 1).fillPoints(pts(r + 2.5 * u), true);
  g.fillStyle(0xffd23f, 1).fillPoints(pts(r), true);
  g.fillStyle(0xfff1b0, 1).fillPoints(pts(r * 0.42), true);
}

export function cleanKey(levelId) {
  return getLevel(levelId).object.layers.find((x) => x.static)?.texture;
}

// The cleaned object as its own texture: the level's clean layer cropped to the object's visible
// bounds (computed once per level, cached in the texture manager).
function makeHeroTexture(scene, levelId) {
  const key = `mg-hero-${levelId}`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get(cleanKey(levelId)).getSourceImage();
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width;
  let y0 = c.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (d[(y * c.width + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0) [x0, y0, x1, y1] = [0, 0, c.width - 1, c.height - 1];
  const out = scene.textures.createCanvas(key, x1 - x0 + 2, y1 - y0 + 2);
  out.getContext().drawImage(c, x0, y0, x1 - x0 + 2, y1 - y0 + 2, 0, 0, x1 - x0 + 2, y1 - y0 + 2);
  out.refresh();
  return key;
}
