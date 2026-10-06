import Phaser from 'phaser';
import { COLORS, FONT_DISPLAY, FONT_UI, TEXT } from './theme.js';
import { makeText, fitText, centerRow } from './text.js';
import { nineSlice, fitImage } from './kit.js';
import { Button } from './Button.js';
import { refreshTextResolution } from './layout.js';
import { ASSET_META } from '../content/generated/assetMeta.js';

// Reward presentation (Step 6 reward pass): chest progress row, timed chest widget, chest offer
// window and the icon flight. These only DISPLAY state owned by RewardService; they never
// change balances themselves.

// Icons (coins / diamonds) flying from a point into a counter along gentle arcs. Each lands at
// the counter icon's size; `onEach(i)` lets the counter catch up step by step.
export function flyIcons(scene, { icon, from, to, fromSize, toSize, n = 5, depth = 800, delay = 0, onEach, onDone }) {
  const start = Math.min(fromSize, toSize * 1.1);
  for (let i = 0; i < n; i++) {
    const img = scene.add.image(from.x, from.y, icon).setDepth(depth).setAlpha(0);
    const base = 1 / Math.max(img.width, img.height);
    img.setScale(start * base);
    const side = i % 2 === 0 ? 1 : -1;
    const ctrl = { x: (from.x + to.x) / 2 + side * (0.06 + 0.03 * i) * scene.layout.W, y: Math.min(from.y, to.y) + (from.y - to.y) * 0.25 };
    const path = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2(ctrl.x, ctrl.y), new Phaser.Math.Vector2(to.x, to.y));
    const pos = new Phaser.Math.Vector2();
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      delay: delay + i * 110,
      duration: 650,
      ease: 'Sine.easeIn',
      onStart: () => img.setAlpha(1),
      onUpdate: (tw) => {
        const k = tw.getValue();
        path.getPoint(k, pos);
        img.setPosition(pos.x, pos.y).setScale((start + (toSize * 0.9 - start) * k) * base);
      },
      onComplete: () => {
        img.destroy();
        onEach?.(i);
        if (i === n - 1) onDone?.();
      },
    });
  }
}

// World position / on-screen size of a display object (for flights between containers).
export function worldOf(obj) {
  const m = obj.getWorldTransformMatrix();
  return { x: m.tx, y: m.ty, size: Math.hypot(m.a, m.b) * Math.max(obj.width, obj.height) };
}

