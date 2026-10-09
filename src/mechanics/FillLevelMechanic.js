// Fill / drain (Step 8, CONTENT-MATRIX §4.2): hold the pump or the hose on the water area and the
// level changes over time. `mode: 'drain'` lowers the water (the water layer above the empty basin
// is cleared from the top down); `mode: 'fill'` raises it (the "empty basin" layer above the full
// water is cleared from the bottom up). Progress = level share. Moving the pointer is not needed;
// holding outside the water area does nothing.
//
// Step 9 visuals (no guide line any more): the water edge is feathered, so the surface itself is
// seen falling / rising; while draining, droplets stream from the water surface into the pump's
// intake; while filling, the hose stream splashes where it lands and ripples run along the rising
// water edge.

const FEATHER = 26; // object-local px of soft edge above / below the moving water line

export class FillLevelMechanic {
  constructor({ stack, params, scene }) {
    this.stack = stack;
    this.params = params;
    this.scene = scene;
    this.mode = params.mode === 'fill' ? 'fill' : 'drain';
    this.seconds = params.seconds ?? 4;
    this.level = 0;
    this.done = 0; // rows already fully cleared (local units)
    this.completed = false;
    this.validContacts = 0;
    this.region = params.region;
    const b = stack.regionBounds(this.region);
    this.box = { x0: b[0] - 4, y0: b[1] - 4, x1: b[2] + 4, y1: b[3] + 4 };
    this.fx = scene.add.particles(0, 0, 'fx-dot', { emitting: false, lifespan: 520, speed: 0, scale: { start: 0.55, end: 0.15 }, alpha: { start: 0.85, end: 0 }, tint: [0xffffff, 0xd6f3ff, 0x9fdcf5] });
    this.splash = scene.add.particles(0, 0, 'fx-dot', { emitting: false, lifespan: 480, speed: { min: 60, max: 220 }, angle: { min: 200, max: 340 }, gravityY: 700, scale: { start: 0.6, end: 0.1 }, alpha: { start: 0.9, end: 0 }, tint: [0xffffff, 0xcfefff] });
    this.fx.setDepth(45);
    this.splash.setDepth(45);
    this.emitAcc = 0;
  }

  get progress() {
    return this.completed ? 1 : Math.min(1, this.level);
  }

  hold(world, dt) {
    if (this.completed) return;
    const l = this.stack.toLocal(world);
    if (!this.stack.inRegion(l.x, l.y, this.region)) return;
    this.level = Math.min(1, this.level + dt / this.seconds);
    this.validContacts += 1;
    this._apply();
    this._effects(world, dt);
    if (this.level >= 0.985) {
      this.level = 1;
      this._apply();
      this.completed = true;
    }
  }

  // current water-line row (object-local y)
  _lineY() {
    const { y0, y1 } = this.box;
    return this.mode === 'drain' ? y0 + (y1 - y0) * this.level : y1 - (y1 - y0) * this.level;
  }

  // Rows the level has passed are erased; a soft partial erase just beyond them feathers the edge.
  _apply() {
    const { x0, y0, x1, y1 } = this.box;
    const h = (y1 - y0) * this.level;
    if (h - this.done < 1) return;
    const id = this.params.layer;
    if (this.mode === 'drain') this.stack.eraseRect(id, x0, y0 + this.done, x1, y0 + h);
    else this.stack.eraseRect(id, x0, y1 - h, x1, y1 - this.done);
    this.done = h;
    if (this.level < 1 && this.stack.eraseRectSoft) {
      const y = this._lineY();
      if (this.mode === 'drain') this.stack.eraseRectSoft(id, x0, y, x1, Math.min(y1, y + FEATHER), 0.12);
      else this.stack.eraseRectSoft(id, x0, Math.max(y0, y - FEATHER), x1, y, 0.12);
    }
  }

  // points of the region on the current water line (local), for droplets / ripples
  _edgePoints(n) {
    const { x0, x1 } = this.box;
    const y = this._lineY();
    const pts = [];
    for (let i = 0; i < 24 && pts.length < n; i++) {
      const x = x0 + Math.random() * (x1 - x0);
      if (this.stack.inRegion(x, y, this.region)) pts.push({ x, y });
    }
    return pts;
  }

  _effects(world, dt) {
    this.emitAcc += dt;
    if (this.emitAcc < 0.045) return;
    this.emitAcc = 0;
    const k = this.stack.scale ?? 1;
    if (this.mode === 'drain') {
      // droplets travel from the water surface into the intake (suction)
      for (const p of this._edgePoints(3)) {
        const w = this.stack.toWorld(p);
        const d = this.scene.add.image(w.x, w.y, 'fx-dot').setDepth(45).setTint(0xcfefff).setAlpha(0.9).setScale(0.45 * Math.max(1, k * 2));
        this.scene.tweens.add({ targets: d, x: world.x, y: world.y, scale: 0.12, alpha: 0.3, duration: 420 + Math.random() * 200, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
      }
      this.fx.emitParticleAt(world.x + (Math.random() - 0.5) * 30 * k, world.y + (Math.random() - 0.5) * 30 * k, 1);
    } else {
      // the stream lands: splashes at the impact, ripples on the rising edge
      this.splash.emitParticleAt(world.x, world.y, 3);
      for (const p of this._edgePoints(2)) {
        const w = this.stack.toWorld(p);
        this.fx.emitParticleAt(w.x, w.y, 1);
      }
    }
  }

  tap() {}
  stroke() {}

  nextTargetLocal() {
    const { x0, y0, x1, y1 } = this.box;
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: Math.min(x1 - x0, y1 - y0) / 4 };
  }

  // QA: one press-and-hold point in the middle of the water area
  pointsLocal() {
    if (this.completed) return [];
    const p = this.nextTargetLocal();
    for (let k = 0; k < 30; k++) {
      const x = p.x + Math.cos(k * 2.4) * k * 6;
      const y = p.y + Math.sin(k * 2.4) * k * 6;
      if (this.stack.inRegion(x, y, this.region)) return [{ x: Math.round(x), y: Math.round(y), r: 20 }];
    }
    return [{ x: Math.round(p.x), y: Math.round(p.y), r: 20 }];
  }

  finish() {
    if (this.done < this.box.y1 - this.box.y0) {
      this.level = 1;
      this._apply();
    }
    // the feathered edge is part of the cleared water: clear the whole box at the end
    const { x0, y0, x1, y1 } = this.box;
    this.stack.eraseRect(this.params.layer, x0, y0, x1, y1);
    return Promise.resolve();
  }

  forceComplete() {
    this.level = 1;
    this._apply();
    this.completed = true;
    return this.finish();
  }

  dispose() {
    this.fx.destroy();
    this.splash.destroy();
  }
}
