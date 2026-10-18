// Knight Armor → Shield Block (expansion 2026-10-16, Tap Targets: reaction left / right). The
// cleaned suit of armour stands guard; arrows (generated sprite) fly in from the left and the right,
// each announced by a "!" at the screen edge. Tap the LEFT or RIGHT half of the screen to raise a
// golden shield on that side — the arrow clangs off it. 8 arrows; 3 hits end it. The shield stays up
// for half a second, so an early tap still blocks.
import { BaseGame, rand } from '../systems/kit.js';
import { makeText } from '../../ui/text.js';
import { FONT_DISPLAY } from '../../ui/theme.js';

const ARROWS = 8;
const LIVES = 3;
const SHIELD = 0.55; // s

export class ShieldBlockGame extends BaseGame {
  constructor(shell) {
    super(shell);
    this.arrows = [];
    this.spawned = 0;
    this.blocked = 0;
    this.hits = 0;
    this.next = 0.9;
    this.shield = [0, 0]; // remaining time: left, right
    this.g = this.gfx(shell.fx);
    this.warn = [-1, 1].map(() => {
      const t = makeText(shell, 0, 0, '!', { size: 54, color: '#FFE15A', family: FONT_DISPLAY, weight: '900', stroke: '#B32F2F', strokeThickness: 9 }).setAlpha(0);
      shell.fx.add(t);
      return t;
    });
  }

  heroPose(l) {
    const size = Math.min(l.H * 0.52, 520 * l.u);
    const f = this.field();
    return { x: l.W / 2, y: (f.y0 + f.y1) / 2 + 20 * l.u, size, angle: 0 };
  }

  layout(l) {
    this.s.setLives(LIVES - this.hits, LIVES);
    const b = this.heroBox();
    this.cx = b.x;
    this.chestY = b.y0 + b.h * 0.36;
    this.reachX = Math.max(b.w * 0.75, 70 * l.u);
    this.shieldR = Math.max(b.h * 0.24, 70 * l.dpr);
    this.arrowLen = Math.max(Math.min(l.W * 0.3, 230 * l.u), 120 * l.dpr);
    this.speed = Math.max(Math.min(l.W * 0.42, 420 * l.u), 190 * l.dpr);
    this.warn.forEach((t, i) => t.setScale(l.u).setPosition(i === 0 ? l.margin + 30 * l.u : l.W - l.margin - 30 * l.u, this.chestY));
  }

  onDown(p) {
    if (!this.playing) return;
    const side = p.x < this.l.W / 2 ? 0 : 1;
    this.shield[side] = SHIELD;
    this.s.services.audio.noise({ dur: 0.12, freq: 1800, q: 2, gain: 0.18 });
  }

  spawn() {
    // random side, never three in a row from the same side
    let side = Math.random() < 0.5 ? 0 : 1;
    const last = this.arrows.slice(-2).map((a) => a.side);
    if (last.length === 2 && last[0] === last[1]) side = 1 - last[0];
    const img = this.img('mg-arrow', this.arrowLen, this.s.fx).setFlipX(side === 1);
    const y = this.chestY + rand(-0.15, 0.15) * this.shieldR;
    const x = side === 0 ? -this.arrowLen * 0.6 : this.l.W + this.arrowLen * 0.6;
    this.arrows.push({ img, side, x, y, warn: 0.45 });
    this.spawned += 1;
    this.warn[side].setAlpha(1).setScale(this.l.u * 0.6);
    this.s.tweens.add({ targets: this.warn[side], scale: this.l.u * 1.1, duration: 160, yoyo: true, repeat: 1, onComplete: () => this.warn[side].setAlpha(0) });
  }

