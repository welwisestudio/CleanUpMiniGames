import { createRng } from '../core/random.js';

// Splits a round crust into irregular Voronoi chunks (deterministic per seed).
// Returns a label grid at `res` x `res` over a `size` x `size` canvas; -1 = outside the crust.

export function buildChunkMap({ size, res, radius, count, seed, edgeNoise = 0.035 }) {
  const rng = createRng(seed);
  const c = size / 2;
  const cell = size / res;

  // Lumpy crust edge: radius modulated by a few seeded sine waves.
  const waves = Array.from({ length: 4 }, (_, k) => ({ f: 3 + k * 2 + Math.floor(rng() * 3), p: rng() * Math.PI * 2, a: rng() }));
  const aSum = waves.reduce((s, w) => s + w.a, 0) || 1;
  const edgeRadius = (angle) => radius * (1 + (edgeNoise * waves.reduce((s, w) => s + w.a * Math.sin(w.f * angle + w.p), 0)) / aSum);

  // Seeds: rejection sampling with a minimum distance → evenly sized chunks.
  const seeds = [];
  const minDist = radius * Math.sqrt(Math.PI / count) * 0.9;
  let guard = 0;
  while (seeds.length < count && guard++ < 20000) {
    const ang = rng() * Math.PI * 2;
    const rr = Math.sqrt(rng()) * radius * 0.95;
    const x = c + Math.cos(ang) * rr;
    const y = c + Math.sin(ang) * rr;
    const relax = guard > 8000 ? 0.7 : 1;
    if (seeds.every((s) => (s.x - x) ** 2 + (s.y - y) ** 2 >= (minDist * relax) ** 2)) seeds.push({ x, y });
  }

  const labels = new Int16Array(res * res).fill(-1);
  const second = new Int16Array(res * res).fill(-1);
  const counts = new Array(seeds.length).fill(0);
  for (let gy = 0; gy < res; gy++) {
    for (let gx = 0; gx < res; gx++) {
      const x = (gx + 0.5) * cell;
      const y = (gy + 0.5) * cell;
      const dx = x - c;
      const dy = y - c;
      if (Math.hypot(dx, dy) > edgeRadius(Math.atan2(dy, dx))) continue;
      let best = -1;
      let bestD = Infinity;
      let next = -1;
      let nextD = Infinity;
      for (let i = 0; i < seeds.length; i++) {
        const d = (seeds[i].x - x) ** 2 + (seeds[i].y - y) ** 2;
        if (d < bestD) {
          next = best;
          nextD = bestD;
          best = i;
          bestD = d;
        } else if (d < nextD) {
          next = i;
          nextD = d;
        }
      }
      const idx = gy * res + gx;
      labels[idx] = best;
      second[idx] = next;
      counts[best] += 1;
    }
  }

  // Merge slivers (mostly at the rim) into their neighbour so every chunk is a reasonable target.
  const mean = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.filter((n) => n > 0).length);
  const small = new Set(counts.map((n, i) => (n > 0 && n < mean * 0.35 ? i : -1)).filter((i) => i >= 0));
  if (small.size) {
    for (let i = 0; i < labels.length; i++) {
      if (small.has(labels[i]) && second[i] >= 0 && !small.has(second[i])) {
        counts[labels[i]] -= 1;
        labels[i] = second[i];
        counts[labels[i]] += 1;
      }
    }
  }

  // Compact ids so chunks are 0..n-1 with no empty entries.
  const remap = new Map();
  counts.forEach((n, i) => {
    if (n > 0) remap.set(i, remap.size);
  });
  const finalCounts = new Array(remap.size).fill(0);
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] >= 0) {
      labels[i] = remap.get(labels[i]);
      finalCounts[labels[i]] += 1;
    }
  }

  return {
    size,
    res,
    cell,
    labels,
    counts: finalCounts,
    chunkCount: finalCounts.length,
    labelAt(x, y) {
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      if (gx < 0 || gy < 0 || gx >= res || gy >= res) return -1;
      return labels[gy * res + gx];
    },
  };
}
