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

// Fits an object into the play area below the HUD.
// `target` = object-local bounds [x0, y0, x1, y1] to frame (whole object or a stage focus such as
// the chair seat), or a number = radius of a round object centred on the canvas (Soccer Ball).
// `reach` = how far below the framed bounds the finger must be able to go, in object-local units
// (jet tools hit ~jetLength above the nozzle; contact tools sit ~120 above the finger).
// Returns the world centre of the object CANVAS, the scale and the tool rest position.
// Screen-scale jets: `jetReach` (object units: nozzle offset) + `jetPx` (device px: the jet) is a
// second, separate finger-room requirement; the tighter of the two limits the scale. The jet is
// capped at 30 % of the play height (short landscape screens).
// `bottomReserve` (device px) keeps a band above the bottom free (Step 7 tool cards).
export function fitObject(layout, target, { reach = 540, jetReach = 0, jetPx = 0, canvasSize = 1024, share = null, bottomReserve = 0 } = {}) {
  const b = typeof target === 'number' ? [canvasSize / 2 - target, canvasSize / 2 - target, canvasSize / 2 + target, canvasSize / 2 + target] : target;
  const objW = b[2] - b[0];
  const objH = b[3] - b[1];
  const top = layout.hudBottom;
  const bottom = layout.H - layout.margin - 24 * layout.u - bottomReserve; // clear of the status badges (and tool cards)
  const playH = Math.max(1, bottom - top);
  const playW = layout.W - 2 * layout.margin;
  const hShare = share ?? (layout.portrait ? 0.58 : 0.61);
  const minScale = (80 * layout.dpr) / Math.max(objW, objH);
  // Step 6 UI pass: objects may use up to 96 % of the play width (was 84 %) and are centred
  // vertically in the space left after the finger room they need below them (was top-aligned).
  const jp = Math.min(jetPx, playH * 0.3);
  const jetLimit = jp > 0 ? (playH * 0.97 - jp) / (objH + jetReach) : Infinity;
  const scale = Math.max(minScale, Math.min((playW * 0.96) / objW, (playH * hShare) / objH, (playH * 0.97) / (objH + reach), jetLimit));
  const spare = playH - objH * scale - Math.max(reach * scale, jp > 0 ? jetReach * scale + jp : 0);
  const boundsTop = top + Math.max(playH * 0.05, spare / 2);
  const cx = layout.W / 2 - ((b[0] + b[2]) / 2 - canvasSize / 2) * scale;
  const cy = boundsTop - (b[1] - canvasSize / 2) * scale;
  const boundsBottom = boundsTop + objH * scale;
  const R = (Math.min(objW, objH) / 2) * scale;
  return { cx, cy, scale, R, boundsTop, boundsBottom, jetCap: playH * 0.3, restX: layout.W / 2, restY: Math.min(bottom - objH * scale * 0.1, boundsBottom + (bottom - boundsBottom) * 0.45) };
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
