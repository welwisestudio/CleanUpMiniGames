import { ASSET_META } from '../content/generated/assetMeta.js';

// Nine-slice from a generated UI surface: corners keep their proportions at any size.
// The slice is scaled so its height matches `h`; the width is filled by the stretchable middle.
export function nineSlice(scene, key, w, h, x = 0, y = 0) {
  const meta = ASSET_META.ui[key];
  if (!meta?.slice) throw new Error(`No nine-slice data for ${key}`);
  const [tw, th] = meta.size;
  const [l, r, t, b] = meta.slice;
  const k = h / th;
  const innerW = Math.max(l + r + 2, w / k);
  const ns = scene.add.nineslice(x, y, key, null, innerW, th, l, r, t, b);
  ns.setScale(w / innerW, k);
  ns.metaSize = [tw, th];
  return ns;
}

// Image scaled to fit a box (aspect preserved).
export function fitImage(scene, key, box, x = 0, y = 0) {
  const img = scene.add.image(x, y, key);
  img.setScale(box / Math.max(img.width, img.height));
  return img;
}
