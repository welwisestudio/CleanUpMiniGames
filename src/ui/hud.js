import Phaser from 'phaser';
import { COLORS, TEXT, FONT_UI } from './theme.js';
import { makeText } from './text.js';
import { nineSlice, fitImage } from './kit.js';
import { UI } from './layout.js';

// HUD pieces built in UI units inside containers; the scene scales each container by `u`
// and anchors it to a screen edge (src/ui/layout.js).

export class CurrencyPill {
  constructor(scene, { icon, value = 0 }) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    const w = UI.pillW;
    const h = UI.pillH;
    this.bg = nineSlice(scene, 'ui-pill', w, h, w / 2 + 10, 0);
    this.icon = fitImage(scene, icon, h * 1.18, h * 0.42, 0);
    this.iconBaseScale = this.icon.scale;
    this.text = makeText(scene, w + 2, 1, String(value), { size: h * 0.56, color: TEXT.navy, weight: '900', originX: 1 });
    this.container.add([this.bg, this.icon, this.text]);
    this.value = value;
    this.width = w + 10;
  }

  setValue(v) {
    this.value = v;
    this.text.setText(String(v));
  }

  // Short "catch" bounce. Always relative to the icon's fixed base scale: overlapping pulses
  // (several coins landing 90 ms apart) restart the bounce instead of compounding it.
  pulse() {
    this.pulseTween?.stop();
    this.icon.setScale(this.iconBaseScale);
    this.pulseTween = this.scene.tweens.add({ targets: this.icon, scale: this.iconBaseScale * 1.15, duration: 80, yoyo: true, ease: 'Quad.easeOut', onComplete: () => this.icon.setScale(this.iconBaseScale) });
  }

  // Icon size on screen (device px), for the coin-fly animation.
  iconWorldSize() {
    const m = this.icon.getWorldTransformMatrix();
    return Math.hypot(m.a, m.b) * (this.iconBaseScale / this.icon.scale) * Math.max(this.icon.width, this.icon.height);
  }

  iconWorld() {
    const m = this.icon.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }
}

function frame(scene, size) {
  const g = scene.add.graphics();
  const r = size * 0.24;
  g.lineStyle(size * 0.075, COLORS.greenFrame, 1).strokeRoundedRect(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4, r);
  return g;
}

// Prev (✓) · current (framed) · next. Slides one step on stage change.
export class ToolStrip {
  constructor(scene, { stages, getTool }) {
    this.scene = scene;
    this.stages = stages;
    this.getTool = getTool;
    this.container = scene.add.container(0, 0);
    this.inner = scene.add.container(0, 0);
    this.container.add(this.inner);
    this.index = 0;
  }

  setIndex(index) {
    this.index = index;
    this.inner.removeAll(true);
    this.inner.x = 0;
    const add = (i, offset) => {
      if (i < 0 || i >= this.stages.length) return;
      const large = offset === 0;
      const size = large ? UI.tile : UI.tileSmall;
      const tile = this.scene.add.container(offset * UI.tileGap, 0);
      tile.add(fitImage(this.scene, large ? 'ui-tile-large' : 'ui-tile-small', size * 1.08));
      tile.add(fitImage(this.scene, this.getTool(this.stages[i].tool, this.stages[i]).texture, size * 0.7));
      if (large) tile.add(frame(this.scene, size));
      if (i < index) tile.add(fitImage(this.scene, 'icon-check', size * 0.42, size / 2 - 4, -size / 2 + 4));
      this.inner.add(tile);
    };
    add(index - 1, -1);
    add(index + 1, 1);
    add(index, 0);
  }

  markDone() {
    const b = fitImage(this.scene, 'icon-check', UI.tile * 0.36, UI.tile / 2 - 4, -UI.tile / 2 + 4);
    const s = b.scale;
    b.setScale(0);
    this.inner.add(b);
    this.scene.tweens.add({ targets: b, scale: { from: 0, to: s }, duration: 250, ease: 'Back.easeOut' });
  }

  slideNext() {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.inner,
        x: -UI.tileGap,
        duration: 500,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.setIndex(this.index + 1);
          resolve();
        },
      });
    });
  }
}

export class ProgressBar {
  constructor(scene) {
    this.scene = scene;
    this.w = UI.progressW;
    this.h = UI.progressH;
    this.container = scene.add.container(0, 0);
    this.track = nineSlice(scene, 'ui-pill', this.w, this.h).setTint(COLORS.track).setAlpha(0.72);
    this.fill = nineSlice(scene, 'ui-progress-fill', this.w, this.h);
    this.fill.setOrigin(0, 0.5).setX(-this.w / 2);
    this.text = makeText(scene, 0, 0, '0 %', { size: this.h * 0.68, color: TEXT.white, weight: '900', family: FONT_UI, stroke: '#0D233E', strokeThickness: 3 });
    this.container.add([this.track, this.fill, this.text]);
    this.value = -1;
    this.set(0);
  }

  set(p) {
    const v = Phaser.Math.Clamp(p, 0, 1);
    if (v === this.value) return;
    this.value = v;
    const fw = Math.max(this.h, this.w * v);
    this.fill.setVisible(v > 0);
    // nine-slice width in its own (unscaled) units
    const k = this.fill.scaleY;
    const [l, r] = [this.fill.leftWidth, this.fill.rightWidth];
    const innerW = Math.max(l + r + 2, fw / k);
    this.fill.setSize(innerW, this.fill.height);
    this.fill.setScale(fw / innerW, k);
    this.text.setText(`${Math.floor(v * 100)} %`);
  }
}

// Small dark labels that mark non-final context: TEST MODE (dev adapter) and the build number.
export function addStatusBadges(scene, { build, testMode }) {
  const items = [];
  if (testMode) items.push('TEST MODE · dev adapter');
  items.push(`build #${build.number}`);
  const c = scene.add.container(0, 0).setDepth(900);
  let x = 0;
  for (const label of items) {
    const t = makeText(scene, 0, 0, label, { size: 12, color: TEXT.white, weight: '800', originX: 0 });
    const w = t.width + 12;
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.45).fillRoundedRect(x, -10, w, 20, 7);
    t.setPosition(x + 6, 0);
    c.add([g, t]);
    x += w + 6;
  }
  c.layoutTo = (l) => c.setPosition(l.margin, l.H - l.margin - 6 * l.u).setScale(l.u);
  return c;
}
