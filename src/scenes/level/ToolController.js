import Phaser from 'phaser';

// Shows the current tool, follows the pointer and converts the pointer position into the
// tool's working point (contact tools) or nozzle + jet impact point (jet tools).
// Tool size, finger offset and jet length are object-local lengths scaled with the object,
// so the composition holds on every screen size.

export class ToolController {
  constructor(scene) {
    this.scene = scene;
    this.tool = null;
    this.sprite = null;
    this.jetGfx = scene.add.graphics().setDepth(40);
    this.pointerWorld = null;
    this.active = false;
    this.lastX = null;
    this.tilt = 0;
    this.objScale = 1;
    this.rest = { x: 0, y: 0 };
  }

  setLayout({ scale, restX, restY, ui = this.uiScale ?? 1, jetCap = this.jetCap }) {
    this.objScale = scale;
    this.jetCap = jetCap; // max jet length in device px (30 % of the play height)
    this.uiScale = ui; // device px per UI unit (screen-scale jets)
    this.rest = { x: restX, y: restY };
    if (this.sprite) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setScale(this._spriteScale()).setAlpha(1);
      if (!this.active) this.sprite.setPosition(this.rest.x, this.rest.y).setAngle(this.tool.holdAngle ?? 0);
    }
  }

  _spriteScale() {
    const img = this.sprite;
    return (this.tool.displayLength * (this.toolScale ?? 1) * this.objScale) / Math.max(img.width, img.height);
  }

  setTool(tool, { animate = true } = {}) {
    this.tool = tool;
    this.inert = false;
    this.sprite?.destroy();
    this.sprite = null;
    // A drop target (trash bin) is part of the scene, not a held tool: nothing follows the finger.
    if (tool.kind === 'target') {
      this.active = false;
      this.pointerWorld = null;
      return;
    }
    const s = this.scene.add.image(this.rest.x, this.rest.y, tool.texture).setDepth(41);
    s.setOrigin(tool.workingPoint.x, tool.workingPoint.y).setAngle(tool.holdAngle ?? 0);
    this.sprite = s;
    const k = this._spriteScale();
    s.setScale(k);
    this.active = false;
    this.pointerWorld = null;
    if (animate) {
      s.setScale(k * 0.6).setAlpha(0);
      this.scene.tweens.add({ targets: s, scale: k, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    }
  }

  // Material carried by the tool (putty on the knife after dipping): a small blob drawn at the
  // working point, following the tool. null removes it.
  // Step 8: `tint` colours a generic blob (paint on a roller / brush).
  setLoad(textureKey, tint) {
    this.loadSprite?.destroy();
    this.loadSprite = null;
    if (!textureKey) return;
    this.loadSprite = this.scene.add.image(0, 0, textureKey).setDepth(42);
    if (tint != null) this.loadSprite.setTint(tint);
    this.loadSprite.setScale(0);
    const k = ((tint != null ? 90 : 70) * this.objScale) / Math.max(this.loadSprite.width, this.loadSprite.height);
    this.scene.tweens.add({ targets: this.loadSprite, scale: k, duration: 220, ease: 'Back.easeOut' });
  }

  exit() {
    this.setLoad(null);
    if (!this.sprite) return Promise.resolve();
    const s = this.sprite;
    this.sprite = null;
    this.jetGfx.clear();
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: s,
        y: s.y + 300 * this.objScale,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => {
          s.destroy();
          resolve();
        },
      });
    });
  }

  // World-space scale of the tool geometry (offsets, jet): side-held tools follow toolScale.
  _geomScale() {
    return this.objScale * (this.tool.scaleOffset ? this.toolScale ?? 1 : 1);
  }

  // Finger → working point / nozzle, in world px.
  offset() {
    const k = this._geomScale();
    return { x: (this.tool.workOffset?.x ?? 0) * k, y: (this.tool.workOffset?.y ?? 0) * k };
  }

  // Nozzle → jet impact, in world px (jetAngle: -90 = straight up).
  jetVector() {
    if (this.tool.kind !== 'jet') return { x: 0, y: 0 };
    const a = ((this.tool.jetAngle ?? -90) * Math.PI) / 180;
    const len = this.tool.jetUi ? Math.min(this.tool.jetUi * (this.uiScale ?? 1), this.jetCap ?? Infinity) : (this.tool.jetLength ?? 0) * this._geomScale();
    return { x: Math.cos(a) * len, y: Math.sin(a) * len };
  }

  // Working point (contact) or nozzle (jet) for a pointer world position.
  workPointFor(pointerWorld) {
    const o = this.offset();
    return { x: pointerWorld.x + o.x, y: pointerWorld.y + o.y };
  }

  impactFor(nozzle) {
    const v = this.jetVector();
    return { x: nozzle.x + v.x, y: nozzle.y + v.y };
  }

  press(pointerWorld) {
    this.active = true;
    this.pointerWorld = pointerWorld;
    this.lastX = pointerWorld.x;
    // Pressing interrupts any entry/return tween: make sure the tool is fully shown.
    if (this.sprite) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setAlpha(1).setScale(this._spriteScale());
    }
    this._place();
  }

  move(pointerWorld) {
    this.pointerWorld = pointerWorld;
    this._place();
  }

  release() {
    this.active = false;
    this.jetGfx.clear();
    if (this.sprite) {
      const k = this._spriteScale();
      this.scene.tweens.add({ targets: this.sprite, x: this.rest.x, y: this.rest.y, angle: this.tool.holdAngle ?? 0, scaleX: k, scaleY: k, duration: 220, ease: 'Quad.easeOut' });
    }
  }

  _place() {
    if (!this.sprite || !this.pointerWorld) return;
    this.scene.tweens.killTweensOf(this.sprite);
    const wp = this.workPointFor(this.pointerWorld);
    const dx = this.lastX == null ? 0 : (wp.x - this.lastX) / this.objScale;
    this.lastX = wp.x;
    const maxTilt = this.tool.tiltWithMotion ?? 0;
    this.tilt = Phaser.Math.Linear(this.tilt, Phaser.Math.Clamp(dx * 0.5, -maxTilt, maxTilt), 0.35);
    this.sprite.setPosition(wp.x, wp.y).setAngle((this.tool.holdAngle ?? 0) + this.tilt);
    const k = this._spriteScale();
    if (this.tool.squash) {
      const sq = Phaser.Math.Clamp(Math.abs(dx) * 0.003, 0, 0.08);
      this.sprite.setScale(k * (1 + sq), k * (1 - sq));
    } else {
      this.sprite.setScale(k);
    }
  }

  // Step 8: hammer / mallet blow — a quick swing around the working point (visual only).
  // Step 9: the head is the working point, so the swing lifts the head and drops it straight onto
  // the target (a short tilt-back too); the hit lands exactly where the player pointed.
  strike() {
    const s = this.sprite;
    if (!s) return;
    const base = this.tool.holdAngle ?? 0;
    const y = s.y;
    this.scene.tweens.killTweensOf(s);
    s.setAngle(base + 14).setY(y - 46 * this.objScale);
    this.scene.tweens.add({ targets: s, angle: base, y, duration: 95, ease: 'Quad.easeIn' });
  }

  // Per-frame jet visuals (code-drawn stream between nozzle and impact).
  update() {
    if (this.loadSprite && this.sprite) this.loadSprite.setPosition(this.sprite.x, this.sprite.y - 8 * this.objScale);
    this.jetGfx.clear();
    if (!this.active || this.inert || !this.tool || this.tool.kind !== 'jet' || !this.pointerWorld) return;
    const nozzle = this.workPointFor(this.pointerWorld);
    const impact = this.impactFor(nozzle);
    const foam = this.tool.jetStyle === 'foam';
    if (this.tool.jetStyle === 'paint' || this.tool.jetStyle === 'air' || this.tool.jetStyle === 'steam') {
      this._fineJet(nozzle, impact);
      return;
    }
    if (this.tool.jetStyle === 'laser') {
      this._laser(nozzle, impact);
      return;
    }
    const k = this.objScale;
    const spread = (this.sprayRadius ?? 100) / 100; // impact spray follows the stage's spray radius
    const g = this._geomScale() / k; // side-held tools draw a proportionally thinner stream
    if (foam) {
      // foam leaves the nozzle tip as a narrow stream that widens toward the object, with blobs
      // travelling along it (so it visibly comes out of the nozzle)
      const dx = impact.x - nozzle.x;
      const dy = impact.y - nozzle.y;
      const n = 10;
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        this.jetGfx.lineStyle((6 + 22 * t1) * k * g, 0xffffff, 0.45 + 0.25 * t1);
        this.jetGfx.lineBetween(nozzle.x + dx * t0, nozzle.y + dy * t0, nozzle.x + dx * t1, nozzle.y + dy * t1);
      }
      const phase = (this.scene.time.now / 380) % 1;
      this.jetGfx.fillStyle(0xffffff, 0.9);
      for (let i = 0; i < 4; i++) {
        const t = (phase + i / 4) % 1;
        this.jetGfx.fillCircle(nozzle.x + dx * t, nozzle.y + dy * t, (5 + 12 * t) * k * g);
      }
    } else {
      this.jetGfx.lineStyle(12 * k, 0xffffff, 0.8);
      this.jetGfx.lineBetween(nozzle.x, nozzle.y, impact.x, impact.y);
      this.jetGfx.lineStyle(5 * k, 0xffffff, 0.95);
      this.jetGfx.lineBetween(nozzle.x, nozzle.y, impact.x, impact.y);
    }
    this.jetGfx.fillStyle(0xffffff, 0.55);
    for (let i = 0; i < 7; i++) {
      this.jetGfx.fillCircle(impact.x + Phaser.Math.Between(-45, 45) * k * spread, impact.y + Phaser.Math.Between(-45, 45) * k * spread, (foam ? 16 : 8) * k * spread);
    }
  }

  // Step 8 jet styles: 'paint' = a fan of fine coloured mist (spray gun, `paintTint`), 'air' = a
  // thin translucent air stream (blower). Code-drawn like the water / foam jets.
  _fineJet(nozzle, impact) {
    const g = this.jetGfx;
    const k = this.objScale;
    const spread = (this.sprayRadius ?? 100) / 100;
    const dx = impact.x - nozzle.x;
    const dy = impact.y - nozzle.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const paint = this.tool.jetStyle === 'paint';
    const steam = this.tool.jetStyle === 'steam';
    const col = paint ? this.paintTint ?? 0xffffff : steam ? 0xffffff : 0xe8f6ff;
    const phase = (this.scene.time.now / 300) % 1;
    for (let i = 0; i < 16; i++) {
      const t = (phase + i / 16) % 1;
      const w = (paint ? 6 + 46 * t : steam ? 4 + 34 * t : 3 + 20 * t) * k * spread;
      const side = Math.sin(i * 2.399) * w;
      g.fillStyle(col, (paint ? 0.55 : steam ? 0.3 : 0.35) * (1 - t * 0.5));
      g.fillCircle(nozzle.x + dx * t + nx * side, nozzle.y + dy * t + ny * side, (paint ? 3 + 7 * t : steam ? 4 + 12 * t : 2 + 3 * t) * k);
    }
    if (!paint) {
      g.lineStyle(4 * k, 0xffffff, 0.25);
      g.lineBetween(nozzle.x, nozzle.y, impact.x, impact.y);
    }
    g.fillStyle(col, paint ? 0.35 : 0.2);
    for (let i = 0; i < 6; i++) g.fillCircle(impact.x + Phaser.Math.Between(-40, 40) * k * spread, impact.y + Phaser.Math.Between(-40, 40) * k * spread, (paint ? 14 : 9) * k * spread);
  }

  // Step 8 laser cleaner: a thin bright beam from the emitter to the contact point with a soft
  // glow and a hot spot where it burns the rust off (code-drawn, flickers slightly).
  _laser(nozzle, impact) {
    const g = this.jetGfx;
    const k = this.objScale;
    const col = this.tool.beamTint ?? 0xff3b30;
    const f = 0.85 + Math.random() * 0.15;
    g.lineStyle(16 * k, col, 0.18 * f).lineBetween(nozzle.x, nozzle.y, impact.x, impact.y);
    g.lineStyle(7 * k, col, 0.55 * f).lineBetween(nozzle.x, nozzle.y, impact.x, impact.y);
    g.lineStyle(2.5 * k, 0xffffff, 0.95).lineBetween(nozzle.x, nozzle.y, impact.x, impact.y);
    const r = (this.sprayRadius ?? 60) * k;
    g.fillStyle(col, 0.22 * f).fillCircle(impact.x, impact.y, r * 0.9);
    g.fillStyle(0xffe9a8, 0.7 * f).fillCircle(impact.x, impact.y, r * 0.35);
    g.fillStyle(0xffffff, 0.95).fillCircle(impact.x, impact.y, r * 0.15);
  }

  destroy() {
    this.loadSprite?.destroy();
    this.sprite?.destroy();
    this.jetGfx.destroy();
  }
}
