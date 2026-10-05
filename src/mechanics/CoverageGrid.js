// Coverage sampling for reveal / apply / scrub stages.
// Only cells whose centre lies inside the object count; marking an already covered cell adds
// nothing, so progress can only come from new valid contact.

export class CoverageGrid {
  constructor({ size, cells = 48, isInside }) {
    this.size = size;
    this.cells = cells;
    this.cellSize = size / cells;
    this.inside = new Uint8Array(cells * cells);
    this.covered = new Uint8Array(cells * cells);
    this.total = 0;
    this.count = 0;
    for (let cy = 0; cy < cells; cy++) {
      for (let cx = 0; cx < cells; cx++) {
        const x = (cx + 0.5) * this.cellSize;
        const y = (cy + 0.5) * this.cellSize;
        if (isInside(x, y)) {
          this.inside[cy * cells + cx] = 1;
          this.total += 1;
        }
      }
    }
    if (this.total === 0) throw new Error('CoverageGrid: object mask has no cells');
  }

  // Marks every inside cell whose centre is within radius r of (x, y). Returns newly covered count.
  mark(x, y, r) {
    const cs = this.cellSize;
    const minX = Math.max(0, Math.floor((x - r) / cs));
    const maxX = Math.min(this.cells - 1, Math.floor((x + r) / cs));
    const minY = Math.max(0, Math.floor((y - r) / cs));
    const maxY = Math.min(this.cells - 1, Math.floor((y + r) / cs));
    const r2 = r * r;
    let added = 0;
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const i = cy * this.cells + cx;
        if (!this.inside[i] || this.covered[i]) continue;
        const dx = (cx + 0.5) * cs - x;
        const dy = (cy + 0.5) * cs - y;
        if (dx * dx + dy * dy <= r2) {
          this.covered[i] = 1;
          added += 1;
        }
      }
    }
    this.count += added;
    return added;
  }

  get progress() {
    return this.count / this.total;
  }

  // Size (cells) of the largest 4-connected group of uncovered inside cells. Used by the soft
  // auto-complete: small scattered remnants may be finished automatically, a big unfinished
  // patch may not.
  largestUncoveredBlob() {
    const n = this.cells;
    const seen = new Uint8Array(n * n);
    let best = 0;
    const stack = [];
    for (let i = 0; i < n * n; i++) {
      if (!this.inside[i] || this.covered[i] || seen[i]) continue;
      let size = 0;
      stack.push(i);
      seen[i] = 1;
      while (stack.length) {
        const c = stack.pop();
        size += 1;
        const x = c % n;
        const y = (c - x) / n;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
          const j = ny * n + nx;
          if (this.inside[j] && !this.covered[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
      if (size > best) best = size;
    }
    return best;
  }

  // Centres of uncovered inside cells (used by QA/hints, never to grant progress).
  uncoveredCentres() {
    const out = [];
    for (let i = 0; i < this.inside.length; i++) {
      if (this.inside[i] && !this.covered[i]) {
        out.push({ x: ((i % this.cells) + 0.5) * this.cellSize, y: (Math.floor(i / this.cells) + 0.5) * this.cellSize });
      }
    }
    return out;
  }
}
