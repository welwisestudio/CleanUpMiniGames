// Responsive layout (CP1 feedback: larger UI, no fixed 9:16 canvas).
//
// The canvas fills the whole window at the device pixel ratio (DPR ≤ 2) for sharp rendering.
// World coordinates = device pixels, camera zoom 1. Every scene lays out from the live size:
//   - HUD pieces are anchored to the screen edges and scaled by the UI unit `u`;
//   - the object is fitted into the free play area (never stretched);
//   - backgrounds cover the screen with the portrait or landscape art (never distorted).
//
// `u` = device px per UI unit. 1 UI unit = 1 CSS px on a 390-px-wide phone; it grows on
// larger screens and is clamped so controls stay comfortable on touch devices.

export const UI = {
  margin: 14,
  tile: 80, // current tool tile
  tileSmall: 46,
  tileGap: 92, // centre distance current ↔ prev/next
  progressW: 108,
  progressH: 22,
  pillW: 128,
  pillH: 44,
  pause: 58,
  minTouch: 48,
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function computeLayout(W, H, dpr = 1) {
  const cssW = W / dpr;
  const cssH = H / dpr;
  const u = clamp(Math.min(cssW / 390, cssH / 700), 0.85, 1.6) * dpr;
  const portrait = H >= W;
  const m = UI.margin * u;
  // Wide: currency pills (stacked) | tool strip centred | pause — one row, as in the reference.
  // Compact (narrow phones): pills side by side + pause on row 1, tool strip on row 2.
  const stripHalf = (UI.tileGap + UI.tileSmall / 2) * u;
  const compact = W / 2 - stripHalf < m + (UI.pillW + 16) * u;
  const stripY = compact ? m + (UI.pillH + 14 + UI.tile / 2) * u : m + (UI.tile / 2) * u;
  const progressY = stripY + (UI.tile / 2 + 10 + UI.progressH / 2) * u;
  const hudBottom = progressY + (UI.progressH / 2 + 12) * u;
  return { W, H, dpr, cssW, cssH, u, portrait, compact, margin: m, stripY, progressY, hudBottom };
}

// Fits a round object of design radius `objR` (object-local units) into the play area,
// leaving room below it for the resting tool and for jet tools (the jet hits ~1.1 R above
// the nozzle, so the finger must be able to reach ~1.25 R below the object).
export function fitObject(layout, objR) {
  const top = layout.hudBottom;
  const bottom = layout.H - layout.margin - 24 * layout.u; // keep clear of the status badges
  const playH = Math.max(1, bottom - top);
  const playW = layout.W - 2 * layout.margin;
  const R = Math.max(40 * layout.dpr, Math.min(playW * 0.42, playH * (layout.portrait ? 0.29 : 0.305)));
  const cx = layout.W / 2;
  const cy = top + playH * 0.05 + R;
  return { cx, cy, R, scale: R / objR, restY: Math.min(bottom - R * 0.2, cy + R + (bottom - (cy + R)) * 0.45) };
}

// Background "cover" fit: scale uniformly so the image fills the screen; centred.
export function coverImage(image, W, H) {
  const s = Math.max(W / image.width, H / image.height);
  image.setScale(s).setPosition(W / 2, H / 2);
}

export function worldToScreen(layout, x, y) {
  return { x: x / layout.dpr, y: y / layout.dpr };
}

export function screenToWorld(layout, x, y) {
  return { x, y };
}

// Keeps camera 1:1 with the game size and calls onLayout(layout) now and on every resize.
export function attachResponsiveLayout(scene, onLayout) {
  const apply = () => {
    const W = scene.scale.width;
    const H = scene.scale.height;
    if (!(W > 0 && H > 0)) return; // zero viewport (startup / minimised): wait for a valid size
    const dpr = scene.registry.get('services')?.display?.dpr ?? 1;
    const layout = computeLayout(W, H, dpr);
    const cam = scene.cameras.main;
    cam.setSize(W, H);
    cam.setZoom(1);
    cam.setScroll(0, 0);
    scene.layout = layout;
    onLayout?.(layout);
    refreshTextResolution(scene);
  };
  apply();
  scene.scale.on('resize', apply);
  scene.events.once('shutdown', () => scene.scale.off('resize', apply));
  return apply;
}

// Text inside scaled containers is re-rasterised at its final on-screen scale so it stays
// sharp (dynamic text is never baked into images).
export function refreshTextResolution(scene) {
  const visit = (list) => {
    for (const obj of list) {
      if (obj.type === 'Text') {
        const m = obj.getWorldTransformMatrix();
        const s = Math.hypot(m.a, m.b);
        const res = clamp(Math.round(s * 4) / 4, 1, 4);
        if (obj.style.resolution !== res) obj.setResolution(res);
      } else if (obj.list) {
        visit(obj.list);
      }
    }
  };
  visit(scene.children.list);
}
