// Bathtub → Bubble Pop (expansion 2026-10-16, Tap Targets). Rainbow soap bubbles (generated
// sprite, additive glow) rise out of the cleaned tub, wobbling — tap to pop them. Every so often a
// rubber duck (generated sprite) floats up inside a big bubble: worth 3. 15 points in 11 s win.
// Bubbles are large and slow; escaping bubbles cost nothing.
import { BaseGame, Targets, rand } from '../systems/kit.js';

const GOAL = 15;
const PIP = 3; // points per pip

export class BubblePopGame extends BaseGame {
  constructor(shell) {
    super(shell, { time: 11 });
    this.score = 0;
    this.next = 0.15;
    this.n = 0;
    this.targets = new Targets(this, { hitScale: 1.15, onExpire: (t) => t.c.destroy() });
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.92, 560 * l.u, l.H * 0.4);
    return { x: l.W / 2, y: l.H - l.margin - 60 * l.u - size * 0.3, size, angle: 0 };
  }

  layout() {
    this.b = this.heroBox();
  }

  spawn() {
    const s = this.s;
    const u = this.u;
    const duck = this.n % 6 === 4;
    const b = this.b;
    const size = Math.max(Math.min(this.l.W * 0.2, 120 * u), 62 * this.l.dpr) * (duck ? 1.45 : rand(0.85, 1.15));
    const x = b.x0 + b.w * rand(0.2, 0.8);
    const y = b.y0 + b.h * 0.3;
    const c = s.add.container(x, y);
    const parts = [];
    if (duck) parts.push(fitImg(s.add.image(0, size * 0.04, 'mg-duck'), size * 0.62));
    const bub = fitImg(s.add.image(0, 0, 'mg-bubble'), size).setBlendMode('ADD');
    parts.push(bub);
    c.add(parts);
    s.fx.add(c);
    c.setScale(0.3);
    s.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.easeOut' });
    const vy = -rand(105, 150) * u;
    const phase = rand(0, 6);
    this.targets.add({
      x, y, r: size * 0.5, c, duck, life: 9,
      update: (t, dt) => {
        t.y += vy * dt;
        t.x += Math.sin(t.age * 2.4 + phase) * 40 * u * dt;
        t.c.setPosition(t.x, t.y).setAngle(Math.sin(t.age * 3 + phase) * 6);
        if (t.y < this.field().y0 - size * 0.2) t.age = t.life; // floated away
      },
    });
    this.n += 1;
  }

  onDown(p) {
    if (!this.playing) return;
    const t = this.targets.hit(p.x, p.y);
    if (!t) return;
    const s = this.s;
    const pts = t.duck ? 3 : 1;
    this.score += pts;
    s.progress(Math.min(GOAL / PIP, Math.floor(this.score / PIP)));
    s.services.audio.play('ui-pop');
    s.services.audio.noise({ dur: 0.12, freq: 2600, q: 2, gain: 0.25 });
    s.burst(t.x, t.y, [0xbfe9ff, 0xffffff, 0xff9ce0, 0xa8f0ff], t.duck ? 18 : 10, 0.75);
    s.ring(t.x, t.y, t.r * 1.2, 0xe6f8ff, 260);
    if (t.duck) {
      s.flash('+3 QUACK!', t.x, t.y - t.r, '#FFE15A', '#B4501E');
      s.services.audio.tone(880, { gain: 0.3, dur: 0.3 });
      // the duck drops back into the tub
      const duck = t.c.list[0];
      t.c.remove(duck);
      duck.setPosition(t.x, t.y);
      s.fx.add(duck);
      s.tweens.add({ targets: duck, y: this.b.y0 + this.b.h * 0.3, angle: 360, duration: 600, ease: 'Quad.easeIn', onComplete: () => s.tweens.add({ targets: duck, alpha: 0, duration: 250, onComplete: () => duck.destroy() }) });
    }
    s.tweens.add({ targets: t.c, scale: 1.4, alpha: 0, duration: 140, onComplete: () => t.c.destroy() });
    if (this.score >= GOAL) s.time.delayedCall(250, () => this.end(true));
  }

  timeUp() {
    this.end(this.score >= GOAL);
  }

  update(dt) {
    this.t += dt;
    if (!this.playing) return;
    this.tickClock(dt);
    this.targets.update(dt);
    this.next -= dt;
    if (this.next <= 0 && this.targets.list.length < 6) {
      this.spawn();
      this.next = rand(0.32, 0.5);
    }
  }

  botWin() {
    const f = this.field();
    const t = this.targets.list.filter((x) => x.age > 0.3 && x.y > f.y0 + x.r).sort((a, b) => b.duck - a.duck)[0];
    return t ? this.tapAct(t.x, t.y - 4 * this.u) : null;
  }

  info() {
    return { score: this.score, bubbles: this.targets.list.length };
  }
}

function fitImg(i, size) {
  return i.setScale(size / Math.max(i.width, i.height));
}
