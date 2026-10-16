// Keyboard → Key Rush (expansion 2026-10-16, Tap Targets). Keys of the cleaned keyboard pop up as
// big glowing keycaps with a letter and a shrinking timer ring — tap them before they sink back.
// 12 keys, 8 hits win (5 misses end it). Caps are large on purpose (phone-first): a cap covers a
// whole block of the keyboard, never a single tiny key.
import { BaseGame, Targets, rand } from '../systems/kit.js';
import { makeText } from '../../ui/text.js';
import { FONT_DISPLAY } from '../../ui/theme.js';

const TOTAL = 12;
const NEED = 8;
const LIFE = 1.55;
const EVERY = 0.62;
const LETTERS = 'CLEANSHINYWOW';
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export class KeyRushGame extends BaseGame {
  constructor(shell) {
    super(shell);
    this.spawned = 0;
    this.hits = 0;
    this.misses = 0;
    this.next = 0.5;
    this.lastCell = -1;
    this.targets = new Targets(this, { hitScale: 1.2, onExpire: (t) => this.expire(t) });
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.96, 680 * l.u);
    return { x: l.W / 2, y: l.H * (l.W < l.H ? 0.58 : 0.6), size, angle: 0 };
  }

  layout(l) {
    const b = this.heroBox();
    // 4 × 2 blocks over the key area of the art
    this.cells = [];
    this.cap = Math.max(Math.min(b.w * 0.2, 132 * l.u), 64 * l.dpr);
    const lo = l.margin + this.cap * 0.8;
    const hi = l.W - l.margin - this.cap * 0.8;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) this.cells.push({ x: Math.max(lo, Math.min(hi, b.x0 + b.w * (0.17 + c * 0.22))), y: b.y0 + b.h * (0.34 + r * 0.3) });
  }

  spawn() {
    let cell;
    do cell = Math.floor(Math.random() * this.cells.length);
    while (cell === this.lastCell || this.targets.list.some((t) => t.cell === cell));
    this.lastCell = cell;
    const p = this.cells[cell];
    const c = this.s.add.container(p.x, p.y);
    const g = this.s.add.graphics();
    const letter = makeText(this.s, 0, -this.cap * 0.08, LETTERS[this.spawned % LETTERS.length], { size: Math.round(this.cap * 0.42), color: '#5B3FA0', family: FONT_DISPLAY, weight: '900' });
    c.add([g, letter]);
    this.s.fx.add(c);
    c.setScale(0.2);
    this.s.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.targets.add({ x: p.x, y: p.y, r: this.cap * 0.55, life: LIFE, cell, c, g, letter, idx: this.spawned });
    this.spawned += 1;
  }

  drawCap(t) {
    const u = this.u;
    const s = this.cap;
    const k = 1 - t.age / t.life;
    const g = t.g.clear();
    g.fillStyle(0xb69cff, 0.35 + 0.25 * Math.sin(t.age * 14)).fillCircle(0, 0, s * 0.78);
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-s / 2, -s / 2 + 8 * u, s, s, s * 0.2);
    g.fillStyle(0xc9b8f2, 1).fillRoundedRect(-s / 2, -s / 2, s, s, s * 0.2);
    g.fillStyle(0xfdfbff, 1).fillRoundedRect(-s * 0.42, -s * 0.47, s * 0.84, s * 0.78, s * 0.16);
    g.fillStyle(0xffffff, 0.8).fillRoundedRect(-s * 0.34, -s * 0.42, s * 0.5, s * 0.12, s * 0.06);
    // timer ring
    g.lineStyle(6 * u, 0xffffff, 0.5).strokeCircle(0, 0, s * 0.72);
    g.lineStyle(6 * u, k > 0.35 ? 0x4fc84b : 0xff8a3c, 1).beginPath().arc(0, 0, s * 0.72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
  }

  expire(t) {
    this.misses += 1;
    this.s.tweens.add({ targets: t.c, scale: 0.3, alpha: 0, duration: 180, onComplete: () => t.c.destroy() });
    this.s.flash('miss', t.x, t.y - this.cap * 0.7, '#D6DCE8', '#5C6B85');
    this.check();
  }

  onDown(p) {
    if (!this.playing) return;
    const t = this.targets.hit(p.x, p.y);
    if (!t) return;
    const s = this.s;
    this.hits += 1;
    s.progress(Math.min(NEED, this.hits));
    s.services.audio.play('ui-tap');
    s.services.audio.tone(NOTES[this.hits % NOTES.length], { gain: 0.35, dur: 0.4 });
    // the cap clicks down and pops
    s.tweens.add({ targets: t.c, scaleY: 0.75, duration: 60, yoyo: true, onComplete: () => s.tweens.add({ targets: t.c, scale: 1.3, alpha: 0, duration: 160, onComplete: () => t.c.destroy() }) });
    s.burst(t.x, t.y, [0xb69cff, 0xffffff, 0xffd23f], 12, 0.85);
    s.ring(t.x, t.y, this.cap * 0.9, 0xb69cff, 300);
    if (t.age < LIFE * 0.4) s.flash('FAST!', t.x, t.y - this.cap * 0.75, '#FFE15A', '#5B2A9A');
    this.check();
  }

  check() {
    if (this.hits >= NEED) this.s.time.delayedCall(300, () => this.end(true));
    else if (this.misses > TOTAL - NEED) this.s.time.delayedCall(300, () => this.end(false));
  }

  update(dt) {
    this.t += dt;
    if (!this.playing) return;
    this.targets.update(dt);
    for (const t of this.targets.list) this.drawCap(t);
    this.next -= dt;
    if (this.next <= 0 && this.spawned < TOTAL && this.targets.list.length < 2) {
      this.spawn();
      this.next = EVERY * rand(0.85, 1.15);
    }
  }

  botWin() {
    const t = this.targets.list.find((x) => x.age > 0.12 && x.age < LIFE - 0.25);
    return t ? this.tapAct(t.x, t.y) : null;
  }

  info() {
    return { hits: this.hits, misses: this.misses, spawned: this.spawned, capPx: this.cap / this.l.dpr };
  }
}
