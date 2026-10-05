// Drag outlined items into a target (chair trash → bin, reference 04:20–04:28).
// A valid drop over the target's opening drops the item in; an invalid drop eases it back.
// Progress = items binned / total. Tapping or dragging empty space does nothing.
//
// Items and the target live in the object stack's overlay container (object-local units), so
// they scale and move with the object. Outlines: WebGL glow FX (bright green, STYLE-GUIDE §3).

const OUTLINE = 0x00f010;

export class DragToTargetMechanic {
  constructor({ stack, params, scene }) {
    this.stack = stack;
    this.params = params;
    this.scene = scene;
    this.completed = false;
    this.validContacts = 0;
    this.binned = 0;
    this.grabbed = null;
    const t = params.target;
    const tp = stack.childPos(t.x, t.y);
    this.target = scene.add.image(tp.x, tp.y, t.texture);
    this.target.setScale(t.size / Math.max(this.target.width, this.target.height));
    stack.overlay.add(this.target);
    this.items = params.items.map((it, i) => {
      const p = stack.childPos(it.x, it.y);
      const img = scene.add.image(p.x, p.y, it.texture);
      img.setScale(it.size / Math.max(img.width, img.height));
      img.setAngle([-8, 6, -4, 10, -6][i % 5]);
      img.preFX?.addGlow(OUTLINE, 3, 0, false, 0.1, 10);
      stack.overlay.add(img);
      return { def: it, img, home: { x: p.x, y: p.y, angle: img.angle, scale: img.scale }, done: false };
    });
    this.total = this.items.length;
    // Target in front so items visibly drop "into" it (item goes behind the rim on drop).
    stack.overlay.bringToTop(this.target);
  }

  get progress() {
    return this.binned / this.total;
  }

  // Local hit test: nearest undone item whose bounds contain the point.
  _itemAt(local) {
    const c = this.stack.childPos(local.x, local.y);
    let best = null;
    let bd = Infinity;
    for (const it of this.items) {
      if (it.done || it.animating) continue;
      const w = it.img.displayWidth * 0.62;
      const h = it.img.displayHeight * 0.62;
      const dx = Math.abs(c.x - it.img.x);
      const dy = Math.abs(c.y - it.img.y);
      if (dx <= w && dy <= h && dx + dy < bd) {
        bd = dx + dy;
        best = it;
      }
    }
    return best;
  }

  // Pointer API (world coordinates of the finger).
  grab(world) {
    if (this.completed) return false;
    const local = this.stack.toLocal(world);
    const it = this._itemAt(local);
    if (!it) return false;
    this.grabbed = it;
    const c = this.stack.childPos(local.x, local.y);
    it.offset = { x: it.img.x - c.x, y: it.img.y - c.y };
    this.stack.overlay.bringToTop(it.img);
    this.scene.tweens.add({ targets: it.img, scale: it.home.scale * 1.08, angle: 0, duration: 120 });
    return true;
  }

  drag(world) {
    const it = this.grabbed;
    if (!it) return;
    const local = this.stack.toLocal(world);
    const c = this.stack.childPos(local.x, local.y);
    it.img.setPosition(c.x + it.offset.x, c.y + it.offset.y);
  }

  _overTarget(it) {
    const t = this.params.target;
    const tp = this.stack.childPos(t.x, t.y);
    const half = (this.target.displayWidth / 2) * 0.95;
    const top = tp.y - this.target.displayHeight / 2;
    return Math.abs(it.img.x - tp.x) <= half && it.img.y >= top - this.target.displayHeight * 0.35 && it.img.y <= tp.y + this.target.displayHeight * 0.25;
  }

  release() {
    const it = this.grabbed;
    this.grabbed = null;
    if (!it) return;
    if (this._overTarget(it)) {
      it.animating = true;
      const t = this.params.target;
      const tp = this.stack.childPos(t.x, t.y);
      const mouthY = tp.y - this.target.displayHeight * (0.5 - (t.mouth ?? 0.6) * 0.3);
      // drop behind the bin rim
      this.stack.overlay.moveBelow(it.img, this.target);
      this.scene.tweens.add({
        targets: it.img,
        x: tp.x,
        y: mouthY + this.target.displayHeight * 0.15,
        scale: it.home.scale * 0.45,
        alpha: 0,
        angle: it.img.angle + 40,
        duration: 320,
        ease: 'Quad.easeIn',
        onComplete: () => {
          it.done = true;
          it.img.setVisible(false);
        },
      });
      this.binned += 1;
      this.validContacts += 1;
      if (this.binned >= this.total) this.completed = true;
    } else {
      this.scene.tweens.add({ targets: it.img, x: it.home.x, y: it.home.y, angle: it.home.angle, scale: it.home.scale, duration: 250, ease: 'Quad.easeOut' });
    }
  }

  // Contact-tool API is not used by this mechanic (no tool head).
  stroke() {}
  tap() {}

  // Hint / QA: next item and the target in object-local units.
  nextItemLocal() {
    const it = this.items.find((i) => !i.done && !i.animating);
    if (!it) return null;
    return { x: it.img.x + this.stack.size / 2, y: it.img.y + this.stack.size / 2 };
  }

  targetLocal() {
    const t = this.params.target;
    return { x: t.x, y: t.y - (this.target.displayHeight / 2) * 0.4 };
  }

  itemsLocal() {
    return this.items.filter((i) => !i.done && !i.animating).map((i) => ({ x: i.img.x + this.stack.size / 2, y: i.img.y + this.stack.size / 2 }));
  }

  finish() {
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: this.target, alpha: 0, y: this.target.y + 120, duration: 400, delay: 350, onComplete: () => resolve() });
    });
  }

  forceComplete() {
    for (const it of this.items) {
      it.done = true;
      it.img.setVisible(false);
    }
    this.binned = this.total;
    this.completed = true;
    return this.finish();
  }

  dispose() {
    this.items.forEach((i) => i.img.destroy());
    this.target.destroy();
  }
}
