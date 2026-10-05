import { CoverageGrid } from './CoverageGrid.js';

// Reveal / apply / scrub stages.
//   reveal    – erases the listed layers under the tool head (brush, washer, cloth…)
//   apply     – paints a layer where the tool / jet hits (foam sprayer…)
//   scrub     – one foam material evolving: the scrubbed (swirled, thinner) state of the same foam
//               is laid instantly UNDER the fresh foam when the stage starts (hidden by it); each
//               stroke erases the fresh foam and the grime layers listed in `clear`, so the swirled
//               foam and the cleaned ball beneath appear gradually under the brush. No image swap.
//
// Options: `region` (stage-restricted area: only it counts and is cleaned at the end),
// `aspect` (> 1 = wide stamp, e.g. a squeegee blade), `clip` (outside-mask key for painting).
// A tool with a long soft head (duster, `tool.head` = [width, length]) cleans an upright ellipse
// of the head's shape: `radius` = half the head width, aspectY = length / width (Step 6).
//
// The mechanic receives working points in WORLD coordinates, converts them to OBJECT-LOCAL
// coordinates (so behaviour is identical on every screen size) and talks to the object stack
// (display) through a small surface API. It never touches rewards, saves or UI.

const SPRAY_RATE = 45; // stamps per second while a jet is held

// Soft auto-complete (Step 6): from SOFT_MIN progress, a stage completes when only small scattered
// remnants are left (largest uncovered patch ≤ max(SOFT_BLOB_MIN cells, SOFT_BLOB_SHARE of the
// area)). The remnants then fade out smoothly in finish(). Large unfinished patches never count.
export const SOFT_MIN = 0.85;
const SOFT_BLOB_SHARE = 0.025;
const SOFT_BLOB_MIN = 4;

export class BrushMechanic {
  constructor({ stack, params, tool }) {
    this.stack = stack;
    this.params = params;
    this.tool = tool;
    this.mode = params.mode;
    this.radius = params.radius;
    this.threshold = params.threshold;
    this.region = params.region ?? null;
    this.aspect = params.aspect ?? 1;
    // fluffy tips are sparse: the effective length is 90 % of the measured head
    this.aspectY = params.aspectY ?? (tool?.head ? (tool.head[1] / tool.head[0]) * 0.9 : 1);
    this.grid = new CoverageGrid({ size: stack.size, cells: 48, isInside: (x, y) => (stack.inRegion ? stack.inRegion(x, y, this.region) : stack.isInside(x, y)) });
    this.completed = false;
    this.sprayTime = 0;
    this.validContacts = 0;
    this._paintedSinceClip = false;
    if (this.mode === 'scrub') stack.fillLayer(params.under, 0);
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
    const reach = r * (this.aspect > 1 ? this.aspect * 0.8 : this.aspectY > 1 ? this.aspectY * 0.8 : 0.6);
    if (!this.stack.touchesObject(local.x, local.y, reach, this.region)) return;
    const p = this.params;
    if (this.mode === 'reveal') {
      for (const id of p.layers) this.stack.erase(id, local, r, this.aspect, 0, this.aspectY);
    } else if (this.mode === 'apply') {
      this.stack.paint(p.layer, p.stamp, local, r);
      this._paintedSinceClip = true;
    } else if (this.mode === 'scrub') {
      this.stack.erase(p.from, local, r, this.aspect, 0, this.aspectY);
      for (const id of p.clear ?? []) this.stack.erase(id, local, r, this.aspect, 0, this.aspectY);
    }
    let added = 0;
    if (this.aspect > 1) {
      // A wide blade covers a band: mark overlapping circles along its width.
      const half = r * (this.aspect - 0.6);
      for (let dx = -half; dx <= half + 0.1; dx += r * 0.8) added += this.grid.mark(local.x + dx, local.y, r * 0.85);
    } else if (this.aspectY > 1) {
      // a long head covers a vertical band: overlapping circles along its length (the band's
      // outer edge matches the drawn ellipse, 2·r·aspectY tall)
      const half = r * (this.aspectY - 0.85);
      for (let dy = -half; dy <= half + 0.1; dy += r * 0.8) added += this.grid.mark(local.x, local.y + dy, r * 0.85);
    } else {
      added = this.grid.mark(local.x, local.y, r * 0.85);
    }
    if (added > 0) this.validContacts += 1;
  }

  _afterInput() {
    if (this._paintedSinceClip) {
      this.stack.clipToObject(this.params.layer, this.params.clip);
      this._paintedSinceClip = false;
    }
    if (!this.completed && this._done()) this.completed = true;
  }

  _done() {
    const pr = this.grid.progress;
    if (pr >= this.threshold) return true;
    if (pr < SOFT_MIN) return false;
    // checked at most every 150 ms (flood fill over the coverage grid)
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this._lastSoft && now - this._lastSoft < 150) return false;
    this._lastSoft = now;
    return this.grid.largestUncoveredBlob() <= Math.max(SOFT_BLOB_MIN, this.grid.total * SOFT_BLOB_SHARE);
  }

  // Brings the visuals to the exact final state of this stage (leftover specks fade out).
  finish(duration = 450) {
    const p = this.params;
    // Region stages clean up only inside their region (the rest of the layer belongs to other stages).
    if (this.region && this.stack.fadeOutRegion) {
      if (this.mode === 'reveal') return this.stack.fadeOutRegion(p.layers, this.region, duration);
      if (this.mode === 'apply') return this.stack.fillLayer(p.layer, duration);
      return this.stack.fadeOutRegion([p.from, ...(p.clear ?? [])], this.region, duration);
    }
    if (this.mode === 'reveal') return this.stack.fadeOutLayers(p.layers, duration);
    if (this.mode === 'apply') return this.stack.fillLayer(p.layer, duration);
    return this.stack.fadeOutLayers([p.from, ...(p.clear ?? [])], duration);
  }

  // Skip support (not exposed to players in Step 2): jump to the correct final material.
  forceComplete() {
    this.completed = true;
    return this.finish(0);
  }

  // Local point where work is still missing (hint target).
  remainingCentre() {
    const pts = this.grid.uncoveredCentres();
    if (!pts.length) return null;
    const sx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const sy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    // snap to the nearest uncovered cell so the hint never points at already-clean area
    let best = pts[0];
    let bd = Infinity;
    for (const p of pts) {
      const d = (p.x - sx) ** 2 + (p.y - sy) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  dispose() {}
}
