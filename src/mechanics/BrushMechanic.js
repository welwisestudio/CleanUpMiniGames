import { CoverageGrid } from './CoverageGrid.js';

// Reveal / apply / transform stages.
//   reveal    – erases the listed layers under the tool head (brush, washer, cloth…)
//   apply     – paints a layer where the tool / jet hits (foam sprayer…)
//   transform – erases `from`, paints `to` and clears `clear` layers in the same stroke (scrubbing)
//
// The mechanic receives working points in WORLD coordinates, converts them to OBJECT-LOCAL
// coordinates (so behaviour is identical on every screen size) and talks to the object stack
// (display) through a small surface API. It never touches rewards, saves or UI.

const SPRAY_RATE = 45; // stamps per second while a jet is held

export class BrushMechanic {
  constructor({ stack, params, tool }) {
    this.stack = stack;
    this.params = params;
    this.tool = tool;
    this.mode = params.mode;
    this.radius = params.radius;
    this.threshold = params.threshold;
    this.grid = new CoverageGrid({ size: stack.size, cells: 48, isInside: (x, y) => stack.isInside(x, y) });
    this.completed = false;
    this.sprayTime = 0;
    this.validContacts = 0;
    this._paintedSinceClip = false;
  }

  get progress() {
    return this.completed ? 1 : Math.min(1, this.grid.progress);
  }

  // Contact tools: continuous stroke between two working points.
  stroke(fromWorld, toWorld) {
    if (this.completed) return;
    const from = this.stack.toLocal(fromWorld);
    const to = this.stack.toLocal(toWorld);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const step = Math.max(4, this.radius * 0.3);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      this._stampAt({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    }
    this._afterInput();
  }

  // Jet tools: time-based stamping at the impact point while held.
  spray(pointWorld, dtSeconds) {
    if (this.completed) return;
    const point = this.stack.toLocal(pointWorld);
    this.sprayTime += dtSeconds;
    const interval = 1 / SPRAY_RATE;
    let guard = 0;
    while (this.sprayTime >= interval && guard++ < 8) {
      this.sprayTime -= interval;
      const jitter = this.radius * 0.18;
      this._stampAt({ x: point.x + (Math.random() - 0.5) * jitter, y: point.y + (Math.random() - 0.5) * jitter });
    }
    this._afterInput();
  }

  // A single press without movement: one stamp (can never complete a stage by itself).
  tap(pointWorld) {
    if (this.completed) return;
    this._stampAt(this.stack.toLocal(pointWorld));
    this._afterInput();
  }

  _stampAt(local) {
    const r = this.radius;
    // Only stamps that touch the object have any effect (visual or progress).
    if (!this.stack.touchesObject(local.x, local.y, r * 0.6)) return;
    const p = this.params;
    if (this.mode === 'reveal') {
      for (const id of p.layers) this.stack.erase(id, local, r);
    } else if (this.mode === 'apply') {
      this.stack.paint(p.layer, p.stamp, local, r);
      this._paintedSinceClip = true;
    } else if (this.mode === 'transform') {
      this.stack.erase(p.from, local, r);
      this.stack.paint(p.to, p.stamp, local, r);
      for (const id of p.clear ?? []) this.stack.erase(id, local, r);
      this._paintedSinceClip = true;
    }
    if (this.grid.mark(local.x, local.y, r * 0.85) > 0) this.validContacts += 1;
  }

  _afterInput() {
    if (this._paintedSinceClip) {
      const id = this.mode === 'apply' ? this.params.layer : this.params.to;
      this.stack.clipToObject(id);
      this._paintedSinceClip = false;
    }
    if (!this.completed && this.grid.progress >= this.threshold) this.completed = true;
  }

  // Brings the visuals to the exact final state of this stage (leftover specks fade out).
  finish(duration = 300) {
    const p = this.params;
    if (this.mode === 'reveal') return this.stack.fadeOutLayers(p.layers, duration);
    if (this.mode === 'apply') return this.stack.fillLayer(p.layer, duration);
    return Promise.all([this.stack.fillLayer(p.to, duration), this.stack.fadeOutLayers([p.from, ...(p.clear ?? [])], duration)]);
  }

  // Skip support (not exposed to players in Step 2): jump to the correct final material.
  forceComplete() {
    this.completed = true;
    return this.finish(0);
  }

  dispose() {}
}
