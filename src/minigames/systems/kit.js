// Shared minigame systems (expansion 2026-10-16). Every new minigame is a small configuration of
// these pieces on top of BaseGame: Meter (timing), Rhythm (falling notes), Sequence / Pairs
// (memory), Targets (tap targets), Swipe + arc flight (aim / throw), Catcher (catch), Lanes and
// jump / lift (runner / drive). Games keep only their theme, numbers, art and effects.
//
// Conventions (same as the first four games):
//   · positions are canvas px; `u` = UI unit; the shell's `bgRect` maps backdrop features
//   · doing nothing always ends the game as a loss (time limit or missed items) — Skip is separate
//   · qa() is read-only. `bot.win` = the next correct real input right now (or null = wait),
//     `bot.lose` = a wrong input (or null = idle). The e2e bot sends them as real mouse / touch
//     events; nothing ever sets progress directly.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const rand = (a, b) => a + Math.random() * (b - a);
export function lerpColor(c0, c1, k) {
  const r = Math.round(lerp((c0 >> 16) & 255, (c1 >> 16) & 255, k));
  const g = Math.round(lerp((c0 >> 8) & 255, (c1 >> 8) & 255, k));
  const b = Math.round(lerp(c0 & 255, c1 & 255, k));
  return (r << 16) | (g << 8) | b;
}

// ---- base -------------------------------------------------------------------------------------
export class BaseGame {
  constructor(shell, { ownsHero = false, time = 0 } = {}) {
    this.s = shell;
    this.ownsHero = ownsHero;
    this.t = 0;
    this.limit = time;
    this.left = time;
    this.ended = false;
  }

  get l() {
    return this.s.layout;
  }

  get u() {
    return this.s.layout.u;
  }

  get playing() {
    return this.s.state === 'play' && !this.ended;
  }

  // an image fitted so its longest side is `size`
  img(key, size, layer = this.s.world) {
    const i = this.s.add.image(0, 0, key);
    fit(i, size);
    layer.add(i);
    return i;
  }

  gfx(layer = this.s.world) {
    const g = this.s.add.graphics();
    layer.add(g);
    return g;
  }

  // the hero's display box for a pose (before / without the shell placing it)
  heroBox(pose = this.heroPose(this.l)) {
    const h = this.s.hero;
    const m = Math.max(h.width || 1, h.height || 1);
    const w = (pose.size * (h.width || 1)) / m;
    const hh = (pose.size * (h.height || 1)) / m;
    return { x: pose.x, y: pose.y, w, h: hh, x0: pose.x - w / 2, y0: pose.y - hh / 2, x1: pose.x + w / 2, y1: pose.y + hh / 2 };
  }

  // a point inside the hero box by fractions (0..1)
  heroAt(fx, fy, pose) {
    const b = this.heroBox(pose);
    return { x: b.x0 + b.w * fx, y: b.y0 + b.h * fy };
  }

  // the free play area under the title / pips / timer and above the Skip button
  field() {
    const { W, H, u, margin: m } = this.l;
    return { x0: m + 8 * u, x1: W - m - 8 * u, y0: m + 168 * u, y1: H - m - 64 * u };
  }

  start() {
    this.layout?.(this.l);
    if (this.limit) this.s.setTime(1);
    this.begin?.();
  }

  // time limit: call from update(); fires timeUp() once
  tickClock(dt) {
    if (!this.limit || !this.playing) return;
    this.left = Math.max(0, this.left - dt);
    this.s.setTime(this.left / this.limit);
    if (this.left <= 0) this.timeUp?.();
  }

  end(win) {
    if (this.ended) return;
    this.ended = true;
    this.s.finish(win);
  }

  // games that own the hero put it back at its pose after a resize (never during the fly-in)
  placeHero() {
    if (this.s.state !== 'play' && this.s.state !== 'end') return;
    const p = this.heroPose(this.l);
    this.s.hero.setPosition(p.x, p.y).setScale(this.s.heroScale(p.size)).setAngle(p.angle ?? 0);
  }

