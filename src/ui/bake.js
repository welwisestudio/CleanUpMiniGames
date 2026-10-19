// Static vector art baked into a texture once (performance pass 2026-10-19).
//
// Phaser re-tessellates every visible Graphics object on EVERY frame (all its circles / triangles /
// strokes), so decorative shapes that never change — VIP bloom / beams / halo, glossy "+" buttons,
// card plates — cost the same as if they were redrawn 60 times a second. Profiling the menu showed
// these Graphics took ~80 % of its frame. bake() draws the shape ONCE into a dynamic texture (cached
// by key in the texture manager, so every card / scene reuses it) and the scene shows a plain Image:
// one quad per frame, same pixels, and tweens on angle / alpha / scale still work.
//
// draw(g, cx, cy) draws centred on (cx, cy) inside a w × h box (device px).
export function bake(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return key;
  const W = Math.max(2, Math.ceil(w));
  const H = Math.max(2, Math.ceil(h));
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g, W / 2, H / 2);
  const tex = scene.textures.addDynamicTexture(key, W, H);
  tex.draw(g, 0, 0);
  g.destroy();
  return key;
}

// an Image showing a baked texture (centred)
export function bakedImage(scene, key, w, h, draw) {
  return scene.add.image(0, 0, bake(scene, key, w, h, draw));
}

// Bakes shapes drawn in a parent's local units: draw(g) uses the same coordinates as a live
// Graphics would, inside the box (x0, y0, w, h); the texture is S× finer than those units (pass
// the on-screen scale of the parent so it stays crisp). Returns an Image placed over the box.
// `key` must describe the shape only (not where it sits): equal shapes share one texture.
export function bakedShape(scene, key, x0, y0, w, h, S, draw) {
  const k = `${key}@${S}`;
  if (!scene.textures.exists(k)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.setScale(S);
    const tex = scene.textures.addDynamicTexture(k, Math.max(2, Math.ceil(w * S)), Math.max(2, Math.ceil(h * S)));
    tex.draw(g, -x0 * S, -y0 * S);
    g.destroy();
  }
  return scene.add.image(x0 + w / 2, y0 + h / 2, k).setScale(1 / S);
}
