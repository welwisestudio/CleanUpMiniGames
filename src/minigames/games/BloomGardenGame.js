// Watering Can → Bloom the Garden (expansion 2026-10-16, Tap Targets: hold over a target). Four
// terracotta pots (generated sprite) wait with tiny sprouts. Hold the screen and the cleaned can
// follows your finger and pours; water a pot until its flower grows out of it and blooms. All four
// in 12 s win. The stream is wide and any pot under it counts.
import { BaseGame, Catcher, clamp } from '../systems/kit.js';

const POTS = 4;
const FILL = 0.85; // s of water per flower

export class BloomGardenGame extends BaseGame {
  constructor(shell) {
    super(shell, { ownsHero: true, time: 12 });
    this.can = new Catcher({ follow: 12 });
    this.pouring = false;
    this.bloomed = 0;
    this.pots = Array.from({ length: POTS }, (_, i) => {
      const img = this.s.add.image(0, 0, 'mg-pot');
      shell.fx.add(img);
      return { i, img, k: 0, done: false };
    });
    this.water = shell.add.particles(0, 0, 'fx-drop-1', { lifespan: 520, speedY: { min: 380, max: 480 }, speedX: { min: -40, max: 40 }, scale: { start: 0.35, end: 0.2 }, alpha: { start: 0.9, end: 0.4 }, tint: [0x9fdcff, 0xd8f3ff, 0x6fc0f0], frequency: 18, emitting: false });
    shell.fx.add(this.water);
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.4, 250 * l.u, l.H * 0.22);
    const f = this.field();
    const pour = this.pouring ? 1 : 0;
    return { x: (this.can?.x || l.W / 2) - size * 0.25, y: f.y0 + size * 0.45, size, angle: 22 * pour };
  }

  layout(l) {
    const f = this.field();
    const w = f.x1 - f.x0;
    this.potH = Math.min(w / POTS / 0.62, 230 * l.u, (f.y1 - f.y0) * 0.42);
    this.pots.forEach((p) => {
      p.x = f.x0 + w * ((p.i + 0.5) / POTS);
      p.y = f.y1 - this.potH * 0.5;
      p.img.setScale(this.potH / p.img.height).setPosition(p.x, p.y);
      this.drawPot(p);
    });
    this.can.min = f.x0 + w * 0.08;
    this.can.max = f.x1 - w * 0.08;
    if (!this.can.x) this.can.x = this.can.tx = l.W / 2;
    this.placeHero();
  }

  // the flower grows out of the pot: the art is revealed from the bottom up as it is watered
  drawPot(p) {
    const im = p.img;
    const vis = 0.4 + 0.6 * p.k;
    im.setCrop(0, im.height * (1 - vis), im.width, im.height * vis);
    im.setTint(p.done ? 0xffffff : 0xc9d6b4);
  }

  spout() {
    const h = this.s.hero;
    return { x: h.x + h.displayWidth * 0.42, y: h.y + h.displayHeight * (this.pouring ? 0.05 : -0.1) };
  }

  onDown(p) {
    this.pouring = true;
    this.can.aim(p.x);
  }

  onMove(p) {
    if (this.pouring) this.can.aim(p.x);
  }

  onUp() {
    this.pouring = false;
  }

  timeUp() {
    this.end(this.bloomed >= POTS);
  }

  update(dt) {
    this.t += dt;
    this.can.update(dt);
    if (this.s.state === 'play') {
      const p = this.heroPose(this.l);
      const h = this.s.hero;
      h.setPosition(p.x, p.y + Math.sin(this.t * 3) * 4 * this.u).setScale(this.s.heroScale(p.size));
      h.setAngle(h.angle + (p.angle - h.angle) * Math.min(1, dt * 12));
    }
    if (!this.playing) {
      this.water.stop();
      return;
    }
    this.tickClock(dt);
    const sp = this.spout();
    this.water.setPosition(sp.x, sp.y);
    if (this.pouring && !this.water.emitting) this.water.start();
    if (!this.pouring && this.water.emitting) this.water.stop();
    if (!this.pouring) return;
    const reach = this.potH * 0.42;
    for (const p of this.pots) {
      if (p.done || Math.abs(sp.x - p.x) > reach) continue;
      p.k = clamp(p.k + dt / FILL, 0, 1);
      this.drawPot(p);
      if (p.k >= 1) this.bloom(p);
    }
  }

  bloom(p) {
    const s = this.s;
    p.done = true;
    this.bloomed += 1;
    s.progress(this.bloomed);
    this.drawPot(p);
    const top = p.y - this.potH * 0.3;
    s.tweens.add({ targets: p.img, scale: p.img.scale * 1.12, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    s.burst(p.x, top, [0xff8fc4, 0xffd23f, 0xffffff, 0x7ad35a], 16, 0.9);
    s.puffs(p.x, top, { key: 'fx-sparkle', n: 5, size: 28, speed: 150, life: 650, rise: 60, alpha: 1 });
    s.flash(this.bloomed >= POTS ? 'IN FULL BLOOM!' : 'BLOOM!', p.x, top - 50 * this.u, '#FFE15A', '#B4501E');
    s.services.audio.play('place');
    s.services.audio.bell([783.99, 987.77, 1174.66, 1567.98][this.bloomed - 1], { gain: 0.38 });
    if (this.bloomed >= POTS) s.time.delayedCall(450, () => this.end(true));
  }

  botWin() {
    const p = this.pots.find((x) => !x.done);
    if (!p) return null;
    // the spout sits right of the can's centre: aim the can so the stream falls on the pot
    const h = this.s.hero;
    return this.pressAct(p.x + this.heroPose(this.l).size * 0.25 - h.displayWidth * 0.42, this.l.H * 0.55);
  }

  info() {
    return { bloomed: this.bloomed, pouring: this.pouring, growth: this.pots.map((p) => Math.round(p.k * 100) / 100) };
  }
}
