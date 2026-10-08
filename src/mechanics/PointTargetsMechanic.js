// Point targets (Step 8, CONTENT-MATRIX §4.1): the tool acts ON a point instead of rubbing an area.
//   hold – keep the tool's working point on the target (screwdriver turns a screw out or in);
//   tap  – separate taps on the target (hammer flattens a dent one step per hit);
//   pull – keep the tool on the target until the part lifts off (keycap puller, grabber).
// `action`: 'remove' (the part is on the object and leaves it) or 'install' (it appears and seats).
//
// Visuals come from content data only: each target names the texture of its part and the layer
// that shows it while idle. On removal the part is erased from that layer (with its own alpha
// shape, so the cut is exact) and an animated sprite takes over at the same place; on install the
// part is stamped into the layer once it is seated. Steps (`steps` textures) show intermediate
// states (a dent flattening).
//
// Anti-cheat: only the working point inside a target counts; taps outside a target, holding over
// empty surface or rubbing add nothing. Progress = finished targets / total.

const OUTLINE = 0x00f010;
const TAP_GAP_MS = 120; // a second tap within this time does not count (no double hits)

export class PointTargetsMechanic {
  constructor({ stack, params, scene }) {
    this.stack = stack;
    this.params = params;
    this.scene = scene;
    // 'hold' | 'tap' | 'pull'; aliases from the Step 8 brief: screw = hold, place = hold + install,
    // repeatedTap = tap
    this.mode = { screw: 'hold', place: 'hold', repeatedTap: 'tap' }[params.mode] ?? params.mode;
    this.action = params.action ?? (params.mode === 'place' ? 'install' : 'remove');
    this.completed = false;
    this.validContacts = 0;
    this.holdMs = params.holdMs ?? 700;
    this.taps = params.taps ?? 3;
    this.lastTapAt = -1e9;
    this.targets = params.targets.map((t, i) => ({ ...t, i, t: 0, hits: 0, done: false, sprite: null }));
    this.total = this.targets.length;
    this.doneCount = 0;
    this.rings = params.outline === false ? [] : this.targets.map((t) => this._ring(t));
    if (this.action === 'install') for (const t of this.targets) this._ghost(t);
  }

  // Step 7 alternative tools: an option may shorten the hold / tap work (content modifier ≤ 10 %).
  setTool(tool, radius, mods = {}) {
    this.tool = tool;
    if (mods.work) {
      this.holdMs = (this.params.holdMs ?? 700) * mods.work;
      this.taps = Math.max(1, Math.round((this.params.taps ?? 3) * mods.work));
    }
  }

  get progress() {
    if (this.completed) return 1;
    // partial credit inside a target so the bar moves while a screw is turning
    let p = this.doneCount;
    for (const t of this.targets) if (!t.done) p += this.mode === 'tap' ? t.hits / this.taps : Math.min(1, t.t / this.holdMs) * 0.9;
    return Math.min(1, p / this.total);
  }

