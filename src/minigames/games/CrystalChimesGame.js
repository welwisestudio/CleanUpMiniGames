// Chandelier → Crystal Chimes (expansion 2026-10-16, Rhythm system). Sparkling crystal drops
// (generated sprite) fall from the cleaned chandelier down three glowing lanes; tap the ring when a
// crystal reaches it — each catch rings a glass chime of a little melody. 10 crystals, 7 win.
// Same forgiving timing as Piano Notes (wide window, slow fall, lanes never overlap).
import { BaseGame, Rhythm } from '../systems/kit.js';

const SEQ = [1, 0, 2, 1, 2, 0, 1, 0, 2, 1];
const MELODY = [1046.5, 1174.66, 1318.51, 1567.98, 1318.51, 1174.66, 1567.98, 1760, 1567.98, 2093];
const NEED = 7;
const COLORS = [0x9fe6ff, 0xe3c4ff, 0xfff1b0];

export class CrystalChimesGame extends BaseGame {
  constructor(shell) {
    super(shell);
    this.lanesG = this.gfx(shell.fx);
    this.layer = shell.add.container(0, 0);
    shell.fx.add(this.layer);
    this.flashes = [0, 0, 0];
    this.rh = new Rhythm(this, {
      seq: SEQ,
      spawn: 0.72,
      fall: 1.7,
      lead: 0.7,
      window: 110,
      perfect: 40,
      make: (lane) => {
        const img = this.s.add.image(0, 0, 'mg-crystal').setTint(COLORS[lane]);
        img.setScale(this.crystal / Math.max(img.width, img.height)).setAlpha(0);
        this.s.tweens.add({ targets: img, alpha: 1, duration: 200 });
        this.layer.add(img);
        this.bounceHero(1.02);
        return img;
      },
      onHit: (n, perfect) => this.hit(n, perfect),
      onMiss: (n) => {
        n.img.setTint(0x8c93a3);
        this.s.tweens.add({ targets: n.img, alpha: 0, duration: 300, onComplete: () => n.img.destroy() });
        this.s.flash('miss', this.rh.lanes[n.lane], this.rh.hitY + this.r * 1.7, '#D6DCE8', '#5C6B85');
        this.check();
      },
    });
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.7, 400 * l.u, l.H * 0.32);
    return { x: l.W / 2, y: this.field().y0 + size * 0.42, size, angle: 0 };
  }

  layout(l) {
    const b = this.heroBox();
    const spread = Math.min(l.W * 0.29, 170 * l.u);
    this.r = Math.min(40 * l.u, spread * 0.36);
    this.crystal = this.r * 1.9;
    this.rh.setGeometry([-1, 0, 1].map((k) => l.W / 2 + k * spread), b.y1 - b.h * 0.12, l.H - l.margin - 130 * l.u);
  }

  lane(x) {
    const L = this.rh.lanes;
    let best = -1;
    let bd = Infinity;
    L.forEach((lx, i) => {
      const d = Math.abs(x - lx);
      if (d < bd) [best, bd] = [i, d];
    });
    return bd < (L[1] - L[0]) * 0.6 ? best : -1;
  }

  onDown(p) {
    if (!this.playing) return;
    const i = this.lane(p.x);
    if (i < 0) return;
    this.flashes[i] = 0.3;
    if (!this.rh.tap(i)) this.s.services.audio.play('ui-tap');
  }

  hit(n, perfect) {
    const s = this.s;
    const x = this.rh.lanes[n.lane];
    const y = this.rh.hitY;
    s.progress(Math.min(NEED, this.rh.hits));
    s.services.audio.bell(MELODY[n.id], { gain: 0.42, dur: 1.2 });
    s.burst(x, y, [COLORS[n.lane], 0xffffff], perfect ? 18 : 12, 0.8);
    s.puffs(x, y, { key: 'fx-sparkle', n: perfect ? 6 : 4, size: 26, speed: 160, life: 600, rise: 80, alpha: 1 });
    s.ring(x, y, this.r * 2.3, COLORS[n.lane], 360);
    s.flash(perfect ? 'PERFECT!' : 'CHIME!', x, y - this.r * 2.4, '#FFFFFF', perfect ? '#B4501E' : '#5B2A9A');
    s.tweens.add({ targets: n.img, scale: n.img.scale * 1.6, alpha: 0, duration: 220, onComplete: () => n.img.destroy() });
    this.check();
  }

  check() {
    if (this.rh.hits >= NEED) this.s.time.delayedCall(350, () => this.end(true));
    else if (this.rh.judged - this.rh.hits > SEQ.length - NEED) this.s.time.delayedCall(350, () => this.end(false));
  }

  update(dt) {
    this.t += dt;
    if (this.playing) this.rh.update(dt);
    for (const n of this.rh.items) if (!n.hit) n.img.setAngle(Math.sin((this.t + n.id) * 4) * 8);
    if (!this.rh.lanes) return;
    const u = this.u;
    const g = this.lanesG.clear();
    this.rh.lanes.forEach((x, i) => {
      const w = this.r * 1.5;
      g.fillStyle(COLORS[i], 0.13).fillRoundedRect(x - w / 2, this.rh.topY, w, this.rh.hitY - this.rh.topY, w / 2);
      this.flashes[i] = Math.max(0, this.flashes[i] - dt);
      const f = this.flashes[i] * 3.3;
      g.fillStyle(COLORS[i], 0.25 + 0.35 * f).fillCircle(x, this.rh.hitY, this.r * (1.45 + 0.35 * f));
      g.fillStyle(0x1a2a4a, 0.55).fillCircle(x, this.rh.hitY, this.r);
      g.lineStyle(6 * u, COLORS[i], 1).strokeCircle(x, this.rh.hitY, this.r);
      g.lineStyle(2 * u, 0xffffff, 0.9).strokeCircle(x, this.rh.hitY, this.r * 0.62);
    });
  }

  botWin() {
    const n = this.rh.ready(36);
    return n ? { ...this.tapAct(this.rh.lanes[n.lane], this.rh.hitY), wait: 30 } : null;
  }

  info() {
    return { hits: this.rh.hits, judged: this.rh.judged, notes: SEQ.length };
  }
}