  // a gentle "squash" bounce of the hero (feedback on a good action)
  bounceHero(k = 1.05) {
    const h = this.s.hero;
    const base = this.s.heroScale(this.heroPose(this.l).size);
    this.s.tweens.killTweensOf(h);
    h.setScale(base);
    this.s.tweens.add({ targets: h, scaleX: base * k, scaleY: base * (2 - k), duration: 80, yoyo: true, ease: 'Quad.easeOut', onComplete: () => h.setScale(base) });
  }

  // QA conversions (canvas px → CSS px)
  pt(x, y) {
    const d = this.l.dpr;
    return { x: x / d, y: y / d };
  }

  tapAct(x, y) {
    return { type: 'tap', ...this.pt(x, y) };
  }

  dragAct(x0, y0, x1, y1, steps = 8) {
    const a = this.pt(x0, y0);
    const b = this.pt(x1, y1);
    return { type: 'drag', x0: a.x, y0: a.y, x1: b.x, y1: b.y, steps };
  }

  pressAct(x, y) {
    return { type: 'press', ...this.pt(x, y) };
  }

  qa() {
    return { bot: { win: this.playing ? (this.botWin?.() ?? null) : null, lose: this.playing ? (this.botLose?.() ?? null) : null }, timeLeft: this.limit ? this.left : null, ...(this.info?.() ?? {}) };
  }
}

export function fit(img, size) {
  img.setScale(size / Math.max(img.width, img.height));
  return img;
}

// ---- TIMING: a marker sweeping 0..1..0 over a scale with a success zone ------------------------
// `speed` = full sweeps (0→1) per second; the zone is [center ± width/2]; `perfect` = inner share.
export class Meter {
  // loop: the marker wraps 0 → 1 → 0 → … (a clock hand / dial) instead of sweeping back and forth
  constructor({ speed = 0.8, center = 0.5, width = 0.24, perfect = 0.4, start = 0, loop = false } = {}) {
    this.loop = loop;
    this.laps = 0;
    this.speed = speed;
    this.pos = start;
    this.dir = 1;
    this.setZone(center, width);
    this.perfect = perfect;
    this.frozen = false;
  }

  setZone(center, width) {
    this.center = center;
    this.width = width;
  }

  get zone() {
    return [this.center - this.width / 2, this.center + this.width / 2];
  }

  update(dt) {
    if (this.frozen) return;
    if (this.loop) {
      this.pos += this.speed * dt;
      if (this.pos >= 1) [this.pos, this.laps] = [this.pos - 1, this.laps + 1];
      return;
    }
    this.pos += this.dir * this.speed * dt;
    if (this.pos > 1) [this.pos, this.dir] = [2 - this.pos, -1];
    if (this.pos < 0) [this.pos, this.dir] = [-this.pos, 1];
  }

  // 'perfect' | 'good' | null
  dist(pos = this.pos) {
    const d = Math.abs(pos - this.center);
    return this.loop ? Math.min(d, 1 - d) : d;
  }

  judge(pos = this.pos) {
    const d = this.dist(pos);
    if (d <= (this.width / 2) * this.perfect) return 'perfect';
    if (d <= this.width / 2) return 'good';
    return null;
  }

  // bot helper: safely inside the zone (accounts for polling latency)
  safe(pad = 0.35) {
    return this.dist() <= (this.width / 2) * (1 - pad);
  }
}

// a horizontal meter bar: track + zone (green, perfect core brighter) + marker
export function drawBar(g, x, y, w, h, m, u, { flash = 0 } = {}) {
  const r = h / 2;
  g.fillStyle(0x000000, 0.3).fillRoundedRect(x - 4 * u, y - 4 * u + 3 * u, w + 8 * u, h + 8 * u, r + 4 * u);
  g.fillStyle(0xffffff, 1).fillRoundedRect(x - 4 * u, y - 4 * u, w + 8 * u, h + 8 * u, r + 4 * u);
  g.fillStyle(0xffd9c2, 1).fillRoundedRect(x, y, w, h, r);
  const [z0, z1] = m.zone;
  g.fillStyle(0x4fc84b, 1).fillRect(x + w * z0, y, w * (z1 - z0), h);
  const pw = (z1 - z0) * m.perfect;
  g.fillStyle(0xb8f25a, 1).fillRect(x + w * (m.center - pw / 2), y, w * pw, h);
  if (flash > 0) g.fillStyle(0xffffff, flash * 0.7).fillRoundedRect(x, y, w, h, r);
  const mx = x + w * m.pos;
  g.fillStyle(0x000000, 0.3).fillTriangle(mx - 12 * u, y - 14 * u + 2 * u, mx + 12 * u, y - 14 * u + 2 * u, mx, y + 4 * u);
  g.fillStyle(0x2f4e8c, 1).fillRoundedRect(mx - 4 * u, y - 8 * u, 8 * u, h + 16 * u, 4 * u);
  g.fillStyle(0xffffff, 1).fillRoundedRect(mx - 1.5 * u, y - 5 * u, 3 * u, h + 10 * u, 1.5 * u);
}

