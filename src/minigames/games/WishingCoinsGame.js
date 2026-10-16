// Stone Fountain → Wishing Coins (expansion 2026-10-16, Aim / Throw system). A glowing wish spot
// drifts across the cleaned fountain's water. Flick a gold coin (the game's coin art) up into it —
// the swipe's direction and length set where it lands, and the dotted guide shows the spot while
// you swipe. The coin flips through the air and plops in. 5 coins, 3 wishes win.
import { BaseGame, Swipe, arcPoint, drawGuide, clamp } from '../systems/kit.js';

const COINS = 5;
const NEED = 3;
const FLIGHT = 0.6;
const POOL = { x: 0.5, y: 0.45, rx: 0.27 }; // the lower basin's water (hero box fractions)

export class WishingCoinsGame extends BaseGame {
  constructor(shell) {
    super(shell, { time: 16 });
    this.swipe = new Swipe({ minLen: 30 });
    this.spotG = this.gfx(shell.fx);
    this.guide = this.gfx(shell.fx);
    this.coin = this.img('icon-coin', 100, shell.fx);
    this.res = [];
    this.fly = null;
    this.drift = 0;
  }

  heroPose(l) {
    const size = Math.min(l.H * 0.56, 560 * l.u, l.W * 0.95);
    const f = this.field();
    return { x: l.W / 2, y: f.y0 + size * 0.48, size, angle: 0 };
  }

  layout(l) {
    const b = this.heroBox();
    this.pool = { x: b.x0 + b.w * POOL.x, y: b.y0 + b.h * POOL.y, rx: b.w * POOL.rx };
    this.spotR = Math.max(b.w * 0.085, 40 * l.dpr);
    this.coinSize = Math.max(Math.min(76 * l.u, l.W * 0.15), 48 * l.dpr);
    this.coin.setScale(this.coinSize / this.coin.width);
    this.home = { x: l.W / 2, y: this.field().y1 - this.coinSize * 0.5 };
    if (!this.fly) this.coin.setPosition(this.home.x, this.home.y);
    this.reach = l.H * 0.9;
  }

  spot(t = this.t) {
    return { x: this.pool.x + Math.sin(t * 0.8 + this.drift) * this.pool.rx * 0.8, y: this.pool.y };
  }

  // flick: the coin flies along the swipe, ~2.6× its length
  target(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    const dist = clamp(len * 2.6, 60 * this.u, this.reach);
    return { x: this.home.x + (dx / len) * dist, y: this.home.y + (dy / len) * dist };
  }

  onDown(p) {
    if (!this.fly && this.playing) this.swipe.down(p);
  }

  onMove(p) {
    this.swipe.move(p);
  }

  onUp(p) {
    if (this.fly || !this.playing) return;
    const sw = this.swipe.up(p, this.u);
    if (!sw || sw.dy > -15 * this.u) return;
    const q = this.target(sw.dx, sw.dy);
    const hit = this.spotHit(q, this.spot(this.t + FLIGHT));
    this.fly = { ...q, k: 0, hit };
    this.s.services.audio.play('coins');
  }

