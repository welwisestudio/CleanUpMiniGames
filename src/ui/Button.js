import { FONT_DISPLAY, TEXT } from './theme.js';
import { makeText } from './text.js';
import { nineSlice } from './kit.js';

// Button = generated surface (nine-slice, never stretched corners) + optional generated icon
// + dynamic label. Sizes are in the parent container's local units.
// `face` = vertical centre of the button's flat face (above its darker bottom lip) as a share of
// the height, measured on each generated surface; icons are centred on it. `label` = optical
// centre for text: on the glossy surfaces the bright highlight band across the top makes text on
// the geometric face centre read high, so labels sit slightly lower (designer review, build #41).
const STYLES = {
  green: { key: 'ui-btn-green', text: TEXT.white, stroke: TEXT.greenStroke, face: -0.075, label: -0.045 },
  yellow: { key: 'ui-btn-yellow', text: TEXT.white, stroke: TEXT.yellowStroke, face: -0.076, label: -0.046 },
  white: { key: 'ui-btn-white', text: TEXT.navy, stroke: null, face: -0.062, label: -0.062 },
  square: { key: 'ui-btn-square', text: TEXT.navy, stroke: null, face: -0.058, label: -0.058 },
  // rewarded-ad offer (chest): warm orange, clearly different from the green / yellow actions
  orange: { key: 'ui-btn-orange', text: TEXT.white, stroke: '#A8361A', face: -0.081, label: -0.051 },
  // x3 rewarded offer on the completed screen
  purple: { key: 'ui-btn-purple', text: TEXT.white, stroke: '#4B1D7A', face: -0.069, label: -0.039 },
  // post-level boost offer (rewarded ad): bright candy pink
  pink: { key: 'ui-btn-pink', text: TEXT.white, stroke: '#9C1458', face: -0.071, label: -0.041 },
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
    // Content sits on the button face (above its darker bottom lip), measured per surface.
    this.faceY = h * st.face;
    this.labelY = h * st.label;
    if (icon) {
      this.icon = scene.add.image(0, this.faceY, icon);
      const s = (Math.min(w, h) * (label ? Math.min(iconSize, 0.56) : iconSize)) / Math.max(this.icon.width, this.icon.height);
      this.icon.setScale(s);
      this.container.add(this.icon);
    }
    if (label) {
      const fs = fontSize ?? h * 0.42;
      this.label = makeText(scene, 0, this.labelY, label, {
        size: fs,
        color: st.text,
        family: FONT_DISPLAY,
        weight: '900',
        stroke: st.stroke ?? undefined,
        strokeThickness: st.stroke ? fs * 0.16 : 0,
      });
      this.container.add(this.label);
      this._fitContent();
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

  // Icon + label are one group centred on the button; long labels shrink to the free width
  // (keeps text centred; localization-safe).
  _fitContent() {
    const t = this.label;
    t.setScale(1);
    const gap = this.h * 0.12;
    const iconW = this.icon ? this.icon.displayWidth + gap : 0;
    const maxW = this.w * 0.8 - iconW;
    if (t.width > maxW) t.setScale(maxW / t.width);
    const groupW = iconW + t.displayWidth;
    const left = -groupW / 2;
    if (this.icon) this.icon.setX(left + this.icon.displayWidth / 2);
    t.setX(left + iconW + t.displayWidth / 2);
  }

  setLabel(str) {
    if (!this.label) return this;
    this.label.setText(str);
    this._fitContent();
    return this;
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
