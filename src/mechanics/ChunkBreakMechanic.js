// Chisel stage: the crust is split into chunks; dragging the chisel tip across a chunk
// accumulates damage (distance of tip movement inside it). At the break distance the chunk
// is outlined and falls away. Holding still or tapping adds no damage.

const D = Math.SQRT1_2;
const RING = [[0, 0, 0]];
for (const f of [0.5, 1]) for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1], [D, D], [-D, D], [D, -D], [-D, -D]]) RING.push([u, v, f]);
// soft-complete: from 85 % of the chunks, the rest breaks off when it is ≤ this share of the crust
export const CHUNK_SOFT_AREA = 0.08;

export class ChunkBreakMechanic {
  constructor({ stack, params, chunkMap }) {
    this.stack = stack;
    this.params = params;
    this.map = chunkMap;
    this.total = chunkMap.chunkCount;
    this.damage = new Float32Array(this.total);
    this.removed = new Uint8Array(this.total);
    this.removedCount = 0;
    this.completed = false;
    this.validContacts = 0;
  }

  get progress() {
    return this.removedCount / this.total;
  }

  // Works in object-local units so the break distance is the same on every screen size.
  stroke(fromWorld, toWorld) {
    if (this.completed) return;
    const from = this.stack.toLocal(fromWorld);
    const to = this.stack.toLocal(toWorld);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    if (dist <= 0) return;
    const step = 8;
    const n = Math.max(1, Math.ceil(dist / step));
    const segLen = dist / n;
    const tip = this.params.tipRadius;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const local = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      // Sample the tip centre and two rings (8 directions) so thin edges and speckled mud
      // (gaps between splashes) are reachable — Step 6: a speckled chunk near the sneaker laces
      // was missed by the old 5-point probe and blocked the stage at 95 %.
      const hit = new Set();
      for (const [ox, oy] of RING.map(([u, v, f]) => [u * tip * f, v * tip * f])) {
        const id = this.map.labelAt(local.x + ox, local.y + oy);
        if (id >= 0 && !this.removed[id]) hit.add(id);
      }
      for (const id of hit) {
        this.damage[id] += segLen;
        this.validContacts += 1;
        if (this.damage[id] >= this.params.breakDistance) this._remove(id, to.x - from.x);
      }
    }
  }

  tap() {
    /* No damage without movement. */
  }

  _remove(id, dirX) {
    if (this.removed[id]) return;
    this.removed[id] = 1;
    this.removedCount += 1;
    this.stack.detachChunk(id, Math.sign(dirX) || 1);
    if (this.removedCount >= this.total) this.completed = true;
    else this._softComplete();
  }

  // Gentle auto-complete (Step 6): from 85 % of the chunks, if what is left is only small crumbs
  // (≤ 8 % of the crust area, about one average chunk), they break off by themselves — no hunting for a last sliver near
  // the laces or an edge. A large remaining piece still has to be chiselled.
  _softComplete() {
    if (this.removedCount / this.total < 0.85) return;
    const counts = this.map.counts;
    const totalArea = counts.reduce((a, b) => a + b, 0);
    let left = 0;
    for (let i = 0; i < this.total; i++) if (!this.removed[i]) left += counts[i];
    if (left > totalArea * CHUNK_SOFT_AREA) return;
    for (let i = 0; i < this.total; i++) if (!this.removed[i]) this._remove(i, 1);
  }

  finish() {
    return this.stack.waitForFallingChunks();
  }

  forceComplete() {
    for (let i = 0; i < this.total; i++) this._remove(i, 1);
    return this.finish();
  }

  dispose() {}
}
