// Spot targets (chair: wood putty into the dents, reference 05:28–05:40 + Reference_putty_dip).
// Each spot is a dashed green circle. With a `source` (putty tub), the knife must first be dipped
// into the tub (tool working point inside the tub opening, with some movement) to load putty;
// a loaded knife shows a putty blob on the blade. Rubbing the loaded knife inside a spot builds
// the putty up (distance of tool movement inside the spot); a spot is done at `fillDistance` and
// uses up the load. Progress = completed spots / total. Taps, holding still, rubbing outside the
// spots or rubbing with an empty knife add nothing.

const OUTLINE = 0x00f010;
const DIP_DISTANCE = 60; // movement inside the tub needed to load the knife

export class SpotsMechanic {
  constructor({ stack, params, scene }) {
    this.stack = stack;
    this.params = params;
    this.scene = scene;
    this.completed = false;
    this.validContacts = 0;
    this.spots = stack.regionCircles(params.region).map(([x, y, r], i) => ({ x, y, r, filled: 0, done: false, stamp: params.stamps[i % params.stamps.length], lastStampAt: 0 }));
    this.total = this.spots.length;
    this.doneCount = 0;
    this.rings = this.spots.map((s) => {
      const g = scene.add.graphics();
      this._drawDashed(g, s);
      stack.overlay.add(g);
      return g;
    });
    this.loaded = !params.source;
    this.dipped = 0;
    if (params.source) {
      const src = params.source;
      const p = stack.childPos(src.x, src.y);
      this.tub = scene.add.image(p.x, p.y, src.texture);
      this.tub.setScale(src.size / Math.max(this.tub.width, this.tub.height));
      stack.overlay.addAt(this.tub, 0);
      this.tubRing = scene.add.graphics();
      stack.overlay.add(this.tubRing);
      this._drawTubRing(true);
    }
  }

  _drawDashed(g, s, r = s.r * 1.15) {
    const p = this.stack.childPos(s.x, s.y);
    g.clear();
    g.lineStyle(5, OUTLINE, 1);
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / n / 2;
      g.beginPath();
      g.arc(p.x, p.y, r, a0, a1);
      g.strokePath();
    }
  }

  // Dashed ring around the tub opening while the knife is empty (where to dip).
  _drawTubRing(on) {
    if (!this.tubRing) return;
    this.tubRing.clear();
    if (!on) return;
    const t = this.tubOpening();
    this._drawDashed(this.tubRing, { x: t.x, y: t.y, r: t.r }, t.r);
  }

  // Tub opening (object-local): the upper part of the tub sprite.
  tubOpening() {
    const src = this.params.source;
    return { x: src.x, y: src.y - src.size * 0.12, r: src.size * 0.36 };
  }

  get progress() {
    return this.doneCount / this.total;
  }

  stroke(fromWorld, toWorld) {
    if (this.completed) return;
    const from = this.stack.toLocal(fromWorld);
    const to = this.stack.toLocal(toWorld);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    if (dist <= 0) return;
    const n = Math.max(1, Math.ceil(dist / 6));
    const seg = dist / n;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      if (!this.loaded) {
        const tub = this.tubOpening();
        if ((x - tub.x) ** 2 + (y - tub.y) ** 2 <= tub.r ** 2) {
          this.dipped += seg;
          this.validContacts += 1;
          if (this.dipped >= DIP_DISTANCE) this._load();
        }
        continue;
      }
      for (const s of this.spots) {
        if (s.done || (x - s.x) ** 2 + (y - s.y) ** 2 > (s.r * 1.25) ** 2) continue;
        s.filled += seg;
        this.validContacts += 1;
        if (s.filled - s.lastStampAt >= this.params.fillDistance / 8) {
          s.lastStampAt = s.filled;
          this.stack.stampTexture(this.params.layer, s.stamp, { x: s.x, y: s.y }, s.r * 2.3, 0.3);
        }
        if (s.filled >= this.params.fillDistance) this._complete(s);
      }
    }
  }

  _load() {
    this.loaded = true;
    this.dipped = 0;
    this._drawTubRing(false);
    this.scene.tools?.setLoad?.(this.params.source.load);
  }

  _complete(s) {
    s.done = true;
    this.stack.stampTexture(this.params.layer, s.stamp, { x: s.x, y: s.y }, s.r * 2.3, 1);
    const ring = this.rings[this.spots.indexOf(s)];
    this.scene.tweens.add({ targets: ring, alpha: 0, duration: 250 });
    this.doneCount += 1;
    if (this.params.source) {
      // one load fills one dent: dip again for the next one
      this.loaded = false;
      this.scene.tools?.setLoad?.(null);
      this._drawTubRing(this.doneCount < this.total);
    }
    if (this.doneCount >= this.total) this.completed = true;
  }

  tap() {
    /* no putty without rubbing */
  }

  needsLoad() {
    return !this.loaded;
  }

  nextSpotLocal() {
    const s = this.spots.find((sp) => !sp.done);
    return s ? { x: s.x, y: s.y, r: s.r } : null;
  }

  spotsLocal() {
    return this.spots.filter((s) => !s.done).map((s) => ({ x: s.x, y: s.y, r: s.r }));
  }

  finish() {
    if (!this.tub) return Promise.resolve();
    return new Promise((resolve) => this.scene.tweens.add({ targets: this.tub, alpha: 0, duration: 350, onComplete: () => resolve() }));
  }

  forceComplete() {
    this.loaded = true;
    this.spots.forEach((s) => !s.done && this._complete(s));
    return this.finish();
  }

  dispose() {
    this.rings.forEach((r) => r.destroy());
    this.tub?.destroy();
    this.tubRing?.destroy();
    this.scene.tools?.setLoad?.(null);
  }
}
