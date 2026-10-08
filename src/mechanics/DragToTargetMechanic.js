// Drag outlined items into a target (chair trash → bin, reference 04:20–04:28).
// A valid drop over the target's opening drops the item in; an invalid drop eases it back.
// Progress = items binned / total. Tapping or dragging empty space does nothing.
//
// Items and the target live in the object stack's overlay container (object-local units), so
// they scale and move with the object. Outlines: WebGL glow FX (bright green, STYLE-GUIDE §3).
//
// Step 8 extension (CONTENT-MATRIX §4.3 E2, parts):
//   item.fromLayer – the part is drawn in that object layer at the start (fan guard on the fan):
//                    the mechanic lifts it out of the layer (exact alpha cut) and makes it draggable;
//   item.slot      – install: the item is dropped into its outlined slot { x, y, size, angle } on the
//                    object instead of the target; a faint ghost marks the slot. `anySlot: true`
//                    lets any matching free slot take any item (identical keycaps).
//   onPlace        – what a seated part does to the object: { stamp: layer } bakes the item into
//                    that layer; { erase: layer, cut: texture } cuts the slot shape out of a layer
//                    (reveals the part already drawn underneath, e.g. a keycap).
//   params.tray    – optional decoration under the start positions (parts tray / soak tub).

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
    if (t) {
      const tp = stack.childPos(t.x, t.y);
      this.target = scene.add.image(tp.x, tp.y, t.texture);
      this.target.setScale(t.size / Math.max(this.target.width, this.target.height));
      stack.overlay.add(this.target);
    }
    if (params.tray) {
      const tp = stack.childPos(params.tray.x, params.tray.y);
      this.tray = scene.add.image(tp.x, tp.y, params.tray.texture);
      this.tray.setScale(params.tray.size / Math.max(this.tray.width, this.tray.height));
      stack.overlay.add(this.tray);
    }
    this.slots = [];
    this.items = params.items.map((it, i) => {
      const p = stack.childPos(it.x, it.y);
      if (it.fromLayer) stack.eraseTexture(it.fromLayer, it.cut ?? it.texture, it, it.size, it.angle ?? 0);
      const img = scene.add.image(p.x, p.y, it.texture);
      img.setScale(it.size / Math.max(img.width, img.height));
      img.setAngle(it.angle ?? (it.fromLayer ? 0 : [-8, 6, -4, 10, -6][i % 5]));
      img.preFX?.addGlow(OUTLINE, 3, 0, false, 0.1, 10);
      stack.overlay.add(img);
      if (it.slot) this.slots.push({ ...it.slot, texture: it.slotTexture ?? it.texture, filled: false, ghost: this._ghost(it.slot, it.slotTexture ?? it.texture) });
      return { def: it, img, home: { x: p.x, y: p.y, angle: img.angle, scale: img.scale }, done: false };
    });
    this.total = this.items.length;
    // Target in front so items visibly drop "into" it (item goes behind the rim on drop).
    if (this.target) stack.overlay.bringToTop(this.target);
  }

  _ghost(slot, texture) {
    const p = this.stack.childPos(slot.x, slot.y);
    const g = this.scene.add.image(p.x, p.y, texture).setAlpha(0.32).setTintFill(0xffffff);
    g.setScale((slot.size * 1.02) / Math.max(g.width, g.height));
    if (slot.angle) g.setAngle(slot.angle);
    g.preFX?.addGlow(OUTLINE, 2, 0, false, 0.1, 8);
    this.stack.overlay.addAt(g, 0);
    this.scene.tweens.add({ targets: g, alpha: { from: 0.4, to: 0.18 }, duration: 700, yoyo: true, repeat: -1 });
    return g;
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
    this.scene.tweens.add({ targets: it.img, scale: it.home.scale * 1.08, angle: it.def.slot ? it.def.slot.angle ?? 0 : 0, duration: 120 });
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
    if (!t) return false;
    const tp = this.stack.childPos(t.x, t.y);
    const half = (this.target.displayWidth / 2) * 0.95;
    const top = tp.y - this.target.displayHeight / 2;
    return Math.abs(it.img.x - tp.x) <= half && it.img.y >= top - this.target.displayHeight * 0.35 && it.img.y <= tp.y + this.target.displayHeight * 0.25;
  }

  // install: the free slot this item may go to under the drop point (generous snap distance)
  _slotFor(it) {
    const cands = this.params.anySlot ? this.slots.filter((s) => !s.filled) : this.slots.filter((s) => !s.filled && s === this.slots[this.items.indexOf(it)]);
    let best = null;
    let bd = Infinity;
    for (const s of cands) {
      const p = this.stack.childPos(s.x, s.y);
      const d = Math.hypot(it.img.x - p.x, it.img.y - p.y);
      if (d <= Math.max(s.size * 0.75, 60) && d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  release() {
    const it = this.grabbed;
    this.grabbed = null;
    if (!it) return;
    if (it.def.slot) {
      const s = this._slotFor(it);
      if (s) return this._seat(it, s);
    } else if (this._overTarget(it)) {
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
      this._count();
      return;
    }
    this.scene.tweens.add({ targets: it.img, x: it.home.x, y: it.home.y, angle: it.home.angle, scale: it.home.scale, duration: 250, ease: 'Quad.easeOut' });
  }

  _seat(it, s) {
    s.filled = true;
    it.animating = true;
    const p = this.stack.childPos(s.x, s.y);
    const scale = s.size / Math.max(it.img.width, it.img.height);
    this.scene.tweens.add({
      targets: it.img,
      x: p.x,
      y: p.y,
      angle: s.angle ?? 0,
      scale,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        it.done = true;
        this._applyPlace(it, s);
        it.img.setVisible(false);
        this.scene.tweens.killTweensOf(s.ghost);
        s.ghost.destroy();
      },
    });
    this._count();
  }

  _applyPlace(it, s) {
    const on = this.params.onPlace ?? {};
    if (on.erase) this.stack.eraseTexture(on.erase, it.def.cut ?? s.texture, s, s.size, s.angle ?? 0);
    if (on.stamp) this.stack.stampTextureAt(on.stamp, it.def.placed ?? it.def.texture, s, s.size, 1, s.angle ?? 0);
  }

  _count() {
    this.binned += 1;
    this.validContacts += 1;
    if (this.binned >= this.total) this.completed = true;
  }

  // Contact-tool API is not used by this mechanic (no tool head).
  stroke() {}
  tap() {}

  // Hint / QA: next item and its drop point in object-local units.
  nextItemLocal() {
    const it = this.items.find((i) => !i.done && !i.animating);
    if (!it) return null;
    return { x: it.img.x + this.stack.size / 2, y: it.img.y + this.stack.size / 2 };
  }

  _dropFor(it) {
    if (it.def.slot) {
      const s = this.params.anySlot ? this.slots.find((x) => !x.filled) : this.slots[this.items.indexOf(it)];
      return s ? { x: s.x, y: s.y } : null;
    }
    const t = this.params.target;
    return { x: t.x, y: t.y - (this.target.displayHeight / 2) * 0.4 };
  }

  targetLocal() {
    const it = this.items.find((i) => !i.done && !i.animating);
    return it ? this._dropFor(it) : null;
  }

  itemsLocal() {
    return this.items.filter((i) => !i.done && !i.animating).map((i) => {
      const d = this._dropFor(i);
      return { x: i.img.x + this.stack.size / 2, y: i.img.y + this.stack.size / 2, tx: d?.x, ty: d?.y };
    });
  }

  finish() {
    const gone = [this.target, this.tray].filter(Boolean);
    if (!gone.length) return Promise.resolve();
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: gone, alpha: 0, y: '+=120', duration: 400, delay: 350, onComplete: () => resolve() });
    });
  }

  forceComplete() {
    for (const it of this.items) {
      if (it.def.slot && !it.done) {
        const s = this.params.anySlot ? this.slots.find((x) => !x.filled) : this.slots[this.items.indexOf(it)];
        if (s) {
          s.filled = true;
          this._applyPlace(it, s);
          s.ghost.destroy();
        }
      }
      it.done = true;
      it.img.setVisible(false);
    }
    this.binned = this.total;
    this.completed = true;
    return this.finish();
  }

  dispose() {
    this.items.forEach((i) => i.img.destroy());
    this.slots.forEach((s) => s.ghost?.destroy());
    this.target?.destroy();
    this.tray?.destroy();
  }
}
