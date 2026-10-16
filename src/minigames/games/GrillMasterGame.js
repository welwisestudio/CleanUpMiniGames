// Garden Grill → Grill Master (expansion 2026-10-16, Timing system — one meter per food). Three
// sausages (generated sprite) sizzle on the cleaned grill; each browns over time and shows its own
// cook bar. Tap a sausage while its bar is in the green → PERFECT, it is served. Too early: "not
// yet" — it simply keeps cooking (no penalty). Left too long it burns (a miss). 6 sausages, 4
// perfect ones win. The whole grate area of a sausage is its hit zone.
import { BaseGame, lerpColor, rand } from '../systems/kit.js';

const TOTAL = 6;
const NEED = 4;
const GREEN = [0.6, 0.88];
const SLOTS = [0.34, 0.53, 0.72];

export class GrillMasterGame extends BaseGame {
  constructor(shell) {
    super(shell);
    this.res = [];
    this.spawned = 0;
    this.bars = this.gfx(shell.fx);
    this.slots = SLOTS.map((fx, i) => ({ fx, i, food: null, wait: 0.2 + i * 0.55 }));
    this.smoke = shell.add.particles(0, 0, 'mg-smoke', { lifespan: 1100, speed: { min: 6, max: 24 }, scale: { start: 0.06, end: 0.2 }, alpha: { start: 0.35, end: 0 }, gravityY: -50, emitting: false });
    shell.fx.add(this.smoke);
  }

  heroPose(l) {
    const size = Math.min(l.W * 1.25, 760 * l.u, l.H * 0.64); // the art is taller than wide
    return { x: l.W / 2, y: l.H - l.margin - 60 * l.u - size * 0.45, size, angle: 0 };
  }

  layout(l) {
    const b = this.heroBox();
    this.grateY = b.y0 + b.h * 0.4;
    this.slotW = b.w * 0.19;
    for (const s of this.slots) {
      s.x = b.x0 + b.w * s.fx;
      s.y = this.grateY;
      if (s.food) s.food.img.setPosition(s.x, s.y).setScale(this.slotW / s.food.img.width);
    }
  }

  place(slot) {
    const img = this.s.add.image(slot.x, slot.y - 60 * this.u, 'mg-sausage').setAngle(rand(-8, 8));
    img.setScale(this.slotW / img.width).setAlpha(0);
    this.s.fx.addAt(img, 0);
    this.s.tweens.add({ targets: img, y: slot.y, alpha: 1, duration: 220, ease: 'Bounce.easeOut' });
    slot.food = { img, cook: 0, rate: rand(0.27, 0.36), nudge: 0 };
    this.spawned += 1;
    this.s.services.audio.noise({ dur: 0.45, freq: 6000, q: 0.5, type: 'highpass', gain: 0.22 });
  }

  tint(c) {
    if (c < 0.7) return lerpColor(0xf2a99a, 0xffffff, c / 0.7);
    return lerpColor(0xffffff, 0x3b2a20, Math.min(1, (c - 0.7) / 0.4));
  }

  onDown(p) {
    if (!this.playing) return;
    const slot = this.slots.find((s) => s.food && Math.abs(p.x - s.x) < this.slotW * 0.6 && Math.abs(p.y - s.y) < this.slotW * 0.75);
    if (!slot) return;
    const f = slot.food;
    const s = this.s;
    if (f.cook < GREEN[0]) {
      f.nudge = 0.25;
      s.flash('NOT YET!', slot.x, slot.y - this.slotW * (0.7 + 0.4 * (slot.i % 2)), '#FFFFFF', '#8A4B1E');
      s.services.audio.play('ui-tap');
      return;
    }
    if (f.cook <= GREEN[1]) this.serve(slot);
    else this.burn(slot);
  }

  serve(slot) {
    const s = this.s;
    const f = slot.food;
    slot.food = null;
    slot.wait = 0.55;
    this.res.push('ok');
    this.pips();
    const perfect = Math.abs(f.cook - 0.74) < 0.08;
    s.flash(perfect ? 'PERFECT!' : 'TASTY!', slot.x, slot.y - this.slotW * (0.7 + 0.4 * (slot.i % 2)), '#FFE15A', '#B4501E');
    s.burst(slot.x, slot.y, [0xffd23f, 0xff8a3c, 0xffffff], 12, 0.9);
    s.services.audio.play('place');
    s.services.audio.tone([659.25, 783.99, 880, 1046.5][this.res.length % 4], { gain: 0.3, dur: 0.45 });
    s.tweens.add({ targets: f.img, y: f.img.y - 140 * this.u, scale: f.img.scale * 1.25, alpha: 0, angle: 0, duration: 360, ease: 'Quad.easeOut', onComplete: () => f.img.destroy() });
    this.bounceHero(1.03);
    this.check();
  }

