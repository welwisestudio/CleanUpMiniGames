// Wooden Crate → Fruit Catch (expansion 2026-10-16, Catch system). Shiny apples (generated sprite)
// drop from the orchard sky; slide the cleaned crate left / right (drag anywhere — or just move the
// mouse) to catch them. 10 apples, 7 caught win. A soft glow on the ground shows where each apple
// will land; the crate's catch width is generous.
import { BaseGame, Catcher, Riders, rand } from '../systems/kit.js';

// the slots inside the crate (hero box fractions): 4 + 3 + 3, the opening is y 0.05–0.33
const SLOTS = [[-0.27, 0.22], [-0.09, 0.22], [0.09, 0.22], [0.27, 0.22], [-0.18, 0.13], [0, 0.13], [0.18, 0.13], [-0.09, 0.05], [0.09, 0.05], [0, -0.03]];

const TOTAL = 10;
const NEED = 7;

export class FruitCatchGame extends BaseGame {
  constructor(shell) {
    super(shell, { ownsHero: true });
    this.catcher = new Catcher({ follow: 16 });
    this.apples = [];
    this.spawned = 0;
    this.caught = 0;
    this.missed = 0;
    this.next = 0.5;
    this.marks = this.gfx(shell.world);
    this.inCrate = new Riders((i) => {
      const h = this.s.hero;
      const [fx, fy] = SLOTS[Math.min(i, SLOTS.length - 1)];
      const sc = (h.displayWidth * 0.21) / this.appleTexW;
      return { x: h.x + fx * h.displayWidth, y: h.y - h.displayHeight / 2 + fy * h.displayHeight, sx: sc, sy: sc, angle: [-12, 8, -4, 14, 6, -10, 3, -8, 10, 0][i % 10] };
    }, { dur: 0.22 });
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.52, 280 * l.u, l.H * 0.24);
    return { x: this.catcher?.x || l.W / 2, y: l.H - l.margin - 70 * l.u - size * 0.4, size, angle: 0 };
  }

  layout(l) {
    const p = this.heroPose(l);
    const b = this.heroBox(p);
    this.catcher.min = l.margin + b.w / 2;
    this.catcher.max = l.W - l.margin - b.w / 2;
    if (!this.catcher.x) this.catcher.x = this.catcher.tx = l.W / 2;
    this.catchY = b.y0 + b.h * 0.25;
    this.groundY = b.y1;
    this.appleSize = Math.max(Math.min(b.w * 0.36, 86 * l.u), 46 * l.dpr);
    this.placeHero();
  }

  onDown(p) {
    this.catcher.aim(p.x);
  }

  onMove(p) {
    this.catcher.aim(p.x);
  }

  spawn() {
    const f = this.field();
    // never directly over the last one, and reachable: at most ~60 % of the width away
    const prev = this.apples.at(-1)?.x ?? this.catcher.x;
    let x;
    do x = rand(f.x0 + this.appleSize, f.x1 - this.appleSize);
    while (Math.abs(x - prev) > (f.x1 - f.x0) * 0.6 || Math.abs(x - prev) < this.appleSize * 0.8);
    const img = this.img('mg-apple', this.appleSize, this.s.fx);
    img.setPosition(x, f.y0);
    this.apples.push({ x, y: f.y0, vy: rand(150, 190) * this.u, img, spin: rand(-120, 120) });
    this.spawned += 1;
  }

  update(dt) {
    this.t += dt;
    this.catcher.update(dt);
    if (this.s.state === 'play') this.placeHero();
    const h = this.s.hero;
    void h;
    this.inCrate.update(dt);
    const g = this.marks.clear();
    if (!this.playing) return;
    this.next -= dt;
    if (this.next <= 0 && this.spawned < TOTAL) {
      this.spawn();
      this.next = rand(0.75, 0.95);
    }
    const halfW = (this.heroBox().w / 2) * 0.95;
    for (const a of this.apples) {
      a.vy += 120 * this.u * dt;
      a.y += a.vy * dt;
      a.img.setPosition(a.x, a.y).setAngle(a.img.angle + a.spin * dt);
      g.fillStyle(0xfff1b0, 0.3).fillEllipse(a.x, this.groundY, this.appleSize * 1.2, this.appleSize * 0.35);
      if (a.y >= this.catchY && !a.done) {
        if (Math.abs(a.x - this.catcher.x) < halfW) this.catch(a);
        else if (a.y >= this.groundY - this.appleSize * 0.3) this.miss(a);
      }
    }
    this.apples = this.apples.filter((a) => !a.done);
  }

  catch(a) {
    const s = this.s;
    a.done = true;
    this.caught += 1;
    s.progress(Math.min(NEED, this.caught));
    this.appleTexW = a.img.width;
    this.inCrate.add(a.img);
    s.services.audio.play('place');
    s.services.audio.tone([523.25, 587.33, 659.25, 783.99, 880][this.caught % 5], { gain: 0.3, dur: 0.35 });
    s.burst(a.x, this.catchY, [0xff5a5a, 0xffffff, 0x4fc84b], 10, 0.75);
    if (this.caught % 3 === 0) s.flash('YUM!', a.x, this.catchY - 70 * this.u, '#FFE15A', '#B4501E');
    this.bounceHero(1.06);
    this.check();
  }

  miss(a) {
    const s = this.s;
    a.done = true;
    this.missed += 1;
    s.services.audio.play('hit');
    s.flash('miss', a.x, this.groundY - 60 * this.u, '#D6DCE8', '#5C6B85');
    s.tweens.add({ targets: a.img, y: a.y - 40 * this.u, duration: 160, yoyo: true, ease: 'Quad.easeOut', onComplete: () => s.tweens.add({ targets: a.img, alpha: 0, duration: 250, onComplete: () => a.img.destroy() }) });
    this.check();
  }

  check() {
    if (this.caught >= NEED) this.s.time.delayedCall(350, () => this.end(true));
    else if (this.missed > TOTAL - NEED) this.s.time.delayedCall(350, () => this.end(false));
  }

  botWin() {
    const a = this.apples.filter((x) => !x.done).sort((p, q) => q.y - p.y)[0];
    return a ? this.pressAct(a.x, this.catchY + 40 * this.u) : null;
  }

  botLose() {
    const a = this.apples.filter((x) => !x.done).sort((p, q) => q.y - p.y)[0];
    if (!a) return null;
    const away = a.x > this.l.W / 2 ? this.catcher.min : this.catcher.max;
    return this.pressAct(away, this.catchY + 40 * this.u);
  }

  info() {
    return { caught: this.caught, missed: this.missed, spawned: this.spawned };
  }
}
