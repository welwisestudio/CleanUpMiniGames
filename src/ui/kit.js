import { ASSET_META } from '../content/generated/assetMeta.js';
import { LEVEL_META } from '../content/generated/levelMeta.js';

// Nine-slice from a generated UI surface: corners keep their proportions at any size.
// The slice is scaled so its height matches `h`; the width is filled by the stretchable middle.
export function nineSlice(scene, key, w, h, x = 0, y = 0) {
  const meta = ASSET_META.ui[key] ?? LEVEL_META.ui?.[key];
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

// "No" feedback shake (2026-10-11): a short horizontal shake around the target's BASE x. A new shake
// first stops the running one and puts the target back on its base, so rapid repeated taps never
// accumulate an offset; every shake ends exactly on the base. Used by chests, the level / VIP offer
// and the tool cards.
export function shakeX(scene, target, amp = 6, { duration = 45, repeat = 3 } = {}) {
  if (target.shakeTween) {
    target.shakeTween.stop();
    target.x = target.shakeBaseX;
  }
  target.shakeBaseX = target.x;
  const done = () => {
    target.x = target.shakeBaseX;
    target.shakeTween = null;
  };
  target.shakeTween = scene.tweens.add({ targets: target, x: target.shakeBaseX + amp, duration, yoyo: true, repeat, onComplete: done, onStop: done });
}

// stop a running shake (e.g. before a relayout moves the target)
export function stopShake(target) {
  if (!target.shakeTween) return;
  target.shakeTween.stop();
  target.x = target.shakeBaseX;
  target.shakeTween = null;
}
