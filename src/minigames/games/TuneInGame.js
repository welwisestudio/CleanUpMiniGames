// Retro Radio → Tune In (expansion 2026-10-16, Timing system). A vintage tuning dial glows above
// the cleaned radio; the gold needle sweeps across the band and a station glows green somewhere on
// it. Tap to stop the needle on the station — music pours out of the radio (notes fly out, a
// little tune plays). Off-station: static. 4 stations, 3 tuned win. Three idle sweeps = a miss.
import { BaseGame, Meter, rand } from '../systems/kit.js';
import { makeText } from '../../ui/text.js';
import { FONT_DISPLAY } from '../../ui/theme.js';

const ROUNDS = 4;
const NEED = 3;
const TUNES = [[523.25, 659.25, 783.99], [587.33, 739.99, 880], [659.25, 783.99, 987.77], [698.46, 880, 1046.5]];
const COLORS = [0xff6fa8, 0x45a3e6, 0xffd23f, 0x4fc84b];

export class TuneInGame extends BaseGame {
  constructor(shell) {
    super(shell);
    this.meter = new Meter({ speed: 0.55, center: rand(0.25, 0.75), width: 0.16, perfect: 0.45 });
    this.dial = this.gfx(shell.fx);
    this.labels = [88, 92, 96, 100, 104, 108].map((n) => {
      const t = makeText(shell, 0, 0, String(n), { size: 15, color: '#5A3A22', family: FONT_DISPLAY, weight: '900' });
      shell.fx.add(t);
      return t;
    });
    this.res = [];
    this.hold = 0;
    this.sweeps = 0;
    this.lastDir = 1;
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.9, 560 * l.u, l.H * 0.38);
    return { x: l.W / 2, y: l.H - l.margin - 80 * l.u - size * 0.33, size, angle: 0 };
  }

  layout(l) {
    const b = this.heroBox();
    const f = this.field();
    this.dw = Math.min(l.W * 0.86, 520 * l.u);
    this.dh = Math.max(84 * l.u, 70 * l.dpr);
    this.dx = l.W / 2 - this.dw / 2;
    this.dy = Math.max(f.y0 + 10 * l.u, Math.min(b.y0 - this.dh - 40 * l.u, (f.y0 + b.y0) / 2 - this.dh / 2));
    this.labels.forEach((t, i) => t.setScale(l.u).setPosition(this.dx + this.dw * (0.08 + i * 0.168), this.dy + this.dh * 0.8));
    this.speaker = { x: b.x0 + b.w * 0.3, y: b.y0 + b.h * 0.45 };
  }

  onDown() {
    if (!this.playing || this.hold > 0) return;
    this.lock(this.meter.judge());
  }

  lock(j) {
    const s = this.s;
    this.meter.frozen = true;
    this.hold = 1.1;
    this.res.push(j ? 'ok' : 'miss');
    s.setPips([...this.res, ...Array(ROUNDS - this.res.length).fill(null)]);
    const nx = this.dx + this.dw * this.meter.pos;
    if (j) {
      const tune = TUNES[(this.res.length - 1) % TUNES.length];
      tune.forEach((f, i) => s.time.delayedCall(i * 150, () => s.services.audio.tone(f, { gain: 0.38, dur: 0.5 })));
      s.flash(j === 'perfect' ? 'CRYSTAL CLEAR!' : 'ON AIR!', nx, this.dy - 34 * this.u, '#FFE15A', '#B4501E');
      // music notes float out of the speaker
      for (let i = 0; i < 6; i++) {
        const n = this.img('mg-note', 46 * this.u, s.fx).setTint(COLORS[i % 4]).setPosition(this.speaker.x, this.speaker.y);
        s.tweens.add({ targets: n, x: this.speaker.x + rand(-180, 180) * this.u, y: this.speaker.y - rand(140, 260) * this.u, angle: rand(-40, 40), alpha: 0, duration: 1100, delay: i * 90, ease: 'Quad.easeOut', onComplete: () => n.destroy() });
      }
      this.bounceHero(1.04);
    } else {
      s.services.audio.noise({ dur: 0.6, freq: 3000, q: 0.3, gain: 0.4 });
      s.flash('STATIC...', nx, this.dy - 34 * this.u, '#FFFFFF', '#5C6B85');
      s.shake(0.004, 160);
    }
    const ok = this.res.filter((x) => x === 'ok').length;
    if (ok >= NEED) return s.time.delayedCall(900, () => this.end(true));
    if (this.res.length - ok > ROUNDS - NEED) return s.time.delayedCall(700, () => this.end(false));
    s.time.delayedCall(1000, () => {
      let c;
      do c = rand(0.15, 0.85);
      while (Math.abs(c - this.meter.center) < 0.25);
      this.meter.setZone(c, Math.max(0.12, 0.16 - this.res.length * 0.01));
      this.meter.speed = 0.55 + this.res.length * 0.06;
      this.sweeps = 0;
      this.meter.frozen = false;
    });
  }

  update(dt) {
    this.t += dt;
    this.hold = Math.max(0, this.hold - dt);
    this.meter.update(dt);
    if (this.meter.dir !== this.lastDir) {
      this.lastDir = this.meter.dir;
      this.sweeps += 1;
      if (this.playing && !this.meter.frozen && this.sweeps >= 3) this.lock(null);
    }
    if (!this.dw) return;
    const u = this.u;
    const g = this.dial.clear();
    const { dx: x, dy: y, dw: w, dh: h } = this;
    // wooden frame + glowing cream glass
    g.fillStyle(0x000000, 0.3).fillRoundedRect(x - 12 * u, y - 12 * u + 6 * u, w + 24 * u, h + 24 * u, 22 * u);
    g.fillStyle(0x8a4b1e, 1).fillRoundedRect(x - 12 * u, y - 12 * u, w + 24 * u, h + 24 * u, 22 * u);
    g.fillStyle(0xb5703a, 1).fillRoundedRect(x - 6 * u, y - 6 * u, w + 12 * u, h + 12 * u, 17 * u);
    g.fillStyle(0xfff3d6, 1).fillRoundedRect(x, y, w, h, 12 * u);
    g.fillStyle(0xffffff, 0.5).fillRoundedRect(x + 6 * u, y + 5 * u, w - 12 * u, h * 0.22, 8 * u);
    // the station: a glowing green band
    const [z0, z1] = this.meter.zone;
    const pulse = 0.6 + 0.4 * Math.sin(this.t * 7);
    g.fillStyle(0x4fc84b, 0.35 + 0.25 * pulse).fillRoundedRect(x + w * z0, y + 4 * u, w * (z1 - z0), h - 8 * u, 8 * u);
    g.lineStyle(3 * u, 0x2c8a2a, 1).strokeRoundedRect(x + w * z0, y + 4 * u, w * (z1 - z0), h - 8 * u, 8 * u);
    // ticks
    for (let i = 0; i <= 40; i++) {
      const tx = x + w * (0.04 + (i / 40) * 0.92);
      const big = i % 4 === 0;
      g.lineStyle((big ? 3 : 1.6) * u, 0x5a3a22, 0.9).lineBetween(tx, y + h * 0.18, tx, y + h * (big ? 0.5 : 0.36));
    }
    // needle
    const nx = x + w * this.meter.pos;
    g.fillStyle(0x000000, 0.25).fillRect(nx - 3 * u + 3 * u, y - 10 * u + 3 * u, 6 * u, h + 20 * u);
    g.fillStyle(0xd8342c, 1).fillRect(nx - 3 * u, y - 10 * u, 6 * u, h + 20 * u);
    g.fillStyle(0xffd23f, 1).fillCircle(nx, y - 10 * u, 8 * u).fillCircle(nx, y + h + 10 * u, 8 * u);
  }

  botWin() {
    return this.hold <= 0 && !this.meter.frozen && this.meter.safe(0.5) ? this.tapAct(this.l.W / 2, this.l.H * 0.5) : null;
  }

  botLose() {
    return this.hold <= 0 && !this.meter.frozen && this.meter.dist() > this.meter.width * 1.4 ? this.tapAct(this.l.W / 2, this.l.H * 0.5) : null;
  }

  info() {
    return { tuned: this.res.filter((x) => x === 'ok').length, rounds: this.res.length, needle: this.meter.pos };
  }
}
