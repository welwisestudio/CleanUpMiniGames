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

  setLayout({ scale, restX, restY }) {
    this.objScale = scale;
    this.rest = { x: restX, y: restY };
    if (this.sprite) {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setScale(this._spriteScale()).setAlpha(1);
      if (!this.active) this.sprite.setPosition(this.rest.x, this.rest.y).setAngle(0);
    }
  }

  _spriteScale() {
    const img = this.sprite;
    return (this.tool.displayLength * (this.toolScale ?? 1) * this.objScale) / Math.max(img.width, img.height);
  }

  setTool(tool, { animate = true } = {}) {
    this.tool = tool;
    this.sprite?.destroy();
    this.sprite = null;
    // A drop target (trash bin) is part of the scene, not a held tool: nothing follows the finger.
    if (tool.kind === 'target') {
      this.active = false;
      this.pointerWorld = null;
      return;
    }
    const s = this.scene.add.image(this.rest.x, this.rest.y, tool.texture).setDepth(41);
    s.setOrigin(tool.workingPoint.x, tool.workingPoint.y);
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
  setLoad(textureKey) {
    this.loadSprite?.destroy();
    this.loadSprite = null;
    if (!textureKey) return;
    this.loadSprite = this.scene.add.image(0, 0, textureKey).setDepth(42);
    this.loadSprite.setScale(0);
    const k = (70 * this.objScale) / Math.max(this.loadSprite.width, this.loadSprite.height);
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

  // Working point (contact) or nozzle (jet) for a pointer world position.
  workPointFor(pointerWorld) {
    return { x: pointerWorld.x + this.tool.workOffset.x * this.objScale, y: pointerWorld.y + this.tool.workOffset.y * this.objScale };
  }

  impactFor(nozzle) {
    return { x: nozzle.x, y: nozzle.y - (this.tool.jetLength ?? 0) * this.objScale };
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
      this.scene.tweens.add({ targets: this.sprite, x: this.rest.x, y: this.rest.y, angle: 0, scaleX: k, scaleY: k, duration: 220, ease: 'Quad.easeOut' });
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
    this.sprite.setPosition(wp.x, wp.y).setAngle(this.tilt);
    const k = this._spriteScale();
    if (this.tool.squash) {
      const sq = Phaser.Math.Clamp(Math.abs(dx) * 0.003, 0, 0.08);
      this.sprite.setScale(k * (1 + sq), k * (1 - sq));
    } else {
      this.sprite.setScale(k);
    }
  }

  // Per-frame jet visuals (code-drawn stream between nozzle and impact).
  update() {
    if (this.loadSprite && this.sprite) this.loadSprite.setPosition(this.sprite.x, this.sprite.y - 8 * this.objScale);
    this.jetGfx.clear();
    if (!this.active || !this.tool || this.tool.kind !== 'jet' || !this.pointerWorld) return;
    const nozzle = this.workPointFor(this.pointerWorld);
    const impact = this.impactFor(nozzle);
    const foam = this.tool.jetStyle === 'foam';
    const k = this.objScale;
    const spread = (this.sprayRadius ?? 100) / 100; // impact spray follows the stage's spray radius
    this.jetGfx.lineStyle((foam ? 26 : 12) * k, 0xffffff, foam ? 0.55 : 0.8);
    this.jetGfx.lineBetween(nozzle.x, nozzle.y, impact.x, impact.y);
    this.jetGfx.lineStyle((foam ? 12 : 5) * k, 0xffffff, 0.95);
    this.jetGfx.lineBetween(nozzle.x, nozzle.y, impact.x, impact.y);
    this.jetGfx.fillStyle(0xffffff, 0.55);
    for (let i = 0; i < 7; i++) {
      this.jetGfx.fillCircle(impact.x + Phaser.Math.Between(-45, 45) * k * spread, impact.y + Phaser.Math.Between(-45, 45) * k * spread, (foam ? 16 : 8) * k * spread);
    }
  }

  destroy() {
    this.loadSprite?.destroy();
    this.sprite?.destroy();
    this.jetGfx.destroy();
  }
}