  burn(slot) {
    const s = this.s;
    const f = slot.food;
    slot.food = null;
    slot.wait = 0.55;
    this.res.push('miss');
    this.pips();
    s.flash('BURNT!', slot.x, slot.y - this.slotW * (0.7 + 0.4 * (slot.i % 2)), '#FFFFFF', '#3B2A20');
    s.puffs(slot.x, slot.y, { n: 6, size: 60, speed: 90, life: 1100, rise: -90, alpha: 0.8, tint: 0x55504c });
    s.services.audio.noise({ dur: 0.5, freq: 900, to: 300, q: 0.7, gain: 0.45 });
    s.tweens.add({ targets: f.img, alpha: 0, scale: f.img.scale * 0.8, duration: 380, onComplete: () => f.img.destroy() });
    this.check();
  }

  pips() {
    this.s.setPips([...this.res, ...Array(TOTAL - this.res.length).fill(null)]);
  }

  check() {
    const ok = this.res.filter((x) => x === 'ok').length;
    if (ok >= NEED) this.s.time.delayedCall(350, () => this.end(true));
    else if (this.res.length - ok > TOTAL - NEED) this.s.time.delayedCall(350, () => this.end(false));
  }

  update(dt) {
    this.t += dt;
    const u = this.u;
    const g = this.bars.clear();
    if (!this.playing) return;
    for (const slot of this.slots) {
      if (!slot.food) {
        slot.wait -= dt;
        if (slot.wait <= 0 && this.spawned < TOTAL) this.place(slot);
        continue;
      }
      const f = slot.food;
      f.cook += f.rate * dt;
      f.nudge = Math.max(0, f.nudge - dt);
      f.img.setTint(this.tint(f.cook)).setY(slot.y + Math.sin(this.t * 30) * (f.nudge > 0 ? 3 * u : 0.6 * u));
      if (Math.random() < dt * 5) {
        this.smoke.setPosition(slot.x + rand(-0.3, 0.3) * this.slotW, slot.y);
        this.smoke.explode(1);
      }
      if (f.cook >= 1.05) {
        this.burn(slot);
        continue;
      }
      // the cook bar above the sausage
      const w = this.slotW * 0.9;
      const h = 13 * u;
      const x = slot.x - w / 2;
      const y = slot.y - this.slotW * 0.42 - h;
      g.fillStyle(0x000000, 0.3).fillRoundedRect(x - 3 * u, y - 3 * u + 2 * u, w + 6 * u, h + 6 * u, h);
      g.fillStyle(0xffffff, 1).fillRoundedRect(x - 3 * u, y - 3 * u, w + 6 * u, h + 6 * u, h);
      g.fillStyle(0xffd9c2, 1).fillRect(x, y, w, h);
      g.fillStyle(0x4fc84b, 1).fillRect(x + w * GREEN[0], y, w * (GREEN[1] - GREEN[0]), h);
      g.fillStyle(0x3b2a20, 1).fillRect(x + w * 0.95, y, w * 0.05, h);
      const k = Math.min(1, f.cook);
      g.fillStyle(0x2f4e8c, 1).fillRect(x + w * k - 2.5 * u, y - 5 * u, 5 * u, h + 10 * u);
      if (f.cook >= GREEN[0] && f.cook <= GREEN[1]) g.lineStyle(3 * u, 0x4fc84b, 0.5 + 0.5 * Math.sin(this.t * 16)).strokeCircle(slot.x, slot.y, this.slotW * 0.62);
    }
  }

  botWin() {
    const s = this.slots.find((x) => x.food && x.food.cook > GREEN[0] + 0.05 && x.food.cook < GREEN[1] - 0.06);
    return s ? this.tapAct(s.x, s.y) : null;
  }

  info() {
    return { served: this.res.filter((x) => x === 'ok').length, results: this.res, cooking: this.slots.map((s) => (s.food ? Math.round(s.food.cook * 100) / 100 : null)) };
  }
}