  update(dt) {
    this.t += dt;
    if (!this.cx) return;
    const u = this.u;
    this.shield = this.shield.map((x) => Math.max(0, x - dt));
    const g = this.g.clear();
    // the shields: golden energy arcs either side of the knight
    [0, 1].forEach((side) => {
      const k = this.shield[side] / SHIELD;
      if (k <= 0) return;
      const x = this.cx + (side === 0 ? -1 : 1) * this.reachX * 0.62;
      const a0 = side === 0 ? Math.PI * 0.62 : -Math.PI * 0.38;
      const a1 = side === 0 ? Math.PI * 1.38 : Math.PI * 0.38;
      g.fillStyle(0xffd23f, 0.18 * k).fillCircle(x, this.chestY, this.shieldR);
      g.lineStyle(16 * u, 0xffd23f, 0.35 + 0.65 * k).beginPath().arc(side === 0 ? x + this.shieldR * 0.5 : x - this.shieldR * 0.5, this.chestY, this.shieldR, a0, a1).strokePath();
      g.lineStyle(5 * u, 0xffffff, 0.9 * k).beginPath().arc(side === 0 ? x + this.shieldR * 0.5 : x - this.shieldR * 0.5, this.chestY, this.shieldR * 0.92, a0, a1).strokePath();
    });
    if (!this.playing) return;
    this.next -= dt;
    if (this.next <= 0 && this.spawned < ARROWS) {
      this.spawn();
      this.next = rand(0.95, 1.2);
    }
    for (const a of this.arrows) {
      if (a.done) continue;
      if (a.warn > 0) {
        a.warn -= dt;
        continue;
      }
      const dir = a.side === 0 ? 1 : -1;
      a.x += dir * this.speed * dt;
      a.img.setPosition(a.x, a.y);
      const tip = a.x + dir * this.arrowLen * 0.5;
      const shieldX = this.cx - dir * this.reachX * 0.62;
      if ((dir > 0 && tip >= shieldX - this.shieldR * 0.2) || (dir < 0 && tip <= shieldX + this.shieldR * 0.2)) {
        if (this.shield[a.side] > 0) this.block(a, tip);
        else if ((dir > 0 && tip >= this.cx - this.reachX * 0.25) || (dir < 0 && tip <= this.cx + this.reachX * 0.25)) this.hit(a, tip);
      }
    }
    this.arrows = this.arrows.filter((a) => !a.done || a.img.active);
  }

  block(a, tip) {
    const s = this.s;
    a.done = true;
    this.blocked += 1;
    s.progress(Math.min(ARROWS - LIVES + 1, this.blocked));
    s.services.audio.play('chisel-hit');
    s.services.audio.bell(1760, { gain: 0.25, dur: 0.4 });
    s.burst(tip, a.y, [0xffd23f, 0xffffff, 0xffb347], 14, 0.9);
    s.ring(tip, a.y, 60 * this.u, 0xfff1b0, 260);
    s.flash(this.blocked % 3 === 0 ? 'PERFECT GUARD!' : 'CLANG!', tip, a.y - 80 * this.u, '#FFE15A', '#B4501E');
    const dir = a.side === 0 ? -1 : 1;
    s.tweens.add({ targets: a.img, x: a.x + dir * 120 * this.u, y: this.l.H + 80 * this.u, angle: dir * 300, duration: 700, ease: 'Quad.easeIn', onComplete: () => a.img.destroy() });
    this.check();
  }

  hit(a, tip) {
    const s = this.s;
    a.done = true;
    this.hits += 1;
    s.setLives(LIVES - this.hits, LIVES);
    s.services.audio.play('hit');
    s.shake(0.01, 180);
    s.flash('OUCH!', this.cx, this.chestY - this.shieldR * 1.2, '#FFFFFF', '#B32F2F');
    const h = s.hero;
    s.tweens.add({ targets: h, angle: a.side === 0 ? 5 : -5, duration: 70, yoyo: true, repeat: 1, onComplete: () => h.setAngle(0) });
    s.tweens.add({ targets: a.img, alpha: 0, duration: 400, delay: 200, onComplete: () => a.img.destroy() });
    void tip;
    this.check();
  }

  check() {
    if (this.hits >= LIVES) return this.s.time.delayedCall(450, () => this.end(false));
    if (this.blocked + this.hits >= ARROWS) this.s.time.delayedCall(450, () => this.end(true));
  }

  // bot: raise the shield on the side of the nearest arrow once it is close
  botWin() {
    const a = this.arrows.filter((q) => !q.done && q.warn <= 0).sort((p, q) => Math.abs(p.x - this.cx) - Math.abs(q.x - this.cx))[0];
    if (!a || this.shield[a.side] > 0.2) return null;
    const dist = Math.abs(a.x - this.cx) - this.arrowLen * 0.5 - this.reachX * 0.62;
    return dist < this.speed * 0.35 ? { ...this.tapAct(a.side === 0 ? this.l.W * 0.2 : this.l.W * 0.8, this.l.H * 0.6), wait: 40 } : null;
  }

  // wrong side every time
  botLose() {
    const a = this.arrows.filter((q) => !q.done && q.warn <= 0)[0];
    if (!a || this.shield[1 - a.side] > 0.2) return null;
    return { ...this.tapAct(a.side === 0 ? this.l.W * 0.8 : this.l.W * 0.2, this.l.H * 0.6), wait: 60 };
  }

  info() {
    return { blocked: this.blocked, hits: this.hits, spawned: this.spawned };
  }
}
