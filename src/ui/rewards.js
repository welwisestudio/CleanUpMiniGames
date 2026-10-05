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
// Same card surface and ribbon as the result card. "Open chest" plays a rewarded ad; "Later"
// keeps the chest at 100 % (it is never silently reset).
export class ChestOfferModal {
  constructor(scene, { rewards, onOpened, onLater }) {
    this.scene = scene;
    this.rewards = rewards;
    this.root = scene.add.container(0, 0).setDepth(760);
    this.dim = scene.add.rectangle(0, 0, 10, 10, COLORS.dim, 0.6).setOrigin(0, 0);
    this.root.add(this.dim);
    const [cw, ch] = ASSET_META.ui['ui-result-card'].size;
    this.cw = cw;
    this.ch = ch;
    const card = scene.add.container(0, 0);
    this.card = card;
    card.add(scene.add.image(0, 0, 'ui-result-card'));
    const px = -0.011 * cw;
    const panelW = 0.627 * cw;
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
    // hero: chest over slowly turning light rays
    const heroY = -ch * 0.14;
    this.rays = scene.add.graphics();
    const R = panelW * 0.46;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.rays.fillStyle(0xffe08a, i % 2 ? 0.28 : 0.45);
      this.rays.slice(0, 0, R, a, a + Math.PI / 12, false).fillPath();
    }
    this.rays.setPosition(px, heroY);
    this.raysTween = scene.tweens.add({ targets: this.rays, angle: 360, duration: 14000, repeat: -1 });
    this.chest = fitImage(scene, 'ui-chest-progress', panelW * 0.56, px, heroY);
    this.chestBase = this.chest.scale;
    this.bob = scene.tweens.add({ targets: this.chest, y: heroY - ch * 0.012, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    card.add([this.rays, this.chest]);
    const st = rewards.progressChestState();
    const head = makeText(scene, px, ch * 0.05, `${st.max} levels completed!`, { size: ch * 0.042, color: '#B26A2E', weight: '900', family: FONT_DISPLAY });
    fitText(head, panelW * 0.9);
    // reward line: coin + amount · diamond + amount, as one centred row
    const rowY = ch * 0.12;
    const iconBox = ch * 0.058;
    const coin = fitImage(scene, 'icon-coin', iconBox);
    const coins = makeText(scene, 0, 0, `${st.coins}`, { size: ch * 0.044, color: TEXT.navy, weight: '900', family: FONT_UI });
    const dia = fitImage(scene, 'icon-diamond', iconBox);
    const dias = makeText(scene, 0, 0, `${st.diamonds}`, { size: ch * 0.044, color: TEXT.navy, weight: '900', family: FONT_UI });
    const rowPill = nineSlice(scene, 'ui-pill', panelW * 0.7, ch * 0.075, px, rowY).setTint(COLORS.rewardPill);
    card.add([head, rowPill, coin, coins, dia, dias]);
    const gap = ch * 0.012;
    centerRow([coin, coins, scene.add.zone(0, 0, ch * 0.03, 1), dia, dias], px, rowY, gap);
    this.coinIcon = coin;
    this.diamondIcon = dia;
    this.open = new Button(scene, { id: 'chest-open', x: px, y: ch * 0.235, w: panelW * 0.84, h: ch * 0.105, label: 'Open chest', style: 'orange', icon: 'icon-ad', iconSize: 0.62, onClick: () => this.claim() });
    this.later = new Button(scene, { id: 'chest-later', x: px, y: ch * 0.35, w: panelW * 0.5, h: ch * 0.075, label: 'Later', style: 'white', onClick: () => onLater?.() });
    this.note = makeText(scene, px, ch * 0.405, 'The chest stays here until you open it', { size: ch * 0.024, color: '#8C7F78', weight: '800', family: FONT_UI });
    fitText(this.note, panelW * 0.9);
    card.add([this.open.container, this.later.container, this.note]);
    this.buttons = [this.open, this.later];
    this.onOpened = onOpened;
    this.root.add(card);
    this.layout(scene.layout);
    const k = card.scale;
    card.setScale(k * 0.8).setAlpha(0);
    this.dim.setAlpha(0);
    scene.tweens.add({ targets: this.dim, alpha: 1, duration: 180 });
    scene.tweens.add({ targets: card, alpha: 1, scale: k, duration: 220, ease: 'Back.easeOut', onComplete: () => refreshTextResolution(scene) });
    refreshTextResolution(scene);
  }

  async claim() {
    if (this.busy) return;
    this.busy = true;
    this.setEnabled(false);
    this.open.setLabel('Loading ad…');
    const r = await this.rewards.claimProgressChest();
    if (this.destroyed) return;
    if (r.status !== 'granted') {
      // cancelled / failed: nothing granted, the chest stays full — try again or later
      this.open.setLabel(r.status === 'not-earned' ? 'Watch to the end' : 'Ad not available');
      this.scene.time.delayedCall(1400, () => !this.destroyed && this.open.setLabel('Open chest'));
      this.busy = false;
      this.setEnabled(true);
      return;
    }
    this.result = r;
    this.bob.stop();
    this.scene.tweens.add({ targets: this.chest, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 4, onComplete: () => {
      this.scene.tweens.add({ targets: this.chest, scale: this.chestBase * 1.25, alpha: 0, duration: 260, ease: 'Quad.easeIn' });
      this.onOpened?.(r, worldOf(this.chest), { coin: worldOf(this.coinIcon), diamond: worldOf(this.diamondIcon) });
    } });
  }

  layout(l) {
    this.dim.setSize(l.W, l.H);
    const s = Math.min(Math.min(l.W * 0.9, 400 * l.u) / this.cw, (l.H * 0.86) / this.ch);
    this.fitScale = s;
    this.card.setPosition(l.W / 2, l.H * 0.53).setScale(s);
  }

  setEnabled(v) {
    this.buttons.forEach((b) => b.setEnabled(v));
  }

  destroy() {
    this.destroyed = true;
    this.raysTween?.stop();
    this.bob?.stop();
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