// an arc meter around a centre (angles in radians, a0 → a1 maps 0 → 1)
export function drawArcMeter(g, cx, cy, r, a0, a1, m, u, { thick = 16 } = {}) {
  const at = (k) => a0 + (a1 - a0) * k;
  const [z0, z1] = m.zone;
  g.lineStyle(thick * u + 8 * u, 0xffffff, 0.95).beginPath().arc(cx, cy, r, a0, a1, a1 < a0).strokePath();
  g.lineStyle(thick * u, 0xffd9c2, 1).beginPath().arc(cx, cy, r, a0, a1, a1 < a0).strokePath();
  g.lineStyle(thick * u, 0x4fc84b, 1).beginPath().arc(cx, cy, r, at(z0), at(z1), a1 < a0).strokePath();
  const pw = (z1 - z0) * m.perfect;
  g.lineStyle(thick * u, 0xb8f25a, 1).beginPath().arc(cx, cy, r, at(m.center - pw / 2), at(m.center + pw / 2), a1 < a0).strokePath();
}

// ---- RHYTHM: items fall down lanes to a hit line --------------------------------------------
// The game draws the lanes / rings; Rhythm owns spawning, falling, judging and misses.
export class Rhythm {
  constructor(game, { seq, spawn = 0.8, fall = 1.8, lead = 0.6, window = 110, perfect = 40, make, onHit, onMiss }) {
    Object.assign(this, { game, seq, spawn, fall, lead, window, perfect, make, onHit, onMiss });
    this.t = 0;
    this.next = 0;
    this.items = [];
    this.judged = 0;
    this.hits = 0;
  }

  setGeometry(lanes, topY, hitY) {
    this.lanes = lanes;
    this.topY = topY;
    this.hitY = hitY;
  }

  update(dt) {
    this.t += dt;
    while (this.next < this.seq.length && this.t >= this.lead + this.next * this.spawn) {
      const lane = this.seq[this.next];
      this.items.push({ id: this.next, lane, y: this.topY, img: this.make(lane, this.next) });
      this.next += 1;
    }
    const u = this.game.u;
    const v = (this.hitY - this.topY) / this.fall;
    for (const n of this.items) {
      if (n.hit) continue;
      n.y += v * dt;
      n.img.setPosition(this.lanes[n.lane], n.y);
      if (!n.judged && n.y > this.hitY + this.window * u) {
        n.judged = true;
        this.judged += 1;
        this.onMiss(n);
      }
    }
    this.items = this.items.filter((n) => !n.hit && !(n.judged && n.y > this.hitY + this.window * u + 1));
  }

  // a tap on a lane → the best note in the window (or null)
  tap(lane) {
    const u = this.game.u;
    let best = null;
    for (const n of this.items) {
      if (n.lane !== lane || n.judged) continue;
      const d = Math.abs(n.y - this.hitY);
      if (d < this.window * u && (!best || d < Math.abs(best.y - this.hitY))) best = n;
    }
    if (!best) return null;
    best.judged = true;
    best.hit = true;
    this.judged += 1;
    this.hits += 1;
    const perfect = Math.abs(best.y - this.hitY) < this.perfect * u;
    this.onHit(best, perfect);
    return best;
  }

  get done() {
    return this.judged >= this.seq.length;
  }

  // bot: a note close to the line
  ready(slack = 38) {
    return this.items.find((n) => !n.judged && Math.abs(n.y - this.hitY) < slack * this.game.u) ?? null;
  }
}

