// Fill / drain (Step 8, CONTENT-MATRIX §4.2): hold the pump or the hose on the water area and the
// level changes over time. `mode: 'drain'` lowers the water (the layer above the empty basin is
// cleared from the top down); `mode: 'fill'` raises it (the "empty basin" layer above the full
// water is cleared from the bottom up). Progress = level share. Moving the pointer is not needed;
// holding outside the water area does nothing.

export class FillLevelMechanic {
  constructor({ stack, params, scene }) {
    this.stack = stack;
    this.params = params;
    this.scene = scene;
    this.mode = params.mode === 'fill' ? 'fill' : 'drain';
    this.seconds = params.seconds ?? 4;
    this.level = 0;
    this.done = 0; // rows already cleared (local units)
    this.completed = false;
    this.validContacts = 0;
    this.region = params.region;
    const b = stack.regionBounds(this.region);
    this.box = { x0: b[0] - 4, y0: b[1] - 4, x1: b[2] + 4, y1: b[3] + 4 };
    this.line = scene.add.graphics();
    stack.overlay.add(this.line);
    this._drawLine();
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
    if (this.level >= 0.985) {
      this.level = 1;
      this._apply();
      this.completed = true;
    }
  }

  // Rows of the layer that the current level has uncovered are erased (once).
  _apply() {
    const { x0, y0, x1, y1 } = this.box;
    const h = (y1 - y0) * this.level;
    if (h - this.done < 1) return;
    if (this.mode === 'drain') this.stack.eraseRect(this.params.layer, x0, y0 + this.done, x1, y0 + h);
    else this.stack.eraseRect(this.params.layer, x0, y1 - h, x1, y1 - this.done);
    this.done = h;
    this._drawLine();
  }

  _drawLine() {
    const { x0, y0, x1, y1 } = this.box;
    const g = this.line;
    g.clear();
    if (this.completed || this.level <= 0 || this.level >= 1) return;
    const y = this.mode === 'drain' ? y0 + (y1 - y0) * this.level : y1 - (y1 - y0) * this.level;
    const a = this.stack.childPos(x0, y);
    const b = this.stack.childPos(x1, y);
    g.lineStyle(10, 0xffffff, 0.35).lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(4, 0xe8fbff, 0.8).lineBetween(a.x, a.y, b.x, b.y);
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
    // a point that is certainly inside the region (search near the centre)
    for (let k = 0; k < 30; k++) {
      const x = p.x + Math.cos(k * 2.4) * k * 6;
      const y = p.y + Math.sin(k * 2.4) * k * 6;
      if (this.stack.inRegion(x, y, this.region)) return [{ x: Math.round(x), y: Math.round(y), r: 20 }];
    }
    return [{ x: Math.round(p.x), y: Math.round(p.y), r: 20 }];
  }

  finish() {
    this.line.clear();
    if (this.done < this.box.y1 - this.box.y0) {
      this.level = 1;
      this._apply();
    }
    return Promise.resolve();
  }

  forceComplete() {
    this.level = 1;
    this._apply();
    this.completed = true;
    return this.finish();
  }

  dispose() {
    this.line.destroy();
  }
}