  _hitTarget(local) {
    let best = null;
    let bd = Infinity;
    for (const t of this.targets) {
      if (t.done) continue;
      const d = (local.x - t.x) ** 2 + (local.y - t.y) ** 2;
      if (d <= (t.r * 1.15) ** 2 && d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  // ---- input (world coordinates of the tool's working point) -------------------------------
  tap(world) {
    if (this.completed || this.mode !== 'tap') return;
    const now = this.scene.time.now;
    if (now - this.lastTapAt < TAP_GAP_MS) return;
    this.lastTapAt = now;
    const t = this._hitTarget(this.stack.toLocal(world));
    if (!t) return;
    t.hits += 1;
    this.validContacts += 1;
    // a beating / knocking target can clear a patch of a layer around itself with every hit
    if (t.eraseOnHit) this.stack.erase(t.eraseOnHit.layer, { x: t.x, y: t.y }, t.eraseOnHit.r * (0.6 + 0.4 * (t.hits / this.taps)));
    this._tapFx(t);
    this._showStep(t, t.hits / this.taps);
    if (t.hits >= this.taps) this._finishTarget(t);
  }

  // Called every frame while the pointer is down (hold / pull).
  hold(world, dt) {
    if (this.completed || this.mode === 'tap') return;
    const t = this._hitTarget(this.stack.toLocal(world));
    if (!t) return;
    if (!t.started) this._startHold(t);
    t.t += dt * 1000;
    this.validContacts += 1;
    const k = Math.min(1, t.t / this.holdMs);
    this._animateHold(t, k);
    if (k >= 1) this._finishTarget(t);
  }

  stroke() {
    /* rubbing does nothing on point targets */
  }

  // ---- visuals --------------------------------------------------------------------------
  _ring(t) {
    const g = this.scene.add.graphics();
    const p = this.stack.childPos(t.x, t.y);
    const r = t.r * 1.1;
    g.lineStyle(5, OUTLINE, 1);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      g.beginPath();
      g.arc(p.x, p.y, r, a0, a0 + Math.PI / n);
      g.strokePath();
    }
    this.stack.overlay.add(g);
    this.scene.tweens.add({ targets: g, alpha: { from: 1, to: 0.45 }, duration: 650, yoyo: true, repeat: -1 });
    return g;
  }

  // install: a faint ghost of the part shows where it goes
  _ghost(t) {
    if (!t.texture) return;
    const p = this.stack.childPos(t.x, t.y);
    const g = this.scene.add.image(p.x, p.y, t.texture).setAlpha(0.3);
    g.setScale(t.size / Math.max(g.width, g.height));
    if (t.angle) g.setAngle(t.angle);
    this.stack.overlay.addAt(g, 0);
    t.ghost = g;
  }

  _partSprite(t, texture = t.texture) {
    const p = this.stack.childPos(t.x, t.y);
    const img = this.scene.add.image(p.x, p.y, texture);
    img.setScale(t.size / Math.max(img.width, img.height));
    if (t.angle) img.setAngle(t.angle);
    this.stack.overlay.add(img);
    return img;
  }

  _startHold(t) {
    t.started = true;
    if (this.action === 'remove') {
      // the part leaves its layer and becomes a moving sprite at exactly the same place
      if (t.layer) this.stack.eraseTexture(t.layer, t.cut ?? t.texture, t, t.size, t.angle ?? 0);
      t.sprite = this._partSprite(t);
      t.base = t.sprite.scale;
    } else {
      t.sprite = this._partSprite(t);
      t.base = t.sprite.scale;
      t.sprite.setAlpha(0);
    }
  }

  _animateHold(t, k) {
    const s = t.sprite;
    if (!s) return;
    if (this.mode === 'pull') {
      // lifts toward the viewer and wiggles loose
      s.setScale(t.base * (1 + 0.12 * k)).setAngle((t.angle ?? 0) + Math.sin(k * 30) * 4 * k);
      return;
    }
    // screw: turns (out = counter-clockwise, in = clockwise) and rises / seats
    const out = this.action === 'remove';
    s.setAngle((t.angle ?? 0) + (out ? -1 : 1) * k * 720);
    if (out) s.setScale(t.base * (1 + 0.25 * k));
    else s.setAlpha(Math.min(1, k * 3)).setScale(t.base * (1.3 - 0.3 * k));
  }

  _showStep(t, k) {
    // tap targets: intermediate states (dent flattening) — fade the damage decal step by step
    if (!t.layer) return;
    if (!t.sprite) {
      this.stack.eraseTexture(t.layer, t.cut ?? t.texture, t, t.size, t.angle ?? 0);
      t.sprite = this._partSprite(t);
      t.base = t.sprite.scale;
    }
    const steps = t.steps;
    if (steps?.length && k < 1) t.sprite.setTexture(steps[Math.min(steps.length - 1, Math.floor(k * steps.length))]);
    this.scene.tweens.add({ targets: t.sprite, alpha: Math.max(0, 1 - k * 0.85), scaleX: t.base * (1 + 0.08 * (1 - k)), scaleY: t.base * (1 - 0.1 * k), duration: 110, ease: 'Quad.easeOut' });
  }

  _tapFx(t) {
    const w = this.stack.toWorld({ x: t.x, y: t.y });
    this.scene.emitImpactFx?.(w);
  }

  _finishTarget(t) {
    t.done = true;
    this.doneCount += 1;
    const ring = this.rings[t.i];
    if (ring) {
      this.scene.tweens.killTweensOf(ring);
      this.scene.tweens.add({ targets: ring, alpha: 0, duration: 200 });
    }
    const s = t.sprite;
    if (this.action === 'install') {
      // seated: bake the part into its layer
      if (t.layer) this.stack.stampTextureAt(t.layer, t.texture, t, t.size, 1, t.angle ?? 0);
      s?.destroy();
      t.sprite = null;
      t.ghost?.destroy();
    } else if (s) {
      const to = this.params.tray ? this.stack.childPos(this.params.tray.x, this.params.tray.y) : { x: s.x + (s.x > 0 ? 260 : -260), y: s.y - 240 };
      if (this.mode === 'tap') {
        this.scene.tweens.add({ targets: s, alpha: 0, duration: 160, onComplete: () => s.destroy() });
      } else {
        this.scene.tweens.add({ targets: s, x: to.x, y: to.y, angle: s.angle + (this.mode === 'pull' ? 120 : -200), scale: s.scale * 0.7, alpha: this.params.tray ? 1 : 0, duration: 420, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
      }
      t.sprite = null;
    }
    if (this.doneCount >= this.total) this.completed = true;
  }

  // ---- hints / QA -----------------------------------------------------------------------
  nextTargetLocal() {
    const t = this.targets.find((x) => !x.done);
    return t ? { x: t.x, y: t.y, r: t.r } : null;
  }

  pointsLocal() {
    return this.targets.filter((t) => !t.done).map((t) => ({ x: t.x, y: t.y, r: t.r }));
  }

  // `clearOnFinish`: layers the targets worked on as a whole (a carpet beater knocks the dust out
  // of the entire mat, not only around the beaten points) fade out when the last target is done.
  finish() {
    const ids = this.params.clearOnFinish;
    if (!ids?.length) return Promise.resolve();
    if (this.params.region && this.stack.fadeOutRegion) return this.stack.fadeOutRegion(ids, this.params.region, 450);
    return this.stack.fadeOutLayers(ids, 450);
  }

  forceComplete() {
    for (const t of this.targets) if (!t.done) {
      if (!t.started && this.mode !== 'tap') this._startHold(t);
      this._finishTarget(t);
    }
    return this.finish();
  }

  dispose() {
    this.rings.forEach((r) => {
      this.scene.tweens.killTweensOf(r);
      r.destroy();
    });
    for (const t of this.targets) {
      t.ghost?.destroy();
      // a part still in mid-air is finished visually
      if (t.sprite && this.action === 'install' && t.layer) this.stack.stampTextureAt(t.layer, t.texture, t, t.size, 1, t.angle ?? 0);
      t.sprite?.destroy();
    }
  }
}