// ---- MEMORY ------------------------------------------------------------------------------------
// Sequence (Simon): show a growing sequence, the player repeats it.
export class Sequence {
  constructor({ pads, rounds = [3, 4, 5], seed = null }) {
    this.pads = pads;
    this.rounds = rounds;
    this.full = [];
    for (let i = 0; i < rounds[rounds.length - 1]; i++) {
      let p;
      do p = seed ? seed[i % seed.length] : Math.floor(Math.random() * pads);
      while (!seed && i > 0 && p === this.full[i - 1] && Math.random() < 0.7);
      this.full.push(p);
    }
    this.round = 0;
    this.pos = 0;
  }

  get current() {
    return this.full.slice(0, this.rounds[this.round]);
  }

  get expected() {
    return this.current[this.pos];
  }

  // → 'ok' | 'round' (round complete) | 'done' (all rounds) | 'wrong'
  input(p) {
    if (p !== this.expected) {
      this.pos = 0;
      return 'wrong';
    }
    this.pos += 1;
    if (this.pos < this.current.length) return 'ok';
    this.pos = 0;
    this.round += 1;
    return this.round >= this.rounds.length ? 'done' : 'round';
  }
}

// Pairs: n face-down cards, find the matching pairs.
export function shuffledPairs(kinds) {
  const a = [...kinds, ...kinds];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- TAP TARGETS -------------------------------------------------------------------------------
// Spawned targets with a lifetime; generous circular hit test (radius × hitScale).
export class Targets {
  constructor(game, { hitScale = 1.25, onExpire } = {}) {
    this.game = game;
    this.hitScale = hitScale;
    this.onExpire = onExpire;
    this.list = [];
    this.ids = 0;
  }

  add(t) {
    const o = { id: this.ids++, age: 0, life: Infinity, alive: true, ...t };
    this.list.push(o);
    return o;
  }

  update(dt) {
    for (const t of this.list) {
      if (!t.alive) continue;
      t.age += dt;
      t.update?.(t, dt);
      if (t.age >= t.life) {
        t.alive = false;
        this.onExpire?.(t);
      }
    }
    this.list = this.list.filter((t) => t.alive);
  }

  hit(x, y) {
    let best = null;
    let bd = Infinity;
    for (const t of this.list) {
      if (!t.alive || t.tappable === false) continue;
      const d = Math.hypot(x - t.x, y - t.y);
      if (d < t.r * this.hitScale && d < bd) [best, bd] = [t, d];
    }
    if (best) best.alive = false;
    return best;
  }
}

// ---- AIM / THROW -------------------------------------------------------------------------------
// A swipe that starts near `from` (or anywhere when `anywhere`), released → the flick vector.
export class Swipe {
  constructor({ minLen = 40, anywhere = true } = {}) {
    this.minLen = minLen;
    this.anywhere = anywhere;
    this.active = null;
  }

  down(p) {
    this.active = { x0: p.x, y0: p.y, x: p.x, y: p.y, t0: performance.now() };
  }

  move(p) {
    if (this.active) Object.assign(this.active, { x: p.x, y: p.y });
  }

  // → { dx, dy, len, ang } or null (too short)
  up(p, u) {
    const a = this.active;
    this.active = null;
    if (!a) return null;
    const dx = p.x - a.x0;
    const dy = p.y - a.y0;
    const len = Math.hypot(dx, dy);
    if (len < this.minLen * u) return null;
    return { dx, dy, len, ang: Math.atan2(dy, dx) };
  }
}

// quadratic arc between two points with a raised apex; k = 0..1
export function arcPoint(x0, y0, x1, y1, k, lift) {
  const top = Math.min(y0, y1) - lift;
  return { x: lerp(x0, x1, k), y: (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * top + k * k * y1 };
}

// dotted guide along an arc
export function drawGuide(g, x0, y0, x1, y1, lift, u, color = 0xffffff, n = 14) {
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const q = arcPoint(x0, y0, x1, y1, k, lift);
    g.fillStyle(color, 0.95 - k * 0.45).fillCircle(q.x, q.y, (6 - k * 2.5) * u);
  }
}

// ---- ATTACH (polish 2026-10-17) ----------------------------------------------------------------
// Objects that end up ON something that moves (rings on the bobbing carousel pole, apples in the
// dragged crate, roses in the gliding vase, toast on the plate): each one eases from where it was
// caught to its exact slot, then stays locked to the slot every frame — no teleport, no drift.
// slot(i) → { x, y, sx, sy, angle } in world px / absolute scale.
export class Riders {
  constructor(slot, { dur = 0.32 } = {}) {
    this.slot = slot;
    this.dur = dur;
    this.list = [];
  }

  add(img) {
    this.list.push({ img, k: 0, x0: img.x, y0: img.y, sx0: img.scaleX, sy0: img.scaleY, a0: img.angle, i: this.list.length });
  }

  get length() {
    return this.list.length;
  }

  update(dt) {
    for (const r of this.list) {
      r.k = Math.min(1, r.k + dt / this.dur);
      const e = 1 - (1 - r.k) ** 3;
      const q = this.slot(r.i);
      r.img.setPosition(lerp(r.x0, q.x, e), lerp(r.y0, q.y, e)).setScale(lerp(r.sx0, q.sx, e), lerp(r.sy0, q.sy, e)).setAngle(lerp(r.a0, q.angle ?? 0, e));
    }
  }
}

// ---- CATCH -------------------------------------------------------------------------------------
// The catcher follows the pointer's x (press-drag on touch, plain move on desktop), smoothed.
export class Catcher {
  constructor({ x = 0, min = 0, max = 1, follow = 18 } = {}) {
    Object.assign(this, { x, tx: x, min, max, follow });
  }

  aim(x) {
    this.tx = clamp(x, this.min, this.max);
  }

  update(dt) {
    this.x = lerp(this.x, this.tx, 1 - Math.exp(-this.follow * dt));
  }
}

// ---- RUNNER / DRIVE ----------------------------------------------------------------------------
// Lanes: the player switches between horizontal lanes (tap above / below the vehicle, or swipe);
// things scroll in from the right at `speed` and are judged when they reach the player's x.
export class Lanes {
  constructor({ n = 3, lane = 1, switchTime = 0.16 } = {}) {
    Object.assign(this, { n, lane, pos: lane, switchTime });
  }

  set(lane) {
    this.lane = clamp(lane, 0, this.n - 1);
  }

  update(dt) {
    const d = this.lane - this.pos;
    const step = dt / this.switchTime;
    this.pos = Math.abs(d) <= step ? this.lane : this.pos + Math.sign(d) * step;
  }
}

// One-button jump with a fixed arc (forgiving: long airtime, early press allowed)
export class Jumper {
  constructor({ air = 0.62, height = 1 } = {}) {
    Object.assign(this, { air, height, t: -1 });
  }

  jump() {
    if (this.t >= 0) return false;
    this.t = 0;
    return true;
  }

  update(dt) {
    if (this.t < 0) return 0;
    this.t += dt / this.air;
    if (this.t >= 1) {
      this.t = -1;
      return 0;
    }
    return Math.sin(Math.PI * this.t) * this.height;
  }

  get airborne() {
    return this.t >= 0;
  }
}

// infinite scrolling strip of an image across [x0, x1] at a y (wraps tiles)
export class Strip {
  constructor(game, key, layer) {
    this.game = game;
    this.key = key;
    this.layer = layer;
    this.tiles = [];
    this.off = 0;
  }

  layout(x0, x1, yc, h) {
    this.x0 = x0;
    this.x1 = x1;
    const src = this.game.s.textures.get(this.key).getSourceImage();
    const k = h / src.height;
    this.tw = src.width * k;
    const need = Math.ceil((x1 - x0) / this.tw) + 3;
    while (this.tiles.length < need) {
      const i = this.game.s.add.image(0, 0, this.key).setOrigin(0, 0.5);
      // every other tile mirrored → seamless joins for non-tiling art
      if (this.tiles.length % 2) i.setFlipX(true);
      this.layer.add(i);
      this.tiles.push(i);
    }
    this.tiles.forEach((t) => t.setScale(k).setY(yc));
    this.place();
  }

  scroll(dx) {
    this.off = (this.off + dx) % (this.tw * 2);
    this.place();
  }

  place() {
    this.tiles.forEach((t, i) => t.setX(this.x0 - this.off + i * this.tw));
  }
}
