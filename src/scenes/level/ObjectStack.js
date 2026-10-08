import Phaser from 'phaser';
import { buildChunkMap } from '../../mechanics/chunkMap.js';

// Display of one object as a stack of layers on a common canvas (bottom → top).
// Mechanics change layers only through this surface API, using OBJECT-LOCAL canvas coordinates
// (0..size). The whole stack lives in one container that the scene positions and scales to fit
// the screen (setLayout); local coordinates never change.
//
// Object shape: a circle (`radius`, Soccer Ball) or an alpha mask texture (`mask`, levels 2–5).
// Regions (stage-restricted areas): { rect: [x0,y0,x1,y1] } | { mask: key } | { not: regionId }
// | { circles: [[x, y, r], …] }. Every region is intersected with the object shape.

const CHUNK_RES_DIVISOR = 2; // label grid = size / 2 → 2 px cells

function readAlphaMask(scene, key) {
  const src = scene.textures.get(key).getSourceImage();
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const a = new Uint8Array(c.width * c.height);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
  return { w: c.width, h: c.height, a };
}

function maskBounds(m, size) {
  let x0 = m.w;
  let y0 = m.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (m.a[y * m.w + x] > 127) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  const k = size / m.w;
  return [x0 * k, y0 * k, (x1 + 1) * k, (y1 + 1) * k];
}

export class ObjectStack {
  constructor(scene, levelId, objectDef, { bounds } = {}) {
    this.scene = scene;
    this.levelId = levelId;
    this.def = objectDef;
    this.size = objectDef.canvasSize;
    this.radius = objectDef.radius ?? null;
    this.center = { x: 0, y: 0 };
    this.scale = 1;
    this.container = scene.add.container(0, 0);
    this.layers = new Map();
    this.chunkMaps = new Map();
    this.chunks = new Map();
    this.falling = new Set();
    this.mask = objectDef.mask ? readAlphaMask(scene, objectDef.mask) : null;
    this.regionMasks = new Map();
    this.bounds = bounds ?? (this.mask ? maskBounds(this.mask, this.size) : [this.size / 2 - this.radius, this.size / 2 - this.radius, this.size / 2 + this.radius, this.size / 2 + this.radius]);

    // Soft contact shadow (code-drawn; shadows are not baked into cutouts).
    const [bx0, , bx1, by1] = this.bounds;
    const shadow = this.radius
      ? scene.add.ellipse(0, this.radius * 1.02, this.radius * 1.6, this.radius * 0.22, 0x0a2a0a, 0.3)
      : scene.add.ellipse((bx0 + bx1) / 2 - this.size / 2, by1 - this.size / 2 - 6, (bx1 - bx0) * (objectDef.shadow === 'flat' ? 1.02 : 0.9), (bx1 - bx0) * 0.12, 0x101010, 0.26);
    this.container.add(shadow);

    for (const layer of objectDef.layers) {
      if (layer.static) {
        const img = scene.add.image(0, 0, layer.texture);
        this.container.add(img);
        this.layers.set(layer.id, { def: layer, display: img });
      } else if (layer.initial === 'chunks') {
        this._buildChunks(layer);
      } else {
        const rt = scene.add.renderTexture(0, 0, this.size, this.size);
        if (layer.initial === 'full') rt.draw(layer.texture, 0, 0);
        if (layer.initial === 'decals') {
          for (const d of layer.decals) {
            const f = scene.textures.getFrame(d.texture);
            rt.stamp(d.texture, null, d.x, d.y, { scale: d.size / Math.max(f.width, f.height) });
          }
        }
        this.container.add(rt);
        this.layers.set(layer.id, { def: layer, display: rt });
      }
    }
    this.overlay = scene.add.container(0, 0); // stage-owned sprites (trash items, spot rings) on top
    this.container.add(this.overlay);
  }

  setLayout(cx, cy, scale) {
    this.center = { x: cx, y: cy };
    this.scale = scale;
    this.container.setPosition(cx, cy).setScale(scale);
  }

  // ---- geometry -------------------------------------------------------------------------
  toLocal(world) {
    return { x: (world.x - this.center.x) / this.scale + this.size / 2, y: (world.y - this.center.y) / this.scale + this.size / 2 };
  }