  update(dt) {
    this.t += dt;
    const u = this.u;
    if (!this.fly) this.tickClock(dt);
    const g = this.spotG.clear();
    if (this.pool && this.playing) {
      const sp = this.spot();
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 6);
      g.fillStyle(0xfff1b0, 0.25 + 0.15 * pulse).fillEllipse(sp.x, sp.y, this.spotR * 2.6, this.spotR * 1.1);
      g.lineStyle(4 * u, 0xffe15a, 0.9).strokeEllipse(sp.x, sp.y, this.spotR * 2.2 * (0.9 + 0.1 * pulse), this.spotR * 0.9 * (0.9 + 0.1 * pulse));
      g.lineStyle(2 * u, 0xffffff, 0.8).strokeEllipse(sp.x, sp.y, this.spotR * 1.2, this.spotR * 0.45);
    }
    const gg = this.guide.clear();
    if (this.swipe.active && !this.fly && this.playing) {
      const a = this.swipe.active;
      if (a.y0 - a.y > 12 * u) {
        const q = this.target(a.x - a.x0, a.y - a.y0);
        drawGuide(gg, this.home.x, this.home.y, q.x, q.y, 110 * u, u, 0xffe9a0, 14);
        gg.lineStyle(3 * u, 0xffffff, 0.9).strokeEllipse(q.x, q.y, this.coinSize * 1.2, this.coinSize * 0.45);
      }
    }
    if (!this.fly || this.fly === 'done') return;
    const f = this.fly;
    f.k += dt / FLIGHT;
    const k = Math.min(1, f.k);
    if (f.hit) Object.assign(f, this.spot(this.t + (1 - k) * FLIGHT));
    const q = arcPoint(this.home.x, this.home.y, f.x, f.y, k, 110 * u);
    // the coin flips (scaleY) and shrinks with distance
    const base = (this.coinSize / this.coin.width) * (1 - 0.35 * k);
    this.coin.setPosition(q.x, q.y).setScale(base, base * Math.cos(k * Math.PI * 6));
    if (k >= 1) this.land(f);
  }

  land(f) {
    const s = this.s;
    this.fly = 'done';
    const sp = this.spot();
    const hit = f.hit;
    this.res.push(hit ? 'ok' : 'miss');
    s.setPips([...this.res, ...Array(COINS - this.res.length).fill(null)]);
    const inWater = Math.abs(f.y - this.pool.y) < this.spotR * 1.6 && Math.abs(f.x - this.pool.x) < this.pool.rx * 1.1;
    if (inWater) {
      s.ring(f.x, f.y, this.coinSize, 0xdff6ff, 380);
      s.burst(f.x, f.y, [0xbfe9ff, 0xffffff], 10, 0.6);
      s.services.audio.noise({ dur: 0.3, freq: 1800, to: 600, q: 0.8, gain: 0.35 });
    }
    // the coin sinks where it landed (the centre of the spot on a wish)
    s.tweens.add({ targets: this.coin, y: f.y + 6 * this.u, scaleX: this.coin.scaleX * 0.5, scaleY: Math.abs(this.coin.scaleX) * 0.25, alpha: 0, duration: 320, ease: 'Quad.easeIn' });
    if (hit) {
      s.flash('WISH GRANTED!', sp.x, sp.y - this.spotR * 2, '#FFE15A', '#B4501E');
      s.puffs(sp.x, sp.y, { key: 'fx-sparkle', n: 7, size: 30, speed: 180, life: 750, rise: -40, alpha: 1 });
      s.burst(sp.x, sp.y, [0xffd23f, 0xffffff, 0xff9ce0], 16, 0.9);
      s.services.audio.bell([1318.51, 1567.98, 2093][Math.min(2, this.res.filter((x) => x === 'ok').length - 1)], { gain: 0.45, dur: 1.4 });
      this.drift += 2.1; // the spot jumps elsewhere
    } else {
      s.flash(inWater ? 'PLOP!' : 'MISS', f.x, f.y - 50 * this.u, '#FFFFFF', '#5C6B85');
      if (!inWater) s.services.audio.play('hit');
    }
    const ok = this.res.filter((x) => x === 'ok').length;
    if (ok >= NEED) return s.time.delayedCall(600, () => this.end(true));
    if (this.res.length - ok > COINS - NEED) return s.time.delayedCall(600, () => this.end(false));
    s.time.delayedCall(550, () => {
      this.coin.setPosition(this.home.x, this.home.y + 100 * this.u).setAlpha(1).setScale(this.coinSize / this.coin.width);
      s.tweens.add({ targets: this.coin, y: this.home.y, duration: 200, ease: 'Back.easeOut', onComplete: () => (this.fly = null) });
    });
  }

  spotHit(p, c) {
    return Math.hypot(p.x - c.x, (p.y - c.y) * 2.2) < this.spotR * 1.45;
  }

  timeUp() {
    this.end(false);
  }

  botWin() {
    if (this.fly || this.swipe.active) return null;
    const q = this.spot(this.t + 0.2 + FLIGHT);
    const dx = q.x - this.home.x;
    const dy = q.y - this.home.y;
    const d = Math.hypot(dx, dy);
    const len = d / 2.6;
    return { ...this.dragAct(this.home.x, this.home.y, this.home.x + (dx / d) * len, this.home.y + (dy / d) * len, 6), wait: 120 };
  }

  botLose() {
    if (this.fly || this.swipe.active) return null;
    // a weak flick: the coin drops short of the basin
    return { ...this.dragAct(this.home.x, this.home.y, this.home.x, this.home.y - 34 * this.u, 4), wait: 120 };
  }

  info() {
    return { coins: this.res.length, wishes: this.res.filter((x) => x === 'ok').length };
  }
}
