// Pocket Watch → Stop the Clock (expansion 2026-10-16, Timing system, looping meter). A golden
// sweep hand circles the cleaned watch's face; a glowing green arc marks the target. Tap to stop
// the hand inside it. 4 rounds, 3 good stops win; the arc moves and the hand speeds up a little
// each round. Letting the hand run three laps counts as a miss (doing nothing never wins).
import { BaseGame, Meter, drawArcMeter, rand, TAU } from '../systems/kit.js';

const ROUNDS = 4;
const NEED = 3;
const FACE = { x: 0.495, y: 0.62, r: 0.205 }; // the dial in the watch art (fractions of the hero box)

export class StopTheClockGame extends BaseGame {
  constructor(shell) {
    super(shell);
    this.meter = new Meter({ loop: true, speed: 0.42, center: rand(0.3, 0.8), width: 0.16, perfect: 0.4 });
    this.res = [];
    this.g = this.gfx(shell.fx);
    this.hold = 0;
  }

  heroPose(l) {
    const size = Math.min(l.W * 1.02, 600 * l.u, l.H * 0.56);
    return { x: l.W / 2 - size * 0.02, y: (this.field().y0 + this.field().y1) / 2 + 10 * l.u, size, angle: 0 };
  }

  layout() {
    const b = this.heroBox();
    this.cx = b.x0 + b.w * FACE.x;
    this.cy = b.y0 + b.h * FACE.y;
    this.r = b.w * FACE.r;
  }

  onDown() {
    if (!this.playing || this.hold > 0) return;
    this.stop(this.meter.judge());
  }

  stop(j) {
    const s = this.s;
    this.meter.frozen = true;
    this.hold = 0.9;
    this.res.push(j ? 'ok' : 'miss');
    s.setPips([...this.res, ...Array(ROUNDS - this.res.length).fill(null)]);
    const a = this.angle();
    const tip = { x: this.cx + Math.cos(a) * this.r * 0.75, y: this.cy + Math.sin(a) * this.r * 0.75 };
    if (j) {
      s.flash(j === 'perfect' ? 'PERFECT!' : 'STOP!', this.cx, this.cy - this.r * 1.35, '#FFE15A', '#B4501E');
      s.burst(tip.x, tip.y, [0xffd23f, 0xffffff, 0x4fc84b], j === 'perfect' ? 16 : 10, 0.9);
      s.ring(this.cx, this.cy, this.r * 1.05, 0xffe9a0, 380);
      s.services.audio.bell(j === 'perfect' ? 1318.5 : 1046.5, { gain: 0.45 });
      s.services.audio.play('hit');
    } else {
      s.flash('MISSED', this.cx, this.cy - this.r * 1.35, '#FFFFFF', '#5C6B85');
      s.services.audio.play('error');
      s.shake(0.005, 120);
    }
    const ok = this.res.filter((x) => x === 'ok').length;
    if (ok >= NEED) return s.time.delayedCall(600, () => this.end(true));
    if (this.res.length - ok > ROUNDS - NEED) return s.time.delayedCall(600, () => this.end(false));
    s.time.delayedCall(800, () => {
      // next round: new target, a bit faster
      let c;
      do c = rand(0, 1);
      while (this.meter.dist(c) < 0.25 && Math.random() < 0.95);
      this.meter.setZone(c, Math.max(0.13, 0.16 - this.res.length * 0.008));
      this.meter.speed = 0.42 + this.res.length * 0.05;
      this.meter.laps = 0;
      this.meter.frozen = false;
    });
  }

  angle() {
    return -Math.PI / 2 + this.meter.pos * TAU;
  }

  update(dt) {
    this.t += dt;
    this.hold = Math.max(0, this.hold - dt);
    this.meter.update(dt);
    if (this.playing && !this.meter.frozen && this.meter.laps >= 3) this.stop(null);
    const u = this.u;
    const g = this.g.clear();
    if (!this.r) return;
    const R = this.r;
    // a clean game dial over the watch face (the art's own hands are covered, so only the gold
    // sweep hand reads): white face, 12 ticks, the green target arc just inside the ticks
    g.fillStyle(0xfffdf6, 1).fillCircle(this.cx, this.cy, R * 0.97);
    g.lineStyle(2 * u, 0xd9c48a, 1).strokeCircle(this.cx, this.cy, R * 0.97);
    for (let i = 0; i < 12; i++) {
      const ta = (i / 12) * TAU;
      const big = i % 3 === 0;
      const r0 = R * (big ? 0.74 : 0.8);
      g.lineStyle((big ? 4 : 2.5) * u, 0x344660, 1).lineBetween(this.cx + Math.cos(ta) * r0, this.cy + Math.sin(ta) * r0, this.cx + Math.cos(ta) * R * 0.88, this.cy + Math.sin(ta) * R * 0.88);
    }
    const [z0, z1] = this.meter.zone;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 7);
    const a0 = -Math.PI / 2 + z0 * TAU;
    const a1 = -Math.PI / 2 + z1 * TAU;
    const zr = R * 0.6;
    g.fillStyle(0x4fc84b, 0.18 + 0.1 * pulse).slice(this.cx, this.cy, R * 0.9, a0, a1, false).fillPath();
    drawArcMeter(g, this.cx, this.cy, zr + R * 0.15, a0, a1, { ...this.meter, zone: [0, 1], center: 0.5, perfect: this.meter.perfect }, u, { thick: Math.max(10, (R * 0.16) / u) });
    // the sweep hand: from the centre to just past the target arc
    const a = this.angle();
    const tx = this.cx + Math.cos(a) * R * 0.86;
    const ty = this.cy + Math.sin(a) * R * 0.86;
    g.lineStyle(9 * u, 0x000000, 0.22).lineBetween(this.cx + 2 * u, this.cy + 3 * u, tx + 2 * u, ty + 3 * u);
    g.lineStyle(7 * u, 0xb4501e, 1).lineBetween(this.cx, this.cy, tx, ty);
    g.lineStyle(3.5 * u, 0xffd23f, 1).lineBetween(this.cx, this.cy, tx, ty);
    g.fillStyle(0xb4501e, 1).fillCircle(tx, ty, 7 * u);
    g.fillStyle(0xffd23f, 1).fillCircle(tx, ty, 4.5 * u);
    g.fillStyle(0xb4501e, 1).fillCircle(this.cx, this.cy, 11 * u);
    g.fillStyle(0xffe9a0, 1).fillCircle(this.cx, this.cy, 5.5 * u);
  }

  botWin() {
    return this.hold <= 0 && !this.meter.frozen && this.meter.safe(0.5) ? this.tapAct(this.l.W / 2, this.l.H * 0.5) : null;
  }

  botLose() {
    return this.hold <= 0 && !this.meter.frozen && this.meter.dist() > this.meter.width * 1.5 ? this.tapAct(this.l.W / 2, this.l.H * 0.5) : null;
  }

  info() {
    return { stops: this.res.length, ok: this.res.filter((x) => x === 'ok').length, hand: this.meter.pos, zone: this.meter.zone };
  }
}
