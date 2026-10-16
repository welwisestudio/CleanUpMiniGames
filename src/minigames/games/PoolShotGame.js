// Swimming Pool → Pool Shot (expansion 2026-10-16, Aim / Throw system; replaces the Perfect Dive
// idea — no diver). Three striped swim rings (generated sprite) drift on the cleaned pool's water;
// a beach ball (generated sprite) waits on the deck. Pull back from the ball and let go: the dotted
// guide shows exactly where it will splash down (longer pull = farther). Land it inside a ring.
// 3 balls, 2 rings win. Splash, trail and water spray on every landing.
import { BaseGame, Swipe, arcPoint, drawGuide, clamp, rand } from '../systems/kit.js';

const BALLS = 3;
const NEED = 2;
const FLIGHT = 0.75;
const WATER = { x: 0.48, y: 0.5, rx: 0.2, ry: 0.12 }; // where the rings drift (hero box fractions)

export class PoolShotGame extends BaseGame {
  constructor(shell) {
    super(shell, { time: 16 });
    this.swipe = new Swipe({ minLen: 30 });
    this.guide = this.gfx(shell.fx);
    this.shadow = this.gfx(shell.fx);
    this.rings = [0, 1, 2].map((i) => ({ i, img: this.img('mg-swimring', 100, shell.fx), ph: rand(0, 6), hit: false }));
    this.ball = this.img('mg-beachball', 100, shell.fx);
    this.trail = shell.add.particles(0, 0, 'fx-dot', { lifespan: 300, scale: { start: 0.9, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: [0xffffff, 0xffe15a], frequency: 16, emitting: false });
    shell.fx.add(this.trail);
    this.res = [];
    this.fly = null;
    this.pinned = []; // balls resting in the rings they hit
  }

  heroPose(l) {
    const portrait = l.W < l.H;
    const size = Math.min(l.W * (portrait ? 1.42 : 0.82), 900 * l.u, l.H * (portrait ? 0.8 : 1.05));
    const f = this.field();
    return { x: l.W / 2, y: portrait ? f.y0 + (f.y1 - f.y0) * 0.38 : (f.y0 + f.y1) / 2 - 20 * l.u, size, angle: 0 };
  }

  layout(l) {
    const b = this.heroBox();
    this.w = { x: b.x0 + b.w * WATER.x, y: b.y0 + b.h * WATER.y, rx: b.w * WATER.rx, ry: b.h * WATER.ry };
    this.ringSize = Math.max(Math.min(b.w * 0.16, 150 * l.u), 74 * l.dpr);
    this.rings.forEach((r) => r.img.setScale(this.ringSize / Math.max(r.img.width, r.img.height)));
    this.ballSize = Math.max(Math.min(this.ringSize * 0.62, 96 * l.u), 52 * l.dpr);
    this.ball.setScale(this.ballSize / Math.max(this.ball.width, this.ball.height));
    this.home = { x: l.W / 2, y: this.field().y1 - this.ballSize * 0.6 };
    if (!this.fly) this.ball.setPosition(this.home.x, this.home.y);
    this.reach = Math.hypot(l.W, l.H) * 0.75;
  }

  ringPos(r, t = this.t) {
    const a = [0.15, 0.55, 0.85][r.i] * Math.PI * 2 + Math.sin(t * 0.35 + r.ph) * 0.6;
    const d = [0.95, 0.35, 0.8][r.i];
    return { x: this.w.x + Math.cos(a) * this.w.rx * d, y: this.w.y + Math.sin(a) * this.w.ry * d * 1.6 };
  }

  // pull back (slingshot): the ball flies opposite the pull, distance grows with the pull length
  target(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    const dist = clamp(len * 3.2, 60 * this.u, this.reach);
    return { x: this.home.x - (dx / len) * dist, y: this.home.y - (dy / len) * dist };
  }

  onDown(p) {
    if (this.fly || !this.playing) return;
    this.swipe.down(p);
  }

  onMove(p) {
    this.swipe.move(p);
  }

  onUp(p) {
    if (this.fly || !this.playing) return;
    const sw = this.swipe.up(p, this.u);
    if (!sw) return;
    const q = this.target(sw.dx, sw.dy);
    // a ring that will be under the landing point when the ball arrives: the ball homes onto its
    // centre (clean "swish"), otherwise it lands exactly where the guide showed
    const ring = this.rings.find((r) => !r.hit && this.ringHit(q, this.ringPos(r, this.t + FLIGHT)));
    this.fly = { x1: q.x, y1: q.y, k: 0, ring };
    this.trail.start();
    this.s.services.audio.play('hit');
    this.s.services.audio.noise({ dur: 0.35, freq: 500, to: 1600, q: 0.8, gain: 0.3 });
  }

  update(dt) {
    this.t += dt;
    for (const r of this.rings) {
      const q = this.ringPos(r);
      r.img.setPosition(q.x, q.y).setAngle(Math.sin(this.t * 1.3 + r.ph) * 6);
    }
    for (const p of this.pinned) p.img.setPosition(p.ring.img.x, p.ring.img.y);
    const g = this.guide.clear();
    const sg = this.shadow.clear();
    if (!this.fly) this.tickClock(dt);
    if (this.swipe.active && !this.fly && this.playing) {
      const a = this.swipe.active;
      const dx = a.x - a.x0;
      const dy = a.y - a.y0;
      if (Math.hypot(dx, dy) > 12 * this.u) {
        const q = this.target(dx, dy);
        drawGuide(g, this.home.x, this.home.y, q.x, q.y, 120 * this.u, this.u, 0xffffff, 16);
        g.lineStyle(4 * this.u, 0xffffff, 0.9).strokeEllipse(q.x, q.y, this.ballSize * 1.1, this.ballSize * 0.55);
      }
    }
    if (!this.fly || typeof this.fly !== 'object') return;
    const f = this.fly;
    f.k += dt / FLIGHT;
    const k = Math.min(1, f.k);
    if (f.ring) {
      const c = this.ringPos(f.ring, this.t + (1 - k) * FLIGHT);
      f.x1 = c.x;
      f.y1 = c.y;
    }
    const q = arcPoint(this.home.x, this.home.y, f.x1, f.y1, k, 160 * this.u);
    // the ball rises towards the camera mid-flight (bigger), its shadow stays on the ground line
    const lift = Math.sin(Math.PI * k);
    this.ball.setPosition(q.x, q.y).setScale((this.ballSize / Math.max(this.ball.width, this.ball.height)) * (1 + 0.35 * lift) * (1 - 0.25 * k)).setAngle(k * 540);
    this.trail.setPosition(q.x, q.y);
    const gx = this.home.x + (f.x1 - this.home.x) * k;
    const gy = this.home.y + (f.y1 - this.home.y) * k;
    sg.fillStyle(0x000000, 0.18 + 0.1 * (1 - lift)).fillEllipse(gx, gy, this.ballSize * (0.9 - 0.3 * lift), this.ballSize * 0.35);
    if (k >= 1) this.land(f);
  }

  land(f) {
    const s = this.s;
    this.trail.stop();
    this.fly = 'landed';
    const r = f.ring && !f.ring.hit ? f.ring : null;
    // water spray on every landing
    s.ring(f.x1, f.y1, this.ballSize * 1.4, 0xdff6ff, 420);
    s.burst(f.x1, f.y1, [0xbfe9ff, 0xffffff, 0x7fd0f5], 16, 0.85);
    s.puffs(f.x1, f.y1, { n: 4, size: 40, speed: 120, life: 700, rise: 40, alpha: 0.75, tint: 0xe8f8ff });
    s.services.audio.noise({ dur: 0.55, freq: 1500, to: 400, q: 0.6, gain: 0.55 });
    this.res.push(r ? 'ok' : 'miss');
    s.setPips([...this.res, ...Array(BALLS - this.res.length).fill(null)]);
    if (r) {
      r.hit = true;
      const q = this.ringPos(r);
      s.flash('RINGER!', q.x, q.y - this.ringSize * 0.7, '#FFE15A', '#B4501E');
      s.services.audio.bell(1046.5 + this.res.filter((x) => x === 'ok').length * 260, { gain: 0.42 });
      s.burst(q.x, q.y, [0xffd23f, 0xff5a5a, 0xffffff], 14, 0.9);
      // the ball sits in the middle of the ring (pinned to it from now on), the ring bobs
      this.pinned.push({ img: this.ball, ring: r });
      s.tweens.add({ targets: this.ball, scale: (this.ringSize * 0.44) / Math.max(this.ball.width, this.ball.height), angle: 0, duration: 220, ease: 'Back.easeOut' });
      s.tweens.add({ targets: r.img, scale: r.img.scale * 1.12, duration: 150, yoyo: true, repeat: 1 });
    } else {
      s.flash('SPLASH!', f.x1, f.y1 - this.ballSize, '#FFFFFF', '#2C6FA0');
      s.tweens.add({ targets: this.ball, alpha: 0, scale: this.ball.scale * 0.6, duration: 380 });
    }
    const ok = this.res.filter((x) => x === 'ok').length;
    if (ok >= NEED) return s.time.delayedCall(700, () => this.end(true));
    if (this.res.length - ok > BALLS - NEED) return s.time.delayedCall(700, () => this.end(false));
    s.time.delayedCall(800, () => {
      // a fresh ball rolls in
      if (r) this.ball = this.img('mg-beachball', 100, s.fx);
      this.ball.setScale(this.ballSize / Math.max(this.ball.width, this.ball.height)).setAlpha(1).setAngle(0).setPosition(this.home.x - this.l.W * 0.4, this.home.y);
      s.tweens.add({ targets: this.ball, x: this.home.x, angle: 360, duration: 320, ease: 'Quad.easeOut', onComplete: () => (this.fly = null) });
    });
  }

  ringHit(p, c) {
    return Math.hypot(p.x - c.x, (p.y - c.y) * 1.6) < this.ringSize * 0.55;
  }

  timeUp() {
    this.end(false);
  }

  // pull back from the ball, away from where a free ring will be when the ball arrives
  botWin() {
    if (this.fly || this.swipe.active) return null;
    const r = this.rings.find((x) => !x.hit);
    if (!r) return null;
    const q = this.ringPos(r, this.t + 0.2 + FLIGHT);
    const dx = q.x - this.home.x;
    const dy = q.y - this.home.y;
    const len = Math.hypot(dx, dy) / 3.2;
    const d = Math.hypot(dx, dy);
    return { ...this.dragAct(this.home.x, this.home.y, this.home.x - (dx / d) * len, this.home.y - (dy / d) * len, 6), wait: 120 };
  }

  botLose() {
    if (this.fly || this.swipe.active) return null;
    // a short pull: the ball plops into the empty shallow water near the deck
    return { ...this.dragAct(this.home.x, this.home.y, this.home.x + 30 * this.u, this.home.y + 22 * this.u, 4), wait: 120 };
  }

  info() {
    return { balls: this.res.length, rings: this.res.filter((x) => x === 'ok').length, ringPx: this.ringSize / this.l.dpr };
  }
}
