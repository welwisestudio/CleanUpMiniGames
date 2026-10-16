// Game Controller → Simon Buttons (expansion 2026-10-16, Memory system: sequence). The cleaned
// controller floats above four big glossy buttons. Watch the buttons light up (each with its own
// note), then repeat the sequence. Three rounds (3 → 4 → 5 presses). A wrong press replays the
// round; the second mistake (or 6 s without input) ends the game.
import { BaseGame, Sequence } from '../systems/kit.js';
import { makeText } from '../../ui/text.js';
import { FONT_DISPLAY } from '../../ui/theme.js';

const COLORS = [0x4fc84b, 0xff5a5a, 0x45a3e6, 0xffd23f];
const DARK = [0x2c8a2a, 0xb32f2f, 0x2768a3, 0xc79a12];
const TONES = [392, 523.25, 659.25, 783.99];
const POS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // top, right, bottom, left
const LIVES = 2;
const IDLE = 6;

export class SimonButtonsGame extends BaseGame {
  constructor(shell) {
    super(shell, { ownsHero: true });
    this.seq = new Sequence({ pads: 4, rounds: [3, 4, 5] });
    this.padsG = this.gfx(shell.fx);
    this.lit = [0, 0, 0, 0];
    this.phase = 'wait';
    this.lives = LIVES;
    this.idle = 0;
    this.banner = makeText(shell, 0, 0, '', { size: 19, color: '#FFFFFF', family: FONT_DISPLAY, weight: '900', stroke: '#1E2A44', strokeThickness: 4 });
    shell.fx.add(this.banner);
  }

  heroPose(l) {
    const portrait = l.W < l.H;
    const size = Math.min(l.W * (portrait ? 0.6 : 0.34), 360 * l.u, l.H * 0.24);
    const f = this.field();
    return portrait ? { x: l.W / 2, y: f.y0 + size * 0.36 + 6 * l.u, size, angle: 0 } : { x: l.W * 0.27, y: l.H * 0.56, size, angle: 0 };
  }

  layout(l) {
    this.placeHero();
    const portrait = l.W < l.H;
    const f = this.field();
    const hb = this.heroBox();
    const top = portrait ? hb.y1 + 20 * l.u : f.y0;
    const avail = Math.min(f.y1 - top, portrait ? l.W * 0.92 : l.W * 0.5);
    this.R = Math.min(avail * 0.19, 92 * l.u);
    this.D = this.R * 1.32;
    this.cx = portrait ? l.W / 2 : l.W * 0.66;
    this.cy = portrait ? top + (f.y1 - top) / 2 : (f.y0 + f.y1) / 2 + 10 * l.u;
    this.pads = POS.map(([dx, dy]) => ({ x: this.cx + dx * this.D, y: this.cy + dy * this.D }));
    this.banner.setScale(l.u).setPosition(this.cx, this.cy);
  }

  begin() {
    this.s.time.delayedCall(500, () => this.show());
  }

  say(text, color = '#FFFFFF') {
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(this.l.u * 0.5);
    this.s.tweens.add({ targets: this.banner, scale: this.l.u, duration: 200, ease: 'Back.easeOut' });
  }

  show() {
    if (this.ended) return;
    this.phase = 'show';
    this.say('WATCH');
    const seq = this.seq.current;
    seq.forEach((p, i) => this.s.time.delayedCall(450 + i * 560, () => this.light(p, 0.4)));
    this.s.time.delayedCall(450 + seq.length * 560 + 150, () => {
      if (this.ended) return;
      this.phase = 'input';
      this.idle = 0;
      this.say('YOUR TURN!', '#FFE15A');
    });
  }

  light(p, dur = 0.3) {
    this.lit[p] = dur;
    this.s.services.audio.tone(TONES[p], { gain: 0.45, dur: 0.5 });
    const h = this.s.hero;
    this.s.tweens.add({ targets: h, angle: POS[p][0] * 4, duration: 70, yoyo: true, onComplete: () => h.setAngle(0) });
  }

