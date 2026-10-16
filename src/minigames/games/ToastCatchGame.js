// Toaster → Toast Catch (expansion 2026-10-16, Catch system). The cleaned toaster pops golden
// toast (generated sprite) high into the air, to the left or to the right; slide the plate
// (generated sprite) under it. A glow on the counter shows where each slice will land. 7 slices,
// 5 caught win.
import { BaseGame, Catcher, Riders, rand, arcPoint } from '../systems/kit.js';

const TOTAL = 7;
const NEED = 5;
const AIR = 1.55;

export class ToastCatchGame extends BaseGame {
  constructor(shell) {
    super(shell);
    this.catcher = new Catcher({ follow: 16 });
    this.marks = this.gfx(shell.world);
    this.plate = this.img('mg-plate', 100, shell.fx);
    this.toasts = [];
    this.spawned = 0;
    this.caught = 0;
    this.missed = 0;
    this.next = 0.6;
    this.stack = new Riders((i) => {
      const sc = (this.toastSize * 0.92) / this.toastTexW;
      return { x: this.catcher.x, y: this.plateY - 7 * this.u - i * 7 * this.u, sx: sc, sy: sc * 0.42, angle: 0 };
    }, { dur: 0.16 });
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.5, 290 * l.u, l.H * 0.26);
    return { x: l.W / 2, y: l.H - l.margin - 70 * l.u - size * 0.42, size, angle: 0 };
  }

  layout(l) {
    const b = this.heroBox();
    this.plateW = Math.max(Math.min(l.W * 0.3, 190 * l.u), 120 * l.dpr);
    this.plate.setScale(this.plateW / this.plate.width, (this.plateW / this.plate.width) * 0.42);
    // the plate slides along the counter in front of the toaster
    this.plateY = b.y1 - b.h * 0.08;
    this.catcher.min = l.margin + this.plateW / 2;
    this.catcher.max = l.W - l.margin - this.plateW / 2;
    if (!this.catcher.x) this.catcher.x = this.catcher.tx = l.W / 2 - this.plateW;
    this.slot = { x: b.x0 + b.w * 0.42, y: b.y0 + b.h * 0.12 };
    this.toastSize = this.plateW * 0.55;
  }

  onDown(p) {
    this.catcher.aim(p.x);
  }

  onMove(p) {
    this.catcher.aim(p.x);
  }

  pop() {
    const s = this.s;
    const l = this.l;
    const side = this.spawned % 2 === 0 ? -1 : 1;
    const x1 = side < 0 ? rand(this.catcher.min, l.W / 2 - this.plateW * 0.9) : rand(l.W / 2 + this.plateW * 0.9, this.catcher.max);
    const img = this.img('mg-toast', this.toastSize, s.fx);
    img.setPosition(this.slot.x, this.slot.y);
    this.toasts.push({ img, x1, k: 0, lift: Math.max(260 * this.u, l.H * 0.3), spin: side * rand(300, 420) });
    this.spawned += 1;
    s.services.audio.play('hit');
    s.services.audio.noise({ dur: 0.18, freq: 900, to: 2200, q: 1.5, gain: 0.35 });
    const h = s.hero;
    const base = s.heroScale(this.heroPose(l).size);
    s.tweens.add({ targets: h, scaleY: base * 0.94, duration: 70, yoyo: true, onComplete: () => h.setScale(base) });
  }

  update(dt) {
    this.t += dt;
    this.catcher.update(dt);
    this.plate.setPosition(this.catcher.x, this.plateY);
    this.stack.update(dt);
    const g = this.marks.clear();
    if (!this.playing) return;
    this.next -= dt;
    if (this.next <= 0 && this.spawned < TOTAL && this.toasts.length < 2) {
      this.pop();
      this.next = rand(1.0, 1.25);
    }
    for (const t of this.toasts) {
      t.k += dt / AIR;
      const q = arcPoint(this.slot.x, this.slot.y, t.x1, this.plateY, Math.min(1, t.k), t.lift);
      t.img.setPosition(q.x, q.y).setAngle(t.k * t.spin);
      g.fillStyle(0xfff1b0, 0.25 + 0.3 * t.k).fillEllipse(t.x1, this.plateY + 8 * this.u, this.toastSize * 1.3, this.toastSize * 0.32);
      if (t.k >= 1 && !t.done) {
        t.done = true;
        if (Math.abs(t.x1 - this.catcher.x) < this.plateW * 0.55) this.catch(t);
        else this.miss(t);
      }
    }
    this.toasts = this.toasts.filter((t) => !t.done);
  }

  catch(t) {
    const s = this.s;
    this.caught += 1;
    s.progress(Math.min(NEED, this.caught));
    this.toastTexW = t.img.width;
    t.img.setAngle(((t.img.angle % 360) + 540) % 360 - 180);
    this.stack.add(t.img);
    s.services.audio.play('place');
    s.services.audio.tone([659.25, 783.99, 880, 1046.5, 1174.66][this.caught % 5], { gain: 0.3, dur: 0.35 });
    s.burst(this.catcher.x, this.plateY, [0xffd23f, 0xffffff, 0xd9963c], 10, 0.75);
    s.flash(this.caught === 1 ? 'CAUGHT!' : this.caught >= NEED ? 'BREAKFAST!' : 'TOASTY!', this.catcher.x, this.plateY - 90 * this.u, '#FFE15A', '#B4501E');
    s.tweens.add({ targets: this.plate, y: this.plateY + 8 * this.u, duration: 70, yoyo: true });
    this.check();
  }

  miss(t) {
    const s = this.s;
    this.missed += 1;
    s.services.audio.play('ui-pop');
    s.flash('miss', t.x1, this.plateY - 60 * this.u, '#D6DCE8', '#5C6B85');
    s.tweens.add({ targets: t.img, y: this.l.H + 120 * this.u, angle: t.img.angle + 90, duration: 500, ease: 'Quad.easeIn', onComplete: () => t.img.destroy() });
    this.check();
  }

  check() {
    if (this.caught >= NEED) this.s.time.delayedCall(350, () => this.end(true));
    else if (this.missed > TOTAL - NEED) this.s.time.delayedCall(350, () => this.end(false));
  }

  botWin() {
    const t = this.toasts.filter((x) => !x.done).sort((a, b) => b.k - a.k)[0];
    return t ? this.pressAct(t.x1, this.plateY) : null;
  }

  botLose() {
    const t = this.toasts.filter((x) => !x.done).sort((a, b) => b.k - a.k)[0];
    return t ? this.pressAct(t.x1 < this.l.W / 2 ? this.catcher.max : this.catcher.min, this.plateY) : null;
  }

  info() {
    return { caught: this.caught, missed: this.missed, platePx: this.plateW / this.l.dpr };
  }
}
