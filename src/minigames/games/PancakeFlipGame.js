// Frying Pan → Pancake Flip (expansion 2026-10-16, Timing system). A golden pancake (generated
// sprite) sizzles in the cleaned pan; a marker sweeps over the heat bar — tap while it is in the
// green zone and the pancake does a high double flip back into the pan. Outside the zone it flops
// out over the rim. 5 flips, 3 good ones win. The zone moves a little each flip; the marker is calm.
import { BaseGame, Meter, drawBar, rand } from '../systems/kit.js';

const FLIPS = 5;
const NEED = 3;

export class PancakeFlipGame extends BaseGame {
  constructor(shell) {
    super(shell, { ownsHero: true });
    this.meter = new Meter({ speed: 0.72, center: 0.5, width: 0.28, perfect: 0.42 });
    this.res = [];
    this.flying = false;
    this.flash = 0;
    this.bar = this.gfx(shell.fx);
    this.cake = this.img('mg-pancake', 100, shell.fx);
    this.sizzle = shell.add.particles(0, 0, 'mg-smoke', { lifespan: 900, speed: { min: 8, max: 30 }, scale: { start: 0.05, end: 0.16 }, alpha: { start: 0.45, end: 0 }, frequency: 140, gravityY: -40 });
    shell.fx.add(this.sizzle);
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.8, 460 * l.u, l.H * 0.5);
    return { x: l.W / 2 + size * 0.06, y: l.H - l.margin - 80 * l.u - size * 0.36, size, angle: 0 };
  }

  // the bowl centre of the pan art (fractions of the hero box)
  bowl() {
    return this.heroAt(0.39, 0.4);
  }

  layout(l) {
    this.placeHero();
    const b = this.heroBox();
    this.cakeSize = b.w * 0.42;
    this.cake.setScale(this.cakeSize / Math.max(this.cake.width, this.cake.height));
    if (!this.flying) this.restCake();
    const f = this.field();
    this.barW = Math.min(l.W * 0.78, 420 * l.u);
    this.barX = l.W / 2 - this.barW / 2;
    this.barY = Math.min(f.y0 + 40 * l.u, b.y0 - 140 * l.u);
  }

  restCake() {
    const p = this.bowl();
    this.cake.setPosition(p.x, p.y).setAngle(0).setAlpha(1);
    this.sizzle.setPosition(p.x, p.y);
  }

  onDown() {
    if (!this.playing || this.flying) return;
    const j = this.meter.judge();
    this.meter.frozen = true;
    this.flash = 1;
    this.flip(j);
  }

  flip(j, quiet = false) {
    const s = this.s;
    const u = this.u;
    const p = this.bowl();
    const h = s.hero;
    this.flying = true;
    this.idle = 0;
    this.sizzle.stop();
    s.services.audio.noise({ dur: 0.3, freq: 700, to: 2400, q: 1.2, gain: 0.5 });
    // the pan jerks up
    const p0 = this.heroPose(this.l);
    s.tweens.add({ targets: h, y: p0.y - 26 * u, angle: -7, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => this.placeHero() });
    const peak = p.y - Math.max(220 * u, this.l.H * 0.28);
    const base = this.cake.scaleX;
    if (j) {
      // a double flip straight up and back into the pan
      s.tweens.add({ targets: this.cake, y: peak, duration: 430, ease: 'Quad.easeOut', yoyo: true, onComplete: () => this.land(j) });
      s.tweens.add({ targets: this.cake, scaleY: { from: base, to: -base }, duration: 215, yoyo: true, repeat: 1, onComplete: () => this.cake.setScale(base) });
    } else {
      // a flop: it tumbles over the rim and off the screen
      const dir = Math.random() < 0.5 ? -1 : 1;
      s.tweens.add({ targets: this.cake, x: p.x + dir * this.l.W * 0.55, y: { from: p.y, to: this.l.H + 200 * u }, angle: dir * 220, duration: 900, ease: 'Quad.easeIn', onComplete: () => this.land(null) });
      s.tweens.add({ targets: this.cake, y: peak + 80 * u, duration: 320, ease: 'Quad.easeOut' });
      if (!quiet) s.flash('FLOP!', p.x, p.y - 120 * u, '#FFFFFF', '#8A4B1E');
      s.services.audio.play('ui-pop');
    }
  }

  land(j) {
    const s = this.s;
    const p = this.bowl();
    const u = this.u;
    this.res.push(j ? 'ok' : 'miss');
    s.setPips([...this.res, ...Array(FLIPS - this.res.length).fill(null)]);
    if (j) {
      s.flash(j === 'perfect' ? 'PERFECT!' : 'NICE FLIP!', p.x, p.y - 110 * u, '#FFE15A', '#B4501E');
      s.burst(p.x, p.y, [0xffd23f, 0xffffff, 0xf2a03d], j === 'perfect' ? 16 : 10, 0.9);
      s.puffs(p.x, p.y, { n: 4, size: 50, speed: 70, life: 900, rise: -80, alpha: 0.55 });
      s.services.audio.play('place');
      s.services.audio.noise({ dur: 0.5, freq: 5200, q: 0.4, type: 'highpass', gain: 0.25 });
      this.bounceHero(1.04);
      this.restCake();
      this.cake.setTint(0xffffff);
    } else {
      this.restCake();
      this.cake.setScale(0.01);
      s.tweens.add({ targets: this.cake, scale: this.cakeSize / Math.max(this.cake.width, this.cake.height), duration: 260, ease: 'Back.easeOut' });
    }
    const ok = this.res.filter((x) => x === 'ok').length;
    const miss = this.res.length - ok;
    if (ok >= NEED) return this.s.time.delayedCall(250, () => this.end(true));
    if (miss > FLIPS - NEED) return this.s.time.delayedCall(250, () => this.end(false));
    this.flying = false;
    this.sizzle.start();
    this.meter.setZone(rand(0.3, 0.7), Math.max(0.22, 0.28 - this.res.length * 0.015));
    this.meter.frozen = false;
  }

  update(dt) {
    this.t += dt;
    this.meter.update(dt);
    this.flash = Math.max(0, this.flash - dt * 3);
    const g = this.bar.clear();
    if (this.barW) drawBar(g, this.barX, this.barY, this.barW, 26 * this.u, this.meter, this.u, { flash: this.flash });
    if (!this.flying && this.playing) {
      this.cake.setAngle(Math.sin(this.t * 3) * 2);
      // left too long it burns (doing nothing never wins)
      this.idle = (this.idle ?? 0) + dt;
      this.cake.setTint(this.idle > 2.6 ? 0xb07a52 : 0xffffff);
      if (this.idle > 4.2) {
        this.s.flash('BURNT!', this.bowl().x, this.bowl().y - 120 * this.u, '#FFFFFF', '#5A3A22');
        this.meter.frozen = true;
        this.flip(null, true);
      }
    }
  }

  botWin() {
    return !this.flying && this.meter.safe(0.45) ? this.tapAct(this.l.W / 2, this.l.H * 0.5) : null;
  }

  botLose() {
    return !this.flying && !this.meter.frozen && Math.abs(this.meter.pos - this.meter.center) > this.meter.width ? this.tapAct(this.l.W / 2, this.l.H * 0.5) : null;
  }

  info() {
    return { flips: this.res.length, ok: this.res.filter((x) => x === 'ok').length, flying: this.flying, meter: this.meter.pos, zone: this.meter.zone };
  }
}