  toWorld(local) {
    return { x: (local.x - this.size / 2) * this.scale + this.center.x, y: (local.y - this.size / 2) * this.scale + this.center.y };
  }

  // Container-child coordinates (centre-origin) for an object-local point.
  childPos(lx, ly) {
    return { x: lx - this.size / 2, y: ly - this.size / 2 };
  }

  _maskAt(m, lx, ly) {
    const x = Math.floor((lx / this.size) * m.w);
    const y = Math.floor((ly / this.size) * m.h);
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 0;
    return m.a[y * m.w + x];
  }

  isInside(lx, ly) {
    if (this.mask) return this._maskAt(this.mask, lx, ly) > 127;
    return Math.hypot(lx - this.size / 2, ly - this.size / 2) <= this.radius;
  }

  _regionTest(id, lx, ly) {
    const r = this.def.regions?.[id];
    if (!r) throw new Error(`Unknown region ${id}`);
    if (r.rect) return lx >= r.rect[0] && lx <= r.rect[2] && ly >= r.rect[1] && ly <= r.rect[3];
    if (r.mask) {
      if (!this.regionMasks.has(r.mask)) this.regionMasks.set(r.mask, readAlphaMask(this.scene, r.mask));
      return this._maskAt(this.regionMasks.get(r.mask), lx, ly) > 127;
    }
    if (r.not) return !this._regionTest(r.not, lx, ly);
    if (r.circles) return r.circles.some(([x, y, rr]) => (lx - x) ** 2 + (ly - y) ** 2 <= rr * rr);
    return true;
  }

  // Inside the object and (optionally) inside a stage region. A `free` region (chair repair
  // spots) is not limited to the object silhouette: its decals overhang the object's edges.
  inRegion(lx, ly, regionId) {
    if (regionId && this.def.regions?.[regionId]?.free) return this._regionTest(regionId, lx, ly);
    if (!this.isInside(lx, ly)) return false;
    return regionId ? this._regionTest(regionId, lx, ly) : true;
  }