  padAt(x, y) {
    return this.pads.findIndex((p) => Math.hypot(x - p.x, y - p.y) < this.R * 1.12);
  }

  onDown(ptr) {
    if (!this.playing || this.phase !== 'input') return;
    const p = this.padAt(ptr.x, ptr.y);
    if (p < 0) return;
    this.idle = 0;
    this.light(p);
    const r = this.seq.input(p);
    const s = this.s;
    if (r === 'wrong') return this.wrong();
    s.burst(this.pads[p].x, this.pads[p].y, [COLORS[p], 0xffffff], 8, 0.7);
    if (r === 'round' || r === 'done') {
      this.phase = 'wait';
      s.progress(this.seq.round);
      s.flash(r === 'done' ? 'GENIUS!' : 'GREAT!', this.cx, this.cy - this.D * 1.9, '#FFE15A', '#B4501E');
      s.services.audio.play('place');
      this.banner.setAlpha(0);
      if (r === 'done') return s.time.delayedCall(400, () => this.end(true));
      s.time.delayedCall(700, () => this.show());
    }
  }

  wrong() {
    const s = this.s;
    this.phase = 'wait';
    this.lives -= 1;
    s.services.audio.play('error');
    s.shake(0.006, 160);
    s.flash('OOPS!', this.cx, this.cy - this.D * 1.9, '#FFFFFF', '#B32F2F');
    if (this.lives <= 0) return s.time.delayedCall(500, () => this.end(false));
    this.say('AGAIN');
    s.time.delayedCall(900, () => this.show());
  }

  update(dt) {
    this.t += dt;
    if (this.phase === 'input' && this.playing) {
      this.idle += dt;
      if (this.idle > IDLE) this.wrong();
    }
    const u = this.u;
    const g = this.padsG.clear();
    if (!this.pads) return;
    // the base plate
    g.fillStyle(0x000000, 0.25).fillCircle(this.cx, this.cy + 8 * u, this.D + this.R * 1.25);
    g.fillStyle(0x3b3f52, 1).fillCircle(this.cx, this.cy, this.D + this.R * 1.25);
    g.fillStyle(0x4c5168, 1).fillCircle(this.cx, this.cy - 4 * u, this.D + this.R * 1.12);
    this.pads.forEach((p, i) => {
      this.lit[i] = Math.max(0, this.lit[i] - dt);
      const on = this.lit[i] > 0;
      const k = on ? 1 : 0;
      if (on) g.fillStyle(COLORS[i], 0.45).fillCircle(p.x, p.y, this.R * 1.35);
      g.fillStyle(0x000000, 0.35).fillCircle(p.x, p.y + 7 * u, this.R);
      g.fillStyle(DARK[i], 1).fillCircle(p.x, p.y + (on ? 3 : 0) * u, this.R);
      g.fillStyle(on ? 0xffffff : COLORS[i], on ? 0.35 + 0.65 * k : 1).fillCircle(p.x, p.y - (on ? 1 : 5) * u, this.R * 0.9);
      if (on) g.fillStyle(COLORS[i], 0.75).fillCircle(p.x, p.y - 1 * u, this.R * 0.82);
      g.fillStyle(0xffffff, 0.45).fillEllipse(p.x - this.R * 0.25, p.y - this.R * 0.42, this.R * 0.8, this.R * 0.34);
    });
  }

  botWin() {
    if (this.phase !== 'input' || this.lit.some((x) => x > 0.05)) return null;
    const p = this.pads[this.seq.expected];
    return { ...this.tapAct(p.x, p.y), wait: 220 };
  }

  botLose() {
    if (this.phase !== 'input' || this.lit.some((x) => x > 0.05)) return null;
    const p = this.pads[(this.seq.expected + 1) % 4];
    return { ...this.tapAct(p.x, p.y), wait: 220 };
  }

  info() {
    return { round: this.seq.round, phase: this.phase, lives: this.lives, padPx: (this.R * 2) / this.l.dpr };
  }
}
