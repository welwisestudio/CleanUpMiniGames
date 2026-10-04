import { FONT_DISPLAY, TEXT } from './theme.js';
import { makeText } from './text.js';
import { nineSlice } from './kit.js';

// Button = generated surface (nine-slice, never stretched corners) + optional generated icon
// + dynamic label. Sizes are in the parent container's local units.
const STYLES = {
  green: { key: 'ui-btn-green', text: TEXT.white, stroke: TEXT.greenStroke },
  yellow: { key: 'ui-btn-yellow', text: TEXT.white, stroke: TEXT.yellowStroke },
  white: { key: 'ui-btn-white', text: TEXT.navy, stroke: null },
  square: { key: 'ui-btn-square', text: TEXT.navy, stroke: null },
};

export class Button {
  constructor(scene, { id, x, y, w, h, label = '', style = 'green', fontSize, icon = null, iconSize = 0.62, onClick }) {
    this.scene = scene;
    this.id = id;
    this.w = w;
    this.h = h;
    this.enabled = true;
    this.onClick = onClick;
    const st = STYLES[style];
    this.container = scene.add.container(x, y);
    this.bg = nineSlice(scene, st.key, w, h);
    this.container.add(this.bg);
    if (icon) {
      const img = scene.add.image(0, -h * 0.03, icon);
      const s = (Math.min(w, h) * iconSize) / Math.max(img.width, img.height);
      img.setScale(s);
      this.container.add(img);
    }
    if (label) {
      const fs = fontSize ?? h * 0.42;
      this.label = makeText(scene, 0, -h * 0.05, label, {
        size: fs,
        color: st.text,
        family: FONT_DISPLAY,
        weight: '900',
        stroke: st.stroke ?? undefined,
        strokeThickness: st.stroke ? fs * 0.16 : 0,
      });
      this.container.add(this.label);
    }
    this.zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    this.container.add(this.zone);
    this.zone.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.container.setScale(this.baseScale * 0.95);
    });
    this.zone.on('pointerout', () => {
      this.pressed = false;
      this.container.setScale(this.baseScale);
    });
    this.zone.on('pointerup', () => {
      const was = this.pressed;
      this.pressed = false;
      this.container.setScale(this.baseScale);
      if (was && this.enabled) this.onClick?.();
    });
    this.baseScale = 1;
    scene.qaButtons?.set(id, this);
  }

  setPlacement(x, y, scale = 1) {
    this.baseScale = scale;
    this.container.setPosition(x, y).setScale(scale);
    return this;
  }

  setEnabled(v) {
    this.enabled = v;
    this.container.setAlpha(v ? 1 : 0.6);
    return this;
  }

  setDepth(d) {
    this.container.setDepth(d);
    return this;
  }

  // World-space rectangle, accounting for parent containers and scale.
  worldRect() {
    const m = this.zone.getWorldTransformMatrix();
    const sx = Math.hypot(m.a, m.b);
    const sy = Math.hypot(m.c, m.d);
    return { x: m.tx, y: m.ty, w: this.w * sx, h: this.h * sy, visible: this._visibleChain() };
  }

  _visibleChain() {
    let c = this.container;
    while (c) {
      if (!c.visible || c.alpha === 0) return false;
      c = c.parentContainer;
    }
    return this.enabled;
  }

  destroy() {
    this.scene.qaButtons?.delete(this.id);
    this.container.destroy();
  }
}
