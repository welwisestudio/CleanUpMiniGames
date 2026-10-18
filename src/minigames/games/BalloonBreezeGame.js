// Desk Fan → Balloon Breeze (expansion 2026-10-16, Runner system: hold-to-lift). The cleaned fan
// stands on the floor blowing upwards; a red party balloon (generated sprite) floats in its
// breeze. HOLD to blow harder and the balloon rises; let go and it drifts down. Gold coins float
// past at different heights — steer the balloon through them. 9 coins, 6 collected win. No
// obstacles, generous pick-up radius, gentle physics.
import { BaseGame, clamp, rand } from '../systems/kit.js';

const COINS = 9;
const NEED = 6;

export class BalloonBreezeGame extends BaseGame {
  constructor(shell) {
    super(shell);
    this.blowing = false;
    this.vy = 0;
    this.y = null;
    this.coins = [];
    this.spawned = 0;
    this.got = 0;
    this.missed = 0;
    this.next = 0.8;
    this.string = this.gfx(shell.fx);
    this.balloon = this.img('mg-balloon', 100, shell.fx);
    this.wind = shell.add.particles(0, 0, 'fx-dot', { lifespan: 650, speedY: { min: -420, max: -300 }, speedX: { min: -30, max: 30 }, scale: { start: 0.8, end: 0.1 }, alpha: { start: 0.55, end: 0 }, tint: 0xe6f6ff, frequency: 45 });
    shell.fx.add(this.wind);
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.42, 300 * l.u, l.H * 0.28);
    return { x: l.W * (l.W < l.H ? 0.3 : 0.24), y: l.H - l.margin - 60 * l.u - size * 0.42, size, angle: 0 };
  }

  layout(l) {
    const f = this.field();
    const hb = this.heroBox();
    this.top = f.y0 + 30 * l.u;
    this.bottom = hb.y0 - 40 * l.u;
    this.bx = hb.x;
    this.bSize = Math.max(Math.min(180 * l.u, (this.bottom - this.top) * 0.32), 110 * l.dpr);
    this.balloon.setScale(this.bSize / this.balloon.height);
    if (this.y == null) this.y = (this.top + this.bottom) / 2;
    this.coinSize = Math.max(Math.min(70 * l.u, l.W * 0.13), 46 * l.dpr);
    this.speed = Math.max(Math.min(l.W * 0.33, 300 * l.u), 150 * l.dpr);
    this.fan = { x: hb.x, y: hb.y - hb.h * 0.15 };
  }

  begin() {
    // tutorial hand: press and HOLD (the ring pulses while held)
    this.s.time.delayedCall(300, () => {
      if (!this.s.handDismissed && this.playing) this.s.showHand({ type: 'hold', x: this.l.W * (this.l.W < this.l.H ? 0.66 : 0.6), y: (this.top + this.bottom) / 2 });
    });
  }

  onDown() {
    this.blowing = true;
  }

  onUp() {
    this.blowing = false;
  }

  spawn() {
    const img = this.img('icon-coin', this.coinSize, this.s.fx);
    // heights alternate high / low so the player has to steer
    const k = [0.15, 0.75, 0.35, 0.9, 0.5, 0.1, 0.65, 0.3, 0.85][this.spawned % 9];
    const y = this.top + (this.bottom - this.top) * k;
    img.setPosition(this.l.W + this.coinSize, y);
    this.coins.push({ img, x: img.x, y });
    this.spawned += 1;
  }

  update(dt) {
    this.t += dt;
    if (this.y == null) return;
    const u = this.u;
    const playing = this.playing;
    // physics: blowing → strong lift; idle → a slow sink; soft limits at top / bottom
    const acc = playing && this.blowing ? -900 * u : 420 * u;
    this.vy = clamp(this.vy + acc * dt, -360 * u, 240 * u);
    this.vy *= Math.exp(-1.6 * dt);
    this.y += this.vy * dt;
    if (this.y < this.top) [this.y, this.vy] = [this.top, Math.max(0, this.vy)];
    if (this.y > this.bottom) [this.y, this.vy] = [this.bottom, Math.min(0, this.vy)];
    const sway = Math.sin(this.t * 2.3) * 10 * u;
    this.balloon.setPosition(this.bx + sway, this.y).setAngle(Math.sin(this.t * 2.3) * 5 + this.vy * 0.02);
    // the string down towards the fan
    const g = this.string.clear();
    const sx = this.bx + sway;
    const sy = this.y + this.bSize * 0.5;
    g.lineStyle(2.5 * u, 0xffffff, 0.9).beginPath().moveTo(sx, sy);
    for (let i = 1; i <= 6; i++) g.lineTo(sx + Math.sin(this.t * 4 + i) * 6 * u, sy + i * 14 * u);
    g.strokePath();
    this.wind.setPosition(this.fan.x, this.fan.y);
    this.wind.frequency = playing && this.blowing ? 18 : 70;
    const h = this.s.hero;
    if (playing && this.blowing) h.setY(this.heroPose(this.l).y + Math.sin(this.t * 60) * 1.2 * u);
    if (!playing) return;
    this.next -= dt;
    if (this.next <= 0 && this.spawned < COINS) {
      this.spawn();
      this.next = rand(0.95, 1.15);
    }
    for (const c of this.coins) {
      c.x -= this.speed * dt;
      c.img.setPosition(c.x, c.y + Math.sin(this.t * 3 + c.x * 0.01) * 5 * u).setScale((this.coinSize / c.img.width) * (0.9 + 0.1 * Math.abs(Math.sin(this.t * 4 + c.x))), this.coinSize / c.img.width);
      if (c.done) continue;
      if (Math.abs(c.x - this.bx) < this.bSize * 0.5 && Math.abs(c.y - this.y) < this.bSize * 0.62) this.pick(c);
      else if (c.x < this.bx - this.bSize * 0.6) {
        c.done = true;
        this.missed += 1;
        this.s.tweens.add({ targets: c.img, alpha: 0, duration: 300, onComplete: () => c.img.destroy() });
        this.check();
      }
    }
    this.coins = this.coins.filter((c) => !c.done || c.img.active);
  }

  pick(c) {
    const s = this.s;
    c.done = true;
    this.got += 1;
    s.progress(Math.min(NEED, this.got));
    s.services.audio.play('coins');
    s.services.audio.tone([783.99, 880, 987.77, 1046.5, 1174.66, 1318.51][(this.got - 1) % 6], { gain: 0.26, dur: 0.3 });
    s.burst(c.x, c.y, [0xffd23f, 0xffffff], 10, 0.7);
    if (this.got % 2 === 0) s.flash(this.got >= NEED ? 'SKY HIGH!' : 'NICE!', c.x, c.y - 60 * this.u, '#FFE15A', '#B4501E');
    s.tweens.add({ targets: c.img, y: c.y - 50 * this.u, alpha: 0, scale: c.img.scale * 1.4, duration: 240, onComplete: () => c.img.destroy() });
    this.check();
  }

  check() {
    if (this.got >= NEED) this.s.time.delayedCall(350, () => this.end(true));
    else if (this.missed > COINS - NEED) this.s.time.delayedCall(350, () => this.end(false));
  }

  // bot: hold while the balloon is below the next coin's height (with a little lead)
  botWin() {
    const c = this.coins.filter((q) => !q.done && q.x > this.bx - this.bSize * 0.3).sort((a, b) => a.x - b.x)[0];
    const target = c ? c.y : (this.top + this.bottom) / 2;
    const predicted = this.y + this.vy * 0.18;
    return predicted > target ? this.pressAct(this.l.W * 0.6, this.l.H * 0.5) : { type: 'release' };
  }

  info() {
    return { got: this.got, missed: this.missed, blowing: this.blowing, balloonPx: this.bSize / this.l.dpr };
  }
}
