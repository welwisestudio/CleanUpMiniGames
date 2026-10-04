// Technical textures generated in code (not art): a soft circular brush mask for erasing,
// a soft particle dot (dust / mist) and a confetti strip. All visible art is generated with
// Nano Banana 2 (see project/ASSET-MANIFEST.md).

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function add(scene, key, cnv) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, cnv);
}

function radial(size, stops) {
  const cnv = canvas(size);
  const ctx = cnv.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cnv;
}

export function generateProceduralTextures(scene) {
  add(scene, 'brush-soft', radial(128, [[0, 'rgba(255,255,255,1)'], [0.65, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]));
  add(scene, 'fx-dot', radial(64, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]));
  const strip = canvas(16);
  const ctx = strip.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(4, 0, 8, 16, 3);
  ctx.fill();
  add(scene, 'fx-rect', strip);
}