export function formatTimer(ms) {
  const t = Math.ceil(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// ---- level-progress chest row (inside the result card) ----------------------------------------
// [chest] [ bar: "Level chest 40 %" ]. Sizes in the parent's units; centred on (cx, cy).
export class ChestProgressRow {
  constructor(scene, { cx, cy, w, h }) {
    this.scene = scene;
    this.h = h;
    this.container = scene.add.container(cx, cy);
    const chestBox = h * 1.55;
    this.chest = fitImage(scene, 'ui-chest-progress', chestBox, -w / 2 + chestBox / 2, -h * 0.05);
    this.chestBase = this.chest.scale;
    const barX0 = -w / 2 + chestBox + h * 0.2;
    this.barW = w / 2 - barX0;
    this.barCx = barX0 + this.barW / 2;
    this.track = nineSlice(scene, 'ui-pill', this.barW, h, this.barCx, 0).setTint(COLORS.track).setAlpha(0.75);
    this.fill = nineSlice(scene, 'ui-progress-fill', this.barW, h, barX0, 0);
    this.fill.setOrigin(0, 0.5);
    // label centred on the bar's flat face (above the pill's darker lower lip)
    this.text = makeText(scene, this.barCx, h * -0.06, '', { size: h * 0.56, color: TEXT.white, weight: '900', family: FONT_UI, stroke: '#0D233E', strokeThickness: h * 0.12 });
    this.container.add([this.track, this.fill, this.chest, this.text]);
    this.value = -1;
  }

  set(p, { ready = false } = {}) {
    const v = Phaser.Math.Clamp(p, 0, 1);
    this.value = v;
    const fw = Math.max(this.h, this.barW * v);
    this.fill.setVisible(v > 0);
    const k = this.fill.scaleY;
    const innerW = Math.max(this.fill.leftWidth + this.fill.rightWidth + 2, fw / k);
    this.fill.setSize(innerW, this.fill.height).setScale(fw / innerW, k);
    this.text.setText(ready ? 'Chest ready!' : `Level chest ${Math.round(v * 100)} %`);
    fitText(this.text, this.barW * 0.9);
  }

  // Bar runs from one value to another (one +20 % step per completed level).
  animate(from, to, { ready = false, delay = 0 } = {}) {
    this.set(from);
    return new Promise((resolve) => {
      this.scene.tweens.addCounter({
        from,
        to,
        delay,
        duration: 650,
        ease: 'Sine.easeOut',
        onUpdate: (tw) => this.set(tw.getValue()),
        onComplete: () => {
          this.set(to, { ready });
          this.scene.tweens.add({ targets: this.chest, scale: this.chestBase * 1.18, duration: 130, yoyo: true, ease: 'Quad.easeOut' });
          resolve();
        },
      });
    });
  }

  // Gentle wiggle while a full chest waits to be opened.
  setGlow(on) {
    this.glowTween?.stop();
    this.chest.setAngle(0).setScale(this.chestBase);
    if (on) this.glowTween = this.scene.tweens.add({ targets: this.chest, angle: { from: -6, to: 6 }, duration: 260, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Sine.easeInOut' });
  }
}

// ---- timed chest (menu header) ---------------------------------------------------------------
// Compact chest + timer pill. Built in UI units (the scene scales the container by `u`).
export const TIMED_CHEST_SIZE = { w: 74, h: 84 };

export class TimedChestWidget {
  // `interactive: false` = display only (gameplay HUD: a touch there must never claim mid-stroke)
  constructor(scene, { rewards, onClaimed, interactive = true }) {
    this.scene = scene;
    this.rewards = rewards;
    this.onClaimed = onClaimed;
    this.container = scene.add.container(0, 0);
    const { w, h } = TIMED_CHEST_SIZE;
    this.glow = scene.add.image(0, -h * 0.14, 'fx-sparkle').setAlpha(0);
    this.glow.setScale((w * 1.25) / this.glow.width);
    this.chest = fitImage(scene, 'ui-chest-timed', w * 0.86, 0, -h * 0.14);
    this.chestBase = this.chest.scale;
    const pillH = 24;
    const pillY = h / 2 - pillH / 2;
    this.pill = nineSlice(scene, 'ui-pill', w, pillH, 0, pillY);
    this.label = makeText(scene, 0, pillY, '0:00', { size: 16, color: TEXT.navy, weight: '900', family: FONT_UI });
    this.container.add([this.glow, this.chest, this.pill, this.label]);
    if (interactive) {
      this.zone = scene.add.zone(0, 0, Math.max(w, 48), Math.max(h, 48)).setInteractive({ useHandCursor: true });
      this.container.add(this.zone);
      this.zone.on('pointerup', () => this.tap());
    }
    this.ready = null;
    this.refresh();
    this.timer = scene.time.addEvent({ delay: 250, loop: true, callback: () => this.refresh() });
  }

  refresh() {
    const st = this.rewards.timedChestState();
    this.label.setText(st.ready ? 'Open!' : formatTimer(st.remainingMs));
    fitText(this.label, TIMED_CHEST_SIZE.w * 0.86);
    if (st.ready !== this.ready) {
      this.ready = st.ready;
      this.pill.setTint(st.ready ? 0xc9f5b8 : 0xffffff);
      this.label.setColor(st.ready ? '#1E7A24' : TEXT.navy);
      this.wiggle?.stop();
      this.glowTween?.stop();
      this.chest.setAngle(0).setScale(this.chestBase);
      this.glow.setAlpha(0);
      if (st.ready) {
        this.wiggle = this.scene.tweens.add({ targets: this.chest, angle: { from: -7, to: 7 }, duration: 240, yoyo: true, repeat: -1, repeatDelay: 1100, ease: 'Sine.easeInOut' });
        this.glowTween = this.scene.tweens.add({ targets: this.glow, alpha: { from: 0.25, to: 0.85 }, angle: 45, duration: 900, yoyo: true, repeat: -1 });
      }
    }
    return st;
  }

  tap() {
    if (this.scene.settings) return;
    const r = this.rewards.claimTimedChest();
    if (r.status !== 'granted') {
      // not ready yet: a small nudge, the timer stays visible
      this.scene.tweens.add({ targets: this.container, x: this.container.x + 4 * this.container.scaleX, duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    this.scene.services?.audio.play('ui-tap');
    this.scene.tweens.add({ targets: this.chest, scale: this.chestBase * 1.25, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
    this.refresh();
    this.onClaimed?.(r, worldOf(this.chest));
  }

  destroy() {
    this.timer?.remove();
    this.wiggle?.stop();
    this.glowTween?.stop();
    this.container.destroy();
  }
}

// ---- level-progress chest offer (full chest, rewarded ad) -------------------------------------
// Same card surface and ribbon as the result card. Green "Open chest" (ad) with a soft pulse and a
// sheen; below the card a text action "Skip chest" + the warning that a skipped chest is lost
// forever. Skipping (text or a tap outside the card) calls onSkip, which forfeits the chest.
// After a watched ad a short reel of reward cards scrolls and lands on the granted reward
// (deterministic: the reel's last card is always the configured reward; the other cards are decor).
const REEL_FILLERS = [
  ['coins', 40], ['vip'], ['diamonds', 1], ['coins', 80], ['diamonds', 3], ['coins', 25], ['vip'], ['coins', 60],
  ['diamonds', 2], ['coins', 120], ['vip'], ['coins', 35], ['diamonds', 1], ['coins', 90], ['vip'], ['coins', 50],
  ['diamonds', 4], ['coins', 70], ['vip'], ['coins', 30],
];

export class ChestOfferModal {
  constructor(scene, { rewards, onOpened, onSkip }) {
    this.scene = scene;
    this.rewards = rewards;
    this.onOpened = onOpened;
    this.onSkip = onSkip;
    this.phase = 'offer';
    this.openedAt = scene.time.now;
    this.root = scene.add.container(0, 0).setDepth(760);
    this.dim = scene.add.rectangle(0, 0, 10, 10, COLORS.dim, 0.66).setOrigin(0, 0);
    this.root.add(this.dim);
    const [cw, ch] = ASSET_META.ui['ui-result-card'].size;
    this.cw = cw;
    this.ch = ch;
    const card = scene.add.container(0, 0);
    this.card = card;
    card.add(scene.add.image(0, 0, 'ui-result-card'));
    const px = -0.011 * cw;
    const panelW = 0.627 * cw;
    this.px = px;
    this.panelW = panelW;
    card.add(
      makeText(scene, 0, ch * -0.346, 'Level Chest', {
        size: ch * 0.058,
        color: TEXT.white,
        family: FONT_DISPLAY,
        weight: '900',
        stroke: '#9A6B4E',
        strokeThickness: ch * 0.012,
        shadow: { y: ch * 0.004, color: 'rgba(90,50,30,0.45)' },
      }),
    );
    // offer: chest over slowly turning light rays
    this.offer = scene.add.container(0, 0);
    const heroY = -ch * 0.125;
    this.heroY = heroY;
    this.rays = scene.add.graphics();
    const R = panelW * 0.46;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.rays.fillStyle(0xffe08a, i % 2 ? 0.28 : 0.45);
      this.rays.slice(0, 0, R, a, a + Math.PI / 12, false).fillPath();
    }
    this.rays.setPosition(px, heroY);
    this.raysTween = scene.tweens.add({ targets: this.rays, angle: 360, duration: 14000, repeat: -1 });
    this.chest = fitImage(scene, 'ui-chest-progress', panelW * 0.58, px, heroY);
    this.chestBase = this.chest.scale;
    this.bob = scene.tweens.add({ targets: this.chest, y: heroY - ch * 0.012, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const st = rewards.progressChestState();
    const head = makeText(scene, px, ch * 0.085, `${st.max} levels completed!`, { size: ch * 0.044, color: '#B26A2E', weight: '900', family: FONT_DISPLAY });
    fitText(head, panelW * 0.92);
    const teaser = makeText(scene, px, ch * 0.145, 'Coins, diamonds or a VIP surprise inside!', { size: ch * 0.028, color: '#7B6A62', weight: '800', family: FONT_UI });
    fitText(teaser, panelW * 0.9);
    this.offer.add([this.rays, this.chest, head, teaser]);
    card.add(this.offer);
    // green CTA: soft pulse + a sheen sweeping across its face
    const bw = panelW * 0.86;
    const bh = ch * 0.11;
    this.open = new Button(scene, { id: 'chest-open', x: px, y: ch * 0.27, w: bw, h: bh, label: 'Open chest', style: 'green', icon: 'icon-ad-clapper', iconSize: 0.7, onClick: () => this.claim() });
    this.sheen = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const sw = bh * 0.55;
    const sh = bh * 0.62;
    this.sheen.fillStyle(0xffffff, 0.32).fillPoints([{ x: -sw / 2 + sh * 0.35, y: -sh / 2 }, { x: sw / 2 + sh * 0.35, y: -sh / 2 }, { x: sw / 2 - sh * 0.35, y: sh / 2 }, { x: -sw / 2 - sh * 0.35, y: sh / 2 }], true);
    this.sheen.setY(this.open.faceY).setAlpha(0);
    this.open.container.addAt(this.sheen, 1);
    const travel = bw / 2 - bh * 0.6; // stays inside the rounded face
    this.sheenTween = scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 900,
      delay: 600,
      repeat: -1,
      repeatDelay: 1600,
      onUpdate: (tw) => {
        const k = tw.getValue();
        this.sheen.setX(-travel + 2 * travel * k).setAlpha(Math.sin(Math.PI * k));
      },
    });
    this.pulse = scene.tweens.add({ targets: this.open.container, scale: 1.045, duration: 520, yoyo: true, repeat: -1, repeatDelay: 700, ease: 'Sine.easeInOut' });
    card.add(this.open.container);
    // below the card: skip text action + warning (secondary to the CTA)
    this.skip = makeText(scene, px, ch * 0.555, 'Skip chest', { size: ch * 0.036, color: '#FFFFFF', weight: '900', family: FONT_UI, stroke: '#3A2A22', strokeThickness: ch * 0.006 });
    this.skipLine = scene.add.rectangle(px, ch * 0.555 + this.skip.height * 0.36, this.skip.width * 0.92, ch * 0.003, 0xffffff, 0.85);
    this.warn = makeText(scene, px, ch * 0.605, 'You will lose this chest forever\nand never know what was inside!', { size: ch * 0.026, color: '#FFD9C2', weight: '800', family: FONT_UI, align: 'center' });
    fitText(this.warn, cw * 0.95);
    this.skipZone = scene.add.zone(px, ch * 0.555, Math.max(this.skip.width * 1.4, cw * 0.4), ch * 0.07).setInteractive({ useHandCursor: true });
    this.skipZone.on('pointerup', () => this.doSkip());
    card.add([this.skip, this.skipLine, this.warn, this.skipZone]);
    this.buttons = [this.open];
    const self = this;
    scene.qaTargets?.set('chest-card', { get x() { return self.card.x; }, get y() { return self.card.y; }, get w() { return cw * self.card.scale; }, get h() { return ch * self.card.scale; }, visible: true });
    scene.qaTargets?.set('chest-skip', { get x() { return self.skipZone.getWorldTransformMatrix().tx; }, get y() { return self.skipZone.getWorldTransformMatrix().ty; }, w: 10, h: 10, visible: true });
    // a tap outside the card closes the offer (= skip); ignored right after opening and while busy
    this.onOutside = (pointer) => {
      if (this.phase !== 'offer' || this.busy || this.scene.time.now - this.openedAt < 350) return;
      const s = this.card.scale;
      const inside = Math.abs(pointer.x - this.card.x) <= (cw / 2) * s && Math.abs(pointer.y - this.card.y) <= (ch / 2) * s;
      const onSkip = Math.abs(pointer.y - (this.card.y + ch * 0.58 * s)) <= ch * 0.08 * s;
      if (!inside && !onSkip) this.doSkip();
    };
    scene.input.on('pointerup', this.onOutside);
    this.root.add(card);
    this.layout(scene.layout);
    const k = card.scale;
    card.setScale(k * 0.8).setAlpha(0);
    this.dim.setAlpha(0);
    scene.tweens.add({ targets: this.dim, alpha: 1, duration: 180 });
    scene.tweens.add({ targets: card, alpha: 1, scale: k, duration: 220, ease: 'Back.easeOut', onComplete: () => refreshTextResolution(scene) });
    refreshTextResolution(scene);
  }

  doSkip() {
    if (this.phase !== 'offer' || this.busy || this.scene.time.now - this.openedAt < 350) return;
    this.phase = 'skipped';
    this.onSkip?.();
  }

  async claim() {
    if (this.busy || this.phase !== 'offer') return;
    this.busy = true;
    this.setEnabled(false);
    this.open.setLabel('Loading ad…');
    const r = await this.rewards.claimProgressChest();
    if (this.destroyed) return;
    if (r.status !== 'granted') {
      // cancelled / failed: nothing granted, the chest stays — try again
      this.open.setLabel(r.status === 'not-earned' ? 'Watch to the end' : 'Ad not available');
      this.scene.time.delayedCall(1400, () => !this.destroyed && this.open.setLabel('Open chest'));
      this.busy = false;
      this.setEnabled(true);
      return;
    }
    this.result = r;
    this.phase = 'reveal';
    this.bob.stop();
    this.pulse.stop();
    this.sheenTween.stop();
    this.scene.tweens.add({ targets: this.chest, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => this.reveal(r) });
  }

  // Reward reel: cards scroll under a centre marker, slow down and land on the granted reward.
  // The cards are clipped to the panel's reel window by a geometry mask (no overflow outside the
  // card at any time). Masks on containers nested in containers are ignored by Phaser, so the reel
  // is a top-level container kept in sync with the card's on-screen transform (`_syncReel`).
  reveal(r) {
    const { scene, ch, px, panelW } = this;
    this.scene.tweens.add({ targets: [this.offer, this.open.container, this.skip, this.skipLine, this.warn], alpha: 0, duration: 200 });
    this.skipZone.disableInteractive();
    const cardW = panelW * 0.36;
    const gap = cardW * 0.1;
    const step = cardW + gap;
    const y = -ch * 0.03;
    this.reelY = y;
    this.reelWin = { w: panelW * 0.96, h: cardW * 1.45 }; // window inside the white panel (card units)
    const half = this.reelWin.w / 2;
    this.reelRoot = scene.add.container(0, 0).setDepth(this.root.depth + 1);
    this.strip = scene.add.container(0, 0);
    this.reelRoot.add(this.strip);
    this.reelMaskG = scene.make.graphics({}, false);
    this.reelRoot.setMask(this.reelMaskG.createGeometryMask());
    const cards = [...REEL_FILLERS.map((f) => ({ kind: f[0], amount: f[1] })), { kind: 'final', coins: r.coins, diamonds: r.diamonds }, { kind: 'coins', amount: 45 }, { kind: 'vip' }];
    const finalIndex = REEL_FILLERS.length;
    this.reelCards = cards.map((c, i) => {
      const g = this._rewardCard(c, cardW);
      g.setPosition(i * step, 0);
      this.strip.add(g);
      return g;
    });
    // centre markers (yellow pointers above and below the window)
    const mk = scene.add.graphics();
    mk.fillStyle(0xffd729, 1).lineStyle(ch * 0.004, 0x9c7a12, 1);
    const t = ch * 0.022;
    const top = y - cardW * 0.62;
    const bot = y + cardW * 0.62;
    mk.fillTriangle(px - t, top - t * 1.1, px + t, top - t * 1.1, px, top + t * 0.4).strokeTriangle(px - t, top - t * 1.1, px + t, top - t * 1.1, px, top + t * 0.4);
    mk.fillTriangle(px - t, bot + t * 1.1, px + t, bot + t * 1.1, px, bot - t * 0.4).strokeTriangle(px - t, bot + t * 1.1, px + t, bot + t * 1.1, px, bot - t * 0.4);
    this.card.add(mk);
    this.markers = mk;
    const title = makeText(scene, px, -ch * 0.215, 'Opening…', { size: ch * 0.044, color: '#B26A2E', weight: '900', family: FONT_DISPLAY });
    const won = makeText(scene, px, ch * 0.175, `${r.coins} coins + ${r.diamonds} diamonds`, { size: ch * 0.036, color: TEXT.navy, weight: '900', family: FONT_UI }).setAlpha(0);
    fitText(won, panelW * 0.92);
    this.card.add([title, won]);
    const startX = half + cardW; // cards enter from the right edge of the window
    const endX = -finalIndex * step;
    const fade = () => {
      // soft edges inside the window (the mask does the hard clip)
      this.reelCards.forEach((g) => {
        const dx = Math.abs(this.strip.x + g.x);
        g.setAlpha(Phaser.Math.Clamp(1 - (dx - (half - cardW * 0.7)) / (cardW * 0.6), 0, 1));
        g.setScale(1 + 0.12 * Phaser.Math.Clamp(1 - dx / step, 0, 1));
      });
    };
    this.strip.setX(startX);
    this._syncReel();
    fade();
    let lastTick = Math.round(startX / step);
    scene.tweens.add({
      targets: this.strip,
      x: endX,
      duration: 2900,
      ease: 'Quart.easeOut',
      onUpdate: () => {
        this._syncReel();
        fade();
        const tick = Math.round(this.strip.x / step);
        if (tick !== lastTick) {
          lastTick = tick;
          scene.registry.get('services')?.audio.play('ui-tap');
        }
      },
      onComplete: () => {
        this.phase = 'landed';
        const win = this.reelCards[finalIndex];
        title.setText('You got:');
        scene.tweens.add({ targets: won, alpha: 1, duration: 250 });
        scene.tweens.add({ targets: win, scale: 1.25, duration: 220, yoyo: true, hold: 260, ease: 'Back.easeOut' });
        const glow = scene.add.image(px + this.strip.x + win.x, y, 'fx-sparkle').setAlpha(0);
        glow.setScale((cardW * 1.9) / glow.width);
        this.card.add(glow); // behind the reel (the reel is drawn above the card)
        scene.tweens.add({ targets: glow, alpha: 0.9, angle: 90, duration: 500, yoyo: true, hold: 300 });
        scene.time.delayedCall(700, () => {
          if (this.destroyed) return;
          this.phase = 'done';
          this.onOpened?.(r, worldOf(win.list[0]), {});
        });
      },
    });
    refreshTextResolution(scene);
  }

  // Reel container + its mask follow the card (position / scale, also after a resize).
  _syncReel() {
    if (!this.reelRoot) return;
    const s = this.card.scale;
    const x = this.card.x + this.px * s;
    const y = this.card.y + this.reelY * s;
    this.reelRoot.setPosition(x, y).setScale(s);
    const w = this.reelWin.w * s;
    const h = this.reelWin.h * s;
    this.reelMaskG.clear().fillStyle(0xffffff, 1).fillRect(x - w / 2, y - h / 2, w, h);
    this.scene.qaTargets?.set('chest-reel-window', { x, y, w, h, visible: true });
  }

  // One reward card: generated tile surface + icon(s) + live amount text.
  _rewardCard(c, w) {
    const { scene } = this;
    const g = scene.add.container(0, 0);
    const tile = fitImage(scene, 'ui-tile-large', w);
    g.add(tile);
    const fs = w * 0.2;
    const label = (str, yy, color = TEXT.navy) => makeText(scene, 0, yy, str, { size: fs, color, weight: '900', family: FONT_UI });
    if (c.kind === 'coins' || c.kind === 'diamonds') {
      g.add(fitImage(scene, c.kind === 'coins' ? 'icon-coin' : 'icon-diamond', w * 0.46, 0, -w * 0.1));
      g.add(label(`${c.amount}`, w * 0.3));
    } else if (c.kind === 'vip') {
      g.add(fitImage(scene, 'icon-vip', w * 0.56, 0, -w * 0.09));
      g.add(label('VIP games', w * 0.31, '#7A3DB8'));
      fitText(g.list[g.list.length - 1], w * 0.84);
    } else {
      // the granted bundle: coins + diamonds, with a golden frame
      const frame = scene.add.graphics();
      frame.lineStyle(w * 0.05, 0xffd729, 1).strokeRoundedRect(-w * 0.47, -w * 0.47, w * 0.94, w * 0.94, w * 0.2);
      g.add(frame);
      g.add(fitImage(scene, 'icon-coin', w * 0.32, -w * 0.18, -w * 0.13));
      g.add(fitImage(scene, 'icon-diamond', w * 0.32, w * 0.2, -w * 0.13));
      const t = label(`${c.coins} + ${c.diamonds}`, w * 0.27);
      fitText(t, w * 0.84);
      g.add(t);
    }
    return g;
  }

  layout(l) {
    this.dim.setSize(l.W, l.H);
    // the card leaves room below it for the skip action + warning
    const s = Math.min(Math.min(l.W * 0.9, 400 * l.u) / this.cw, (l.H * 0.78) / this.ch);
    this.fitScale = s;
    this.card.setPosition(l.W / 2, l.H * 0.45).setScale(s);
    this._syncReel();
  }

  setEnabled(v) {
    this.buttons.forEach((b) => b.setEnabled(v));
  }

  destroy() {
    this.destroyed = true;
    this.scene.input.off('pointerup', this.onOutside);
    this.scene.qaTargets?.delete('chest-skip');
    this.scene.qaTargets?.delete('chest-reel-window');
    this.scene.qaTargets?.delete('chest-card');
    this.reelRoot?.destroy();
    this.reelMaskG?.destroy();
    this.raysTween?.stop();
    this.bob?.stop();
    this.pulse?.stop();
    this.sheenTween?.stop();
    this.buttons.forEach((b) => b.destroy());
    this.root.destroy();
  }
}

// ---- level-progress chest status (menu header) -------------------------------------------------
// Same footprint and pill as the timed chest: chest + "40 %" / "Ready!". Tapping a full chest opens
// the offer, so a chest skipped with "Later" can always be claimed from the menu.
export class ProgressChestMini {
  constructor(scene, { rewards, onOpen, interactive = true }) {
    this.scene = scene;
    this.rewards = rewards;
    this.onOpen = onOpen;
    this.container = scene.add.container(0, 0);
    const { w, h } = TIMED_CHEST_SIZE;
    this.chest = fitImage(scene, 'ui-chest-progress', w * 0.8, 0, -h * 0.14);
    this.chestBase = this.chest.scale;
    const pillH = 24;
    const pillY = h / 2 - pillH / 2;
    this.pill = nineSlice(scene, 'ui-pill', w, pillH, 0, pillY);
    this.label = makeText(scene, 0, pillY, '', { size: 16, color: TEXT.navy, weight: '900', family: FONT_UI });
    this.container.add([this.chest, this.pill, this.label]);
    if (interactive) {
      this.zone = scene.add.zone(0, 0, Math.max(w, 48), Math.max(h, 48)).setInteractive({ useHandCursor: true });
      this.container.add(this.zone);
      this.zone.on('pointerup', () => this.tap());
    }
    this.full = null;
    this.refresh();
    // follows the saved progress (e.g. +20 % right after a completed level)
    this.timer = scene.time.addEvent({ delay: 300, loop: true, callback: () => this.refresh() });
  }

  refresh() {
    const st = this.rewards.progressChestState();
    this.label.setText(st.full ? 'Ready!' : `${Math.round(st.progress * 100)} %`);
    fitText(this.label, TIMED_CHEST_SIZE.w * 0.86);
    if (st.full !== this.full) {
      this.full = st.full;
      this.pill.setTint(st.full ? 0xc9f5b8 : 0xffffff);
      this.label.setColor(st.full ? '#1E7A24' : TEXT.navy);
      this.wiggle?.stop();
      this.chest.setAngle(0);
      if (st.full) this.wiggle = this.scene.tweens.add({ targets: this.chest, angle: { from: -6, to: 6 }, duration: 260, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Sine.easeInOut' });
    }
    return st;
  }

  tap() {
    if (this.refresh().full) this.onOpen?.();
    else this.scene.tweens.add({ targets: this.container, x: this.container.x + 4 * this.container.scaleX, duration: 50, yoyo: true, repeat: 2 });
  }

  destroy() {
    this.timer?.remove();
    this.wiggle?.stop();
    this.container.destroy();
  }
}