  // True if a stamp of radius r centred at (lx, ly) overlaps the object (and region).
  touchesObject(lx, ly, r, regionId) {
    if (this.radius && !regionId) return Math.hypot(lx - this.size / 2, ly - this.size / 2) <= this.radius + r;
    if (this.inRegion(lx, ly, regionId)) return true;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      if (this.inRegion(lx + Math.cos(a) * r, ly + Math.sin(a) * r, regionId)) return true;
    }
    return false;
  }

  regionCircles(regionId) {
    return this.def.regions?.[regionId]?.circles ?? [];
  }

  // Local bounds of a region (or of the object) — used for camera framing, hints and QA.
  regionBounds(regionId) {
    if (!regionId) return this.bounds;
    const r = this.def.regions?.[regionId];
    if (r?.rect) return r.rect;
    if (r?.circles) {
      const xs = r.circles.flatMap(([x, , rr]) => [x - rr, x + rr]);
      const ys = r.circles.flatMap(([, y, rr]) => [y - rr, y + rr]);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
    if (r?.mask) {
      if (!this.regionMasks.has(r.mask)) this.regionMasks.set(r.mask, readAlphaMask(this.scene, r.mask));
      return maskBounds(this.regionMasks.get(r.mask), this.size);
    }
    return this.bounds;
  }

  // ---- layer operations ------------------------------------------------------------------
  _rt(id) {
    const entry = this.layers.get(id);
    if (!entry || entry.def.static || entry.def.initial === 'chunks') throw new Error(`Layer ${id} is not editable`);
    return entry.display;
  }

  erase(id, local, r, aspect = 1, angle = 0, aspectY = 1) {
    const scale = (2 * r) / 128 / 0.82; // brush-soft is fully opaque to ~65 % of its radius
    this._rt(id).stamp('brush-soft', null, local.x, local.y, { erase: true, scaleX: scale * aspect, scaleY: scale * aspectY, angle });
  }

  paint(id, stampKey, local, r) {
    const scale = (2 * r) / 256 / 0.7;
    this._rt(id).stamp(stampKey, null, local.x, local.y, { scale, angle: Math.random() * 360 });
  }

  // Paints a texture centred at a point with a given size and alpha (putty building up).
  stampTexture(id, key, local, size, alpha) {
    const f = this.scene.textures.getFrame(key);
    this._rt(id).stamp(key, null, local.x, local.y, { scale: size / Math.max(f.width, f.height), alpha });
  }

  // Step 8 parts: cut a part's exact shape (its texture alpha) out of a layer, or bake a part into
  // a layer, centred at an object-local point with a given longest side and rotation.
  eraseTexture(id, key, local, size, angle = 0) {
    const f = this.scene.textures.getFrame(key);
    this._rt(id).stamp(key, null, local.x, local.y, { erase: true, scale: size / Math.max(f.width, f.height), angle });
  }

  stampTextureAt(id, key, local, size, alpha = 1, angle = 0) {
    const f = this.scene.textures.getFrame(key);
    this._rt(id).stamp(key, null, local.x, local.y, { scale: size / Math.max(f.width, f.height), alpha, angle });
  }

  // Step 8 large objects (CONTENT-MATRIX §4.3 E3): while a stage works on one zone, the rest of the
  // object is dimmed slightly so the active zone reads at a glance (no zoom; whole object visible).
  showZoneDim(regionId) {
    this.hideZoneDim();
    const key = `zdim-${this.levelId}-${regionId}`;
    if (!this.scene.textures.exists(key)) {
      const R = 256;
      const k = this.size / R;
      const c = document.createElement('canvas');
      c.width = R;
      c.height = R;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(R, R);
      for (let y = 0; y < R; y++) {
        for (let x = 0; x < R; x++) {
          const lx = (x + 0.5) * k;
          const ly = (y + 0.5) * k;
          if (!this.isInside(lx, ly) || this._regionTest(regionId, lx, ly)) continue;
          img.data[(y * R + x) * 4 + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      const big = document.createElement('canvas');
      big.width = this.size;
      big.height = this.size;
      const bctx = big.getContext('2d');
      bctx.filter = 'blur(3px)';
      bctx.drawImage(c, 0, 0, this.size, this.size);
      this.scene.textures.addCanvas(key, big);
    }
    const o = this.scene.add.image(0, 0, key).setTint(0x101828).setAlpha(0);
    this.container.addAt(o, this.container.getIndex(this.overlay));
    this.scene.tweens.add({ targets: o, alpha: 0.38, duration: 300 });
    this.zoneDim = o;
  }

  hideZoneDim() {
    const o = this.zoneDim;
    if (!o) return;
    this.zoneDim = null;
    this.scene.tweens.add({ targets: o, alpha: 0, duration: 250, onComplete: () => o.destroy() });
  }

  clipToObject(id, clipKey) {
    this._rt(id).stamp(clipKey ?? this.def.outsideMask ?? 'mask-outside', null, this.size / 2, this.size / 2, { erase: true });
  }

  fadeOutLayers(ids, duration) {
    return Promise.all(
      ids.map((id) => {
        const rt = this._rt(id);
        if (duration <= 0) {
          rt.clear();
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          this.scene.tweens.add({
            targets: rt,
            alpha: 0,
            duration,
            onComplete: () => {
              rt.clear();
              rt.setAlpha(1);
              resolve();
            },
          });
        });
      }),
    );
  }

  // Region mask as a texture on the object canvas (white where the region is), slightly dilated
  // so edge pixels of thin parts (chair rails, sole rim) are included. Built once per region.
  regionMaskKey(regionId) {
    const key = `rmask-${this.levelId}-${regionId}`;
    if (this.scene.textures.exists(key)) return key;
    const R = 512; // half resolution of the 1024 canvas
    const k = this.size / R;
    const inside = new Uint8Array(R * R);
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) if (this.inRegion((x + 0.5) * k, (y + 0.5) * k, regionId)) inside[y * R + x] = 1;
    const c = document.createElement('canvas');
    c.width = this.size;
    c.height = this.size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(R, R);
    const dil = 3; // half-res px
    for (let y = 0; y < R; y++) {
      for (let x = 0; x < R; x++) {
        let on = inside[y * R + x];
        for (let d = 1; !on && d <= dil; d++) {
          on = (x - d >= 0 && inside[y * R + x - d]) || (x + d < R && inside[y * R + x + d]) || (y - d >= 0 && inside[(y - d) * R + x]) || (y + d < R && inside[(y + d) * R + x]);
        }
        if (on) {
          const i = (y * R + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
          img.data[i + 3] = 255;
        }
      }
    }
    const tmp = document.createElement('canvas');
    tmp.width = R;
    tmp.height = R;
    tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, this.size, this.size);
    this.scene.textures.addCanvas(key, c);
    this._regionInside ??= {};
    this._regionInside[regionId] = { R, inside };
    return key;
  }

  // Region-limited cleanup at the end of a region stage: the remaining dirt / foam inside the
  // region (and only there) fades out in a few soft erase passes using the region mask, so even
  // thin edges are cleaned and other parts of the same layer are untouched.
  fadeOutRegion(ids, regionId, duration) {
    const key = this.regionMaskKey(regionId);
    const steps = duration > 0 ? 6 : 1;
    const pass = (alpha) => ids.forEach((id) => this._rt(id).stamp(key, null, this.size / 2, this.size / 2, { erase: true, alpha }));
    if (steps === 1) {
      pass(1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let n = 0;
      const tick = () => {
        n += 1;
        pass(n === steps ? 1 : 0.35);
        if (n >= steps) resolve();
        else this.scene.time.delayedCall(duration / steps, tick);
      };
      tick();
    });
  }

  // Discrete repair spots (stage `outline: 'circles'`): one clean dashed green circle per spot,
  // the same visual language as the putty-dent rings, instead of tracing the patch shape. A ring
  // fades out once its spot is done (see updateRegionOutline).
  showCircleTargets(regionId) {
    this.hideRegionOutline();
    this.outlineRings = this.regionCircles(regionId).map(([x, y, rr]) => {
      const g = this.scene.add.graphics();
      const p = this.childPos(x, y);
      const r = rr * 1.1; // just outside the patch
      g.lineStyle(5, 0x00f010, 1);
      const n = 18;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        g.beginPath();
        g.arc(p.x, p.y, r, a0, a0 + Math.PI / n);
        g.strokePath();
      }
      this.overlay.add(g);
      return { g, x, y, r: rr, done: false };
    });
  }

  // Fades the ring of each spot whose area is (almost) fully worked.
  updateRegionOutline(grid) {
    if (!this.outlineRings || !grid?.coverageIn) return;
    for (const ring of this.outlineRings) {
      if (ring.done || grid.coverageIn(ring.x, ring.y, ring.r) < 0.9) continue;
      ring.done = true;
      this.scene.tweens.add({ targets: ring.g, alpha: 0, duration: 250 });
    }
  }

  // Dashed bright-green outline of a region (reference style, STYLE-GUIDE §3), shown during
  // localized stages so the active area is obvious. Returns a pulsing image in the overlay.
  showRegionOutline(regionId) {
    this.hideRegionOutline();
    const key = `routline-${this.levelId}-${regionId}`;
    if (!this.scene.textures.exists(key)) {
      this.regionMaskKey(regionId);
      const { R, inside } = this._regionInside[regionId];
      const c = document.createElement('canvas');
      c.width = R;
      c.height = R;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(R, R);
      const t = 4; // outline thickness (half-res px), drawn just outside the region
      for (let y = 0; y < R; y++) {
        for (let x = 0; x < R; x++) {
          if (inside[y * R + x]) continue;
          let near = false;
          for (let dy = -t; dy <= t && !near; dy++) {
            for (let dx = -t; dx <= t && !near; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < R && ny < R && inside[ny * R + nx]) near = true;
            }
          }
          if (!near) continue;
          if (((x + y) >> 3) % 2 === 1 && ((x - y + 4096) >> 3) % 2 === 1) continue; // dashes
          const i = (y * R + x) * 4;
          img.data[i] = 0;
          img.data[i + 1] = 240;
          img.data[i + 2] = 16;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      this.scene.textures.addCanvas(key, c);
    }
    const o = this.scene.add.image(0, 0, key).setScale(this.size / 512).setAlpha(0);
    this.overlay.add(o);
    this.outline = o;
    this.scene.tweens.add({ targets: o, alpha: { from: 0.95, to: 0.45 }, duration: 700, yoyo: true, repeat: -1 });
    return o;
  }

  hideRegionOutline() {
    this.outlineRings?.forEach((ring) => {
      this.scene.tweens.killTweensOf(ring.g);
      ring.g.destroy();
    });
    this.outlineRings = null;
    if (!this.outline) return;
    this.scene.tweens.killTweensOf(this.outline);
    this.outline.destroy();
    this.outline = null;
  }

  fillLayer(id, duration) {
    const entry = this.layers.get(id);
    const rt = this._rt(id);
    const full = () => {
      rt.clear();
      rt.draw(entry.def.texture, 0, 0);
    };
    if (duration <= 0) {
      full();
      return Promise.resolve();
    }
    // Fade a full overlay in directly above the layer, then bake it.
    const overlay = this.scene.add.image(0, 0, entry.def.texture).setAlpha(0);
    this.container.addAt(overlay, this.container.getIndex(rt) + 1);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: overlay,
        alpha: 1,
        duration,
        onComplete: () => {
          full();
          overlay.destroy();
          resolve();
        },
      });
    });
  }

  // ---- chunks -------------------------------------------------------------------------
  getChunkMap(layerId) {
    const map = this.chunkMaps.get(layerId);
    if (!map) throw new Error(`No chunk map for layer ${layerId}`);
    return map;
  }

  _buildChunks(layer) {
    const stage = this._findChunkStageParams(layer.id);
    const res = this.size / CHUNK_RES_DIVISOR;
    const size = this.size;
    const src = this.scene.textures.get(layer.texture).getSourceImage();
    const srcCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    srcCtx.canvas.width = size;
    srcCtx.canvas.height = size;
    srcCtx.drawImage(src, 0, 0, size, size);
    const srcData = srcCtx.getImageData(0, 0, size, size).data;

    // Crust area: the circle for the round ball; the crust art's own alpha for other objects.
    const map = this.radius
      ? buildChunkMap({ size, res, radius: this.radius * 1.05, count: stage.chunkCount, seed: stage.seed, edgeNoise: 0 })
      : buildChunkMap({
          size,
          res,
          count: stage.chunkCount,
          seed: stage.seed,
          insideFn: (x, y) => {
            const ix = Math.min(size - 1, Math.max(0, Math.floor(x)));
            const iy = Math.min(size - 1, Math.max(0, Math.floor(y)));
            return srcData[(iy * size + ix) * 4 + 3] > 128;
          },
          bounds: [0, 0, size, size],
        });
    this.chunkMaps.set(layer.id, map);

    const tex = this.scene.textures;
    const group = this.scene.add.container(0, 0);
    this.container.add(group);
    const cacheKey = `chunk-${this.levelId}-${layer.id}`;
    if (!tex.exists(`${cacheKey}-0`)) this._bakeChunkTextures(map, cacheKey, srcData);
    for (let id = 0; id < map.chunkCount; id++) {
      const info = ObjectStack.chunkInfo[cacheKey][id];
      const img = this.scene.add.image(info.ox, info.oy, `${cacheKey}-${id}`);
      const outlineImg = this.scene.add.image(info.ox, info.oy, `${cacheKey}-${id}-outline`).setVisible(false);
      group.add([img, outlineImg]);
      this.chunks.set(id, { img, outlineImg, layerId: layer.id });
    }
    this.layers.set(layer.id, { def: layer, display: group });
  }

  _bakeChunkTextures(map, cacheKey, srcData) {
    const tex = this.scene.textures;
    const size = this.size;
    const res = map.res;
    const boxes = Array.from({ length: map.chunkCount }, () => ({ x0: res, y0: res, x1: -1, y1: -1 }));
    for (let gy = 0; gy < res; gy++) {
      for (let gx = 0; gx < res; gx++) {
        const id = map.labels[gy * res + gx];
        if (id < 0) continue;
        const b = boxes[id];
        if (gx < b.x0) b.x0 = gx;
        if (gy < b.y0) b.y0 = gy;
        if (gx > b.x1) b.x1 = gx;
        if (gy > b.y1) b.y1 = gy;
      }
    }
    const infos = (ObjectStack.chunkInfo[cacheKey] = []);
    const cell = map.cell;
    for (let id = 0; id < map.chunkCount; id++) {
      const b = boxes[id];
      const pad = 4;
      const px0 = Math.max(0, Math.floor(b.x0 * cell) - pad);
      const py0 = Math.max(0, Math.floor(b.y0 * cell) - pad);
      const px1 = Math.min(size, Math.ceil((b.x1 + 1) * cell) + pad);
      const py1 = Math.min(size, Math.ceil((b.y1 + 1) * cell) + pad);
      const w = Math.max(1, px1 - px0);
      const h = Math.max(1, py1 - py0);
      const body = document.createElement('canvas');
      body.width = w;
      body.height = h;
      const outline = document.createElement('canvas');
      outline.width = w;
      outline.height = h;
      const bctx = body.getContext('2d');
      const octx = outline.getContext('2d');
      const bImg = bctx.createImageData(w, h);
      const oImg = octx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const sx = px0 + x;
          const sy = py0 + y;
          if (map.labelAt(sx, sy) !== id) continue;
          const si = (sy * size + sx) * 4;
          const alpha = srcData[si + 3];
          if (alpha === 0) continue;
          // Crack: darker seam along chunk borders; outline: the same border in bright green.
          let edge = 0;
          for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
            if (map.labelAt(sx + dx, sy + dy) !== id) edge += 1;
          }
          const di = (y * w + x) * 4;
          const shade = edge ? 0.5 : 1;
          bImg.data[di] = srcData[si] * shade;
          bImg.data[di + 1] = srcData[si + 1] * shade;
          bImg.data[di + 2] = srcData[si + 2] * shade;
          bImg.data[di + 3] = alpha;
          const outer = alpha > 128 && (map.labelAt(sx + 5, sy) < 0 || map.labelAt(sx - 5, sy) < 0 || map.labelAt(sx, sy + 5) < 0 || map.labelAt(sx, sy - 5) < 0);
          if (edge || outer) {
            oImg.data[di] = 0;
            oImg.data[di + 1] = 240;
            oImg.data[di + 2] = 16;
            oImg.data[di + 3] = 255;
          }
        }
      }
      bctx.putImageData(bImg, 0, 0);
      octx.putImageData(oImg, 0, 0);
      tex.addCanvas(`${cacheKey}-${id}`, body);
      tex.addCanvas(`${cacheKey}-${id}-outline`, outline);
      infos.push({ ox: px0 + w / 2 - size / 2, oy: py0 + h / 2 - size / 2 });
    }
  }

  _findChunkStageParams(layerId) {
    const level = this.scene.level;
    const stage = level.stages.find((s) => s.mechanic === 'chunkBreak' && s.params.layer === layerId);
    if (!stage) throw new Error(`No chunkBreak stage for layer ${layerId}`);
    return stage.params;
  }

  // Centroid (local) of the chunks that are still attached — used by hints.
  remainingChunkCentroid() {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const c of this.chunks.values()) {
      if (c.detaching) continue;
      sx += c.img.x + this.size / 2;
      sy += c.img.y + this.size / 2;
      n += 1;
    }
    return n ? { x: sx / n, y: sy / n } : null;
  }

  // Outline flash, then the chunk falls with gravity + spin and fades.
  detachChunk(id, dir) {
    const chunk = this.chunks.get(id);
    if (!chunk || chunk.detaching) return;
    chunk.detaching = true;
    const { img, outlineImg } = chunk;
    outlineImg.setVisible(true);
    const parent = img.parentContainer;
    parent.bringToTop(img);
    parent.bringToTop(outlineImg);
    const scene = this.scene;
    const done = new Promise((resolve) => {
      scene.time.delayedCall(150, () => {
        outlineImg.setVisible(false);
        const fallX = dir * Phaser.Math.Between(80, 280);
        scene.tweens.add({ targets: img, x: img.x + fallX, duration: 850, ease: 'Sine.easeOut' });
        scene.tweens.add({ targets: img, y: img.y + this.size * 1.3, duration: 850, ease: 'Quad.easeIn' });
        scene.tweens.add({ targets: img, angle: dir * Phaser.Math.Between(60, 160), duration: 850 });
        scene.tweens.add({
          targets: img,
          alpha: 0,
          delay: 450,
          duration: 400,
          onComplete: () => {
            img.setVisible(false);
            resolve();
          },
        });
      });
    });
    this.falling.add(done);
    done.then(() => this.falling.delete(done));
  }

  waitForFallingChunks() {
    return Promise.all([...this.falling]);
  }

  destroy() {
    this.container.destroy(true);
  }
}

ObjectStack.chunkInfo = {};
