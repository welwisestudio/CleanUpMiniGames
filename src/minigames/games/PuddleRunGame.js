// Sneaker → Puddle Run (expansion 2026-10-16, Runner system: one-button jump). The cleaned
// sneaker runs along a rainy pavement (generated road strip); muddy puddles (generated sprite)
// come in from the right. Tap anywhere to jump — keep the sneaker clean! 7 puddles; 3 splashes end
// the run. The jump is long and floaty and may start early: the glow under a puddle shows when it
// is time.
import { BaseGame, Jumper, Strip, rand } from '../systems/kit.js';

const PUDDLES = 7;
const LIVES = 3;

export class PuddleRunGame extends BaseGame {
  constructor(shell) {
    super(shell, { ownsHero: true });
    this.strip = new Strip(this, 'mg-road', shell.world);
    this.jumper = new Jumper({ air: 0.7 });
    this.puddles = [];
    this.spawned = 0;
    this.cleared = 0;
    this.splashes = 0;
    this.next = 0.9;
    this.lift = 0;
    this.shadow = this.gfx(shell.fx);
  }

  heroPose(l) {
    const size = this.size ?? Math.min(l.W * 0.3, 220 * l.u);
    return { x: this.x ?? l.W * 0.26, y: (this.groundY ?? l.H * 0.62) - size * 0.22 - this.lift, size, angle: 0 };
  }

  layout(l) {
    this.s.setLives(LIVES - this.splashes, LIVES);
    const f = this.field();
    const portrait = l.W < l.H;
    const bandH = Math.min((f.y1 - f.y0) * (portrait ? 0.42 : 0.55), 420 * l.u);
    const yc = (f.y0 + f.y1) / 2 + 30 * l.u;
    this.strip.layout(0, l.W, yc, bandH);
    this.groundY = yc + bandH * 0.12;
    this.size = Math.max(Math.min(l.W * (portrait ? 0.4 : 0.22), 250 * l.u), 130 * l.dpr);
    this.x = Math.max(l.margin + this.size * 0.6, l.W * 0.22);
    this.puddleW = this.size * 1.15;
    this.jumper.height = Math.max(this.size * 1.0, 130 * l.u);
    this.speed = Math.max(Math.min(l.W * 0.5, 480 * l.u), 220 * l.dpr);
    for (const p of this.puddles) p.img.setY(this.groundY + this.size * 0.05);
  }

  onDown() {
    if (!this.playing) return;
    if (this.jumper.jump()) {
      this.s.services.audio.noise({ dur: 0.2, freq: 900, to: 2000, q: 1, gain: 0.25 });
      this.s.puffs(this.x, this.groundY, { n: 3, size: 30, speed: 70, life: 450, rise: -20, alpha: 0.5 });
    }
  }

  spawn() {
    const img = this.img('mg-puddle', this.puddleW, this.s.world);
    img.setPosition(this.s.layout.W + this.puddleW, this.groundY + this.size * 0.05);
    this.puddles.push({ img, x: img.x, judged: false });
    this.spawned += 1;
  }

  update(dt) {
    this.t += dt;
    if (!this.groundY) return;
    const u = this.u;
    const run = this.playing ? 1 : this.s.state === 'end' ? 0.3 : 0;
    this.strip.scroll(this.speed * dt * run);
    this.lift = this.playing || this.s.state === 'end' ? this.jumper.update(dt) : 0;
    const h = this.s.hero;
    if (this.s.state === 'play' || this.s.state === 'end') {
      const p = this.heroPose(this.l);
      const step = this.jumper.airborne ? 0 : Math.abs(Math.sin(this.t * 14)) * 7 * u;
      h.setPosition(p.x, p.y - step).setScale(this.s.heroScale(p.size)).setAngle(this.jumper.airborne ? -12 * Math.sin(Math.PI * this.jumper.t) : Math.sin(this.t * 14) * 3);
    }
    const sg = this.shadow.clear();
    sg.fillStyle(0x000000, 0.22 * (1 - Math.min(0.7, this.lift / (this.jumper.height || 1)))).fillEllipse(this.x, this.groundY + this.size * 0.12, this.size * 0.8 * (1 - 0.3 * this.lift / (this.jumper.height || 1)), this.size * 0.16);
    if (!this.playing) return;
    this.next -= dt;
    if (this.next <= 0 && this.spawned < PUDDLES) {
      this.spawn();
      this.next = rand(1.15, 1.5);
    }
    for (const p of this.puddles) {
      p.x -= this.speed * dt;
      p.img.setX(p.x);
      const near = Math.abs(p.x - this.x) < this.puddleW * 0.5 + this.size * 0.2;
      if (!p.judged && near && Math.abs(p.x - this.x) < this.puddleW * 0.25) {
        p.judged = true;
        if (this.lift > this.size * 0.12) this.clear(p);
        else this.splash(p);
      }
      if (p.x < -this.puddleW) p.gone = true;
    }
    this.puddles = this.puddles.filter((p) => !p.gone || p.img.destroy());
  }

  clear(p) {
    const s = this.s;
    this.cleared += 1;
    s.progress(Math.min(PUDDLES - LIVES + 1, this.cleared));
    s.services.audio.tone([659.25, 783.99, 880, 1046.5][this.cleared % 4], { gain: 0.28, dur: 0.3 });
    if (this.cleared % 2 === 1) s.flash(this.cleared === 1 ? 'HOP!' : 'CLEAN!', this.x, this.groundY - this.jumper.height - this.size * 0.4, '#FFE15A', '#B4501E');
    this.check();
  }

  splash(p) {
    const s = this.s;
    this.splashes += 1;
    s.setLives(LIVES - this.splashes, LIVES);
    s.services.audio.noise({ dur: 0.5, freq: 1300, to: 350, q: 0.6, gain: 0.55 });
    s.burst(p.x, this.groundY, [0x7a5a3a, 0xa3825a, 0x9fc7e6, 0xffffff], 18, 0.95);
    s.puffs(p.x, this.groundY, { n: 4, size: 40, speed: 140, life: 600, rise: 120, alpha: 0.7, tint: 0x9a7a5a });
    s.flash('SPLASH!', this.x, this.groundY - this.size, '#FFFFFF', '#6B4A2A');
    s.shake(0.006, 140);
    this.s.hero.setTint(0xd9c3a5);
    s.time.delayedCall(500, () => this.s.hero.clearTint());
    this.check();
  }

  check() {
    if (this.splashes >= LIVES) return this.s.time.delayedCall(450, () => this.end(false));
    if (this.cleared + this.splashes >= PUDDLES) this.s.time.delayedCall(450, () => this.end(true));
  }

  // jump when the next puddle is about one jump-half away
  botWin() {
    if (this.jumper.airborne) return null;
    const p = this.puddles.find((q) => !q.judged && q.x > this.x);
    if (!p) return null;
    const t = (p.x - this.x) / this.speed;
    return t < this.jumper.air * 0.5 && t > 0.1 ? { ...this.tapAct(this.l.W / 2, this.l.H * 0.5), wait: 40 } : null;
  }

  info() {
    return { cleared: this.cleared, splashes: this.splashes, spawned: this.spawned };
  }
}
