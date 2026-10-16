// Aquarium → Feed the Fish (expansion 2026-10-16, Tap Targets: tap a spot). Three goldfish
// (generated sprite, tinted per fish) swim in the cleaned tank. Tap the water to drop a food flake
// there — the nearest hungry fish darts to it and gulps it (hearts!). Each fish wants 2 flakes; feed
// all three within 14 s. Fish grow a little with every bite.
import { BaseGame, clamp, rand } from '../systems/kit.js';

const BITES = 2;
const TINTS = [0xffffff, 0xffc3d8, 0xfff0a0];
const TANK = { x0: 0.07, x1: 0.93, y0: 0.13, y1: 0.58 }; // the water (hero box fractions)

export class FeedFishGame extends BaseGame {
  constructor(shell) {
    super(shell, { time: 14 });
    this.food = [];
    this.fed = 0;
    this.foodG = this.gfx(shell.fx);
    this.fish = TINTS.map((tint, i) => {
      const img = shell.add.image(0, 0, 'mg-fish').setTint(tint);
      shell.fx.add(img);
      return { i, img, x: 0, y: 0, vx: (i % 2 ? -1 : 1) * rand(60, 90), bites: 0, target: null, grow: 1, ph: rand(0, 6) };
    });
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.98, 720 * l.u, l.H * 0.62 * 1.55);
    const f = this.field();
    return { x: l.W / 2, y: (f.y0 + f.y1) / 2 + 10 * l.u, size, angle: 0 };
  }

  layout(l) {
    const b = this.heroBox();
    this.tank = { x0: b.x0 + b.w * TANK.x0, x1: b.x0 + b.w * TANK.x1, y0: b.y0 + b.h * TANK.y0, y1: b.y0 + b.h * TANK.y1 };
    this.fishSize = Math.max(Math.min(b.w * 0.17, 130 * l.u), 64 * l.dpr);
    this.fish.forEach((f) => {
      if (!f.x) {
        f.x = this.tank.x0 + (this.tank.x1 - this.tank.x0) * [0.25, 0.6, 0.8][f.i];
        f.y = this.tank.y0 + (this.tank.y1 - this.tank.y0) * [0.3, 0.65, 0.4][f.i];
      }
      f.x = clamp(f.x, this.tank.x0, this.tank.x1);
      f.y = clamp(f.y, this.tank.y0, this.tank.y1);
    });
  }

  inTank(x, y) {
    const t = this.tank;
    return x > t.x0 - 20 * this.u && x < t.x1 + 20 * this.u && y > t.y0 - 120 * this.u && y < t.y1 + 30 * this.u;
  }

  onDown(p) {
    if (!this.playing || !this.inTank(p.x, p.y)) return;
    if (this.food.length >= 4) return;
    const x = clamp(p.x, this.tank.x0 + 10 * this.u, this.tank.x1 - 10 * this.u);
    // the flake drops in at the surface above the tap and sinks to the tapped depth, then lower
    const fl = { x, y: this.tank.y0, stop: clamp(p.y, this.tank.y0 + 20 * this.u, this.tank.y1), age: 0, eaten: false };
    this.food.push(fl);
    this.s.services.audio.noise({ dur: 0.16, freq: 2400, q: 1.5, gain: 0.2 });
    this.s.ring(x, this.tank.y0, 26 * this.u, 0xdff6ff, 300);
    // the nearest hungry, free fish goes for it
    const f = this.fish.filter((q) => q.bites < BITES && !q.target).sort((a, b) => Math.hypot(a.x - x, a.y - fl.stop) - Math.hypot(b.x - x, b.y - fl.stop))[0];
    if (f) f.target = fl;
  }

  update(dt) {
    this.t += dt;
    const u = this.u;
    if (!this.tank) return;
    if (this.playing) this.tickClock(dt);
    // food: sinks, wobbling; uneaten flakes dissolve after a while
    for (const fl of this.food) {
      fl.age += dt;
      fl.y = Math.min(fl.y + 120 * u * dt, fl.age < 1.2 ? fl.stop : this.tank.y1);
      if (fl.age > 4) fl.eaten = true;
    }
    for (const f of this.fish) {
      const full = f.bites >= BITES;
      if (f.target && f.target.eaten) f.target = null;
      if (!f.target && !full) f.target = this.food.find((fl) => !fl.eaten && !this.fish.some((o) => o.target === fl)) ?? null;
      if (f.target) {
        const dx = f.target.x - f.x;
        const dy = f.target.y - f.y;
        const d = Math.hypot(dx, dy);
        const sp = 330 * u;
        if (d < 26 * u) this.eat(f, f.target);
        else {
          f.x += (dx / d) * Math.min(d, sp * dt);
          f.y += (dy / d) * Math.min(d, sp * dt);
          f.dir = Math.sign(dx) || f.dir;
        }
      } else {
        // idle swimming back and forth, a lazy bob
        f.x += f.vx * u * dt * (full ? 0.6 : 1);
        if (f.x < this.tank.x0 + this.fishSize * 0.4) f.vx = Math.abs(f.vx);
        if (f.x > this.tank.x1 - this.fishSize * 0.4) f.vx = -Math.abs(f.vx);
        f.y = clamp(f.y + Math.sin(this.t * 1.5 + f.ph) * 20 * u * dt, this.tank.y0 + this.fishSize * 0.3, this.tank.y1 - this.fishSize * 0.25);
        f.dir = Math.sign(f.vx);
      }
      const sz = this.fishSize * f.grow;
      f.img.setScale(sz / Math.max(f.img.width, f.img.height)).setPosition(f.x, f.y + Math.sin(this.t * 3 + f.ph) * 3 * u).setFlipX(f.dir < 0).setAngle(Math.sin(this.t * 6 + f.ph) * 4);
    }
    this.food = this.food.filter((fl) => !fl.eaten);
    const g = this.foodG.clear();
    for (const fl of this.food) {
      g.fillStyle(0x8a4b1e, 1).fillCircle(fl.x, fl.y, 7 * u);
      g.fillStyle(0xe8a35a, 1).fillCircle(fl.x - 1.5 * u, fl.y - 1.5 * u, 4.5 * u);
    }
  }

  eat(f, fl) {
    const s = this.s;
    fl.eaten = true;
    f.target = null;
    f.bites += 1;
    this.fed += 1;
    s.progress(this.fish.filter((q) => q.bites >= BITES).length);
    s.tweens.add({ targets: f, grow: 1 + f.bites * 0.12, duration: 220, ease: 'Back.easeOut' });
    s.services.audio.play('ui-pop');
    s.services.audio.tone(f.bites >= BITES ? 1046.5 : 783.99, { gain: 0.3, dur: 0.35 });
    s.burst(fl.x, fl.y, [0xff6fa8, 0xffffff, 0xbfe9ff], 10, 0.7);
    s.flash(f.bites >= BITES ? 'FULL!' : 'GULP!', f.x, f.y - this.fishSize * 0.7, '#FFE15A', '#B4501E');
    if (this.fish.every((q) => q.bites >= BITES)) s.time.delayedCall(450, () => this.end(true));
  }

  timeUp() {
    this.end(false);
  }

  botWin() {
    const f = this.fish.find((q) => q.bites < BITES && !q.target);
    if (!f || this.food.length >= 2) return null;
    return { ...this.tapAct(f.x, f.y), wait: 250 };
  }

  info() {
    return { fed: this.fed, full: this.fish.filter((q) => q.bites >= BITES).length };
  }
}
