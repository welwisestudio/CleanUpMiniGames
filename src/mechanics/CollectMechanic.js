// Collect (Step 9): the player holds a collecting tool (skimmer net) and sweeps its head through
// loose debris (leaves floating on the water). Every piece the head passes over is caught: it
// slides into the net head and disappears; pieces float gently until then. Progress = caught /
// total. Only the tool head counts — taps far from a piece or rubbing elsewhere add nothing.
//
// params: { items: [{ texture, x, y, size, angle }], catch: radius around the head (object units) }

export class CollectMechanic {
  constructor({ stack, params, scene }) {
    this.stack = stack;
    this.params = params;
    this.scene = scene;
    this.mode = 'hold'; // QA / hints: press near a piece and move a little
    this.catchR = params.catch ?? 80;
    this.completed = false;
    this.validContacts = 0;
    this.items = params.items.map((it, i) => {
      const p = stack.childPos(it.x, it.y);
      const img = scene.add.image(p.x, p.y, it.texture).setAngle(it.angle ?? 0);
      img.setScale(it.size / Math.max(img.width, img.height));
      stack.overlay.add(img);
      // floating: a slow bob and sway (visual only; the catch test uses the item's own point)
      const tw = scene.tweens.add({ targets: img, y: p.y + 6, angle: (it.angle ?? 0) + 8, duration: 1300 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return { ...it, img, tw, done: false };
    });
    this.total = this.items.length;
    this.caught = 0;
  }

  get progress() {
    return this.completed ? 1 : this.caught / Math.max(1, this.total);
  }

  _sweep(local) {
    for (const it of this.items) {
      if (it.done) continue;
      if ((it.x - local.x) ** 2 + (it.y - local.y) ** 2 > (this.catchR + it.size * 0.3) ** 2) continue;
      it.done = true;
      this.caught += 1;
      this.validContacts += 1;
      it.tw.stop();
      const head = this.stack.childPos(local.x, local.y);
      // the piece slides into the net head, shrinks and is gone
      this.scene.tweens.add({ targets: it.img, x: head.x, y: head.y, scale: it.img.scale * 0.35, alpha: 0, angle: it.img.angle + 90, duration: 260, ease: 'Quad.easeIn', onComplete: () => it.img.destroy() });
    }
    if (this.caught >= this.total) this.completed = true;
  }

  tap(world) {
    if (!this.completed) this._sweep(this.stack.toLocal(world));
  }

  // every sample along the movement of the head catches what it passes
  stroke(fromWorld, toWorld) {
    if (this.completed || !toWorld) return;
    const a = this.stack.toLocal(fromWorld ?? toWorld);
    const b = this.stack.toLocal(toWorld);
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (this.catchR * 0.5)));
    for (let i = 1; i <= n; i++) this._sweep({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n });
  }

  hold(world) {
    this.tap(world);
  }

  nextTargetLocal() {
    const it = this.items.find((x) => !x.done);
    return it ? { x: it.x, y: it.y, r: this.catchR } : null;
  }

  pointsLocal() {
    return this.items.filter((x) => !x.done).map((x) => ({ x: x.x, y: x.y, r: this.catchR * 0.6 }));
  }

  finish() {
    return Promise.resolve();
  }

  forceComplete() {
    for (const it of this.items) if (!it.done) this._sweep({ x: it.x, y: it.y });
    this.completed = true;
    return this.finish();
  }

  dispose() {
    for (const it of this.items) {
      it.tw?.stop();
      if (!it.done) it.img.destroy();
    }
  }
}
