// One continuous bright-green target ring (spots, putty dents, paint sources, point targets, repair
// spots) — shared so every ring looks the same; never dashed / dotted (systems pass 2026-10-12).
export const TARGET_GREEN = 0x00f010;

export function strokeRing(g, x, y, r, width = 5) {
  g.lineStyle(width + 3, 0x0a5a12, 0.35);
  g.strokeCircle(x, y, r);
  g.lineStyle(width, TARGET_GREEN, 1);
  g.strokeCircle(x, y, r);
}
