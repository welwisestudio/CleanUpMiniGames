import Phaser from 'phaser';
import { buildChunkMap } from '../../mechanics/chunkMap.js';

// Display of one object as a stack of layers on a common canvas (bottom → top).
// Mechanics change layers only through this surface API, using OBJECT-LOCAL canvas coordinates
// (0..size, object centre at size/2). The whole stack lives in one container that the scene
// positions and scales to fit the screen (setLayout); local coordinates never change.

const CHUNK_RES_DIVISOR = 2; // label grid = size / 2 → 2 px cells

export class ObjectStack {
  constructor(scene, levelId, objectDef) {
    this.scene = scene;
    this.levelId = levelId;
    this.def = objectDef;
    this.size = objectDef.canvasSize;
    this.radius = objectDef.radius;
    this.center = { x: 0, y: 0 };
    this.scale = 1;
    this.container = scene.add.container(0, 0);
    this.layers = new Map();
    this.chunkMaps = new Map();
    this.chunks = new Map();
    this.falling = new Set();

    // Soft contact shadow (code-drawn, see STYLE-GUIDE §11: shadows are not baked into cutouts).
    const shadow = scene.add.ellipse(0, this.radius * 1.02, this.radius * 1.6, this.radius * 0.22, 0x0a2a0a, 0.3);
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
        this.container.add(rt);
        this.layers.set(layer.id, { def: layer, display: rt });
      }
    }
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

  isInside(lx, ly) {
    return Math.hypot(lx - this.size / 2, ly - this.size / 2) <= this.radius;
  }

  // True if a stamp of radius r centred at (lx, ly) overlaps the object.
  touchesObject(lx, ly, r) {
    return Math.hypot(lx - this.size / 2, ly - this.size / 2) <= this.radius + r;
  }

  // ---- layer operations ------------------------------------------------------------------
  _rt(id) {
    const entry = this.layers.get(id);
    if (!entry || entry.def.static || entry.def.initial === 'chunks') throw new Error(`Layer ${id} is not editable`);
    return entry.display;
  }

  erase(id, local, r) {
    const scale = (2 * r) / 128 / 0.82; // brush-soft is fully opaque to ~65 % of its radius
    this._rt(id).stamp('brush-soft', null, local.x, local.y, { erase: true, scale });
  }

  paint(id, stampKey, local, r) {
    const scale = (2 * r) / 256 / 0.7;
    this._rt(id).stamp(stampKey, null, local.x, local.y, { scale, angle: Math.random() * 360 });
  }

  clipToObject(id) {
    this._rt(id).stamp('mask-outside', null, this.size / 2, this.size / 2, { erase: true });
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
    // The crust may extend a little beyond the ball; pixels outside the crust art stay transparent.
    const map = buildChunkMap({ size: this.size, res, radius: this.radius * 1.05, count: stage.chunkCount, seed: stage.seed, edgeNoise: 0 });
    this.chunkMaps.set(layer.id, map);

    const tex = this.scene.textures;
    const group = this.scene.add.container(0, 0);
    this.container.add(group);

    const cacheKey = `chunk-${this.levelId}-${layer.id}`;
    if (!tex.exists(`${cacheKey}-0`)) this._bakeChunkTextures(layer, map, cacheKey);
    for (let id = 0; id < map.chunkCount; id++) {
      const info = this._chunkInfo[cacheKey][id];
      const img = this.scene.add.image(info.ox, info.oy, `${cacheKey}-${id}`);
      const outlineImg = this.scene.add.image(info.ox, info.oy, `${cacheKey}-${id}-outline`).setVisible(false);
      group.add([img, outlineImg]);
      this.chunks.set(id, { img, outlineImg, layerId: layer.id });
    }
    this.layers.set(layer.id, { def: layer, display: group });
  }

  _bakeChunkTextures(layer, map, cacheKey) {
    const tex = this.scene.textures;
    const size = this.size;
    const res = map.res;
    const src = tex.get(layer.texture).getSourceImage();
    const srcCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    srcCtx.canvas.width = size;
    srcCtx.canvas.height = size;
    srcCtx.drawImage(src, 0, 0, size, size);
    const srcData = srcCtx.getImageData(0, 0, size, size).data;

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

    ObjectStack.prototype._chunkInfo ??= {};
    const infos = (ObjectStack.prototype._chunkInfo[cacheKey] = []);
    const cell = map.cell;
    for (let id = 0; id < map.chunkCount; id++) {
      const b = boxes[id];
      const pad = 4;
      const px0 = Math.max(0, Math.floor(b.x0 * cell) - pad);
      const py0 = Math.max(0, Math.floor(b.y0 * cell) - pad);
      const px1 = Math.min(size, Math.ceil((b.x1 + 1) * cell) + pad);
      const py1 = Math.min(size, Math.ceil((b.y1 + 1) * cell) + pad);
      const w = px1 - px0;
      const h = py1 - py0;
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
          const outer = srcData[si + 3] > 128 && (sx < 4 || map.labelAt(sx + 5, sy) < 0 || map.labelAt(sx - 5, sy) < 0 || map.labelAt(sx, sy + 5) < 0 || map.labelAt(sx, sy - 5) < 0);
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
        scene.events.emit('chunk-fell', { id, world: this.toWorld({ x: img.x + this.size / 2, y: img.y + this.size / 2 }) });
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
