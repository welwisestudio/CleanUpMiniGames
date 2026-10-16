// Porcelain Vase → Flower Toss (expansion 2026-10-16, Aim / Throw system). The cleaned vase
// glides slowly from side to side; a long-stemmed rose (generated sprite) waits at the bottom.
// Swipe up towards the vase — the rose sails along the swipe line and drops into the vase's mouth.
// A dotted guide shows the throw while you swipe. 5 roses, 3 in the vase win; the roses that land
// stay in the vase as a growing bouquet. 15 s for the five throws.
import { BaseGame, Swipe, Riders, arcPoint, drawGuide, clamp } from '../systems/kit.js';

const FAN = [0, -16, 16, -30, 30]; // bouquet angles (degrees from upright)

const THROWS = 5;
const NEED = 3;
const FLIGHT = 0.55;

export class FlowerTossGame extends BaseGame {
  constructor(shell) {
    super(shell, { ownsHero: true, time: 15 });
    this.swipe = new Swipe({ minLen: 35 });
    this.guide = this.gfx(shell.fx);
    this.rose = this.img('mg-rose', 100, shell.fx);
    this.bouquet = new Riders((i) => {
      const h = this.s.hero;
      const sc = (this.roseSize * 0.95) / Math.max(this.roseTex.w, this.roseTex.h);
      // the stem end sits just inside the mouth; +37° turns the art's diagonal stem upright
      return { x: h.x + FAN[i % 5] * 0.35 * this.u, y: h.y - h.displayHeight / 2 + h.displayHeight * 0.07, sx: sc, sy: sc, angle: 37 + FAN[i % 5] + h.angle };
    }, { dur: 0.25 });
    this.res = [];
    this.fly = null;
  }

  vaseX(t = this.t) {
    const l = this.l;
    const amp = Math.min(l.W * 0.3, 260 * l.u);
    return l.W / 2 + Math.sin(t * 0.9) * amp;
  }

  heroPose(l) {
    const size = Math.min(l.H * 0.34, 330 * l.u, l.W * 0.6);
    const f = this.field();
    const bouquet = Math.min(150 * l.u, l.H * 0.16) * 0.75; // room for the roses above the mouth
    return { x: this.vaseX(), y: f.y0 + bouquet + size * 0.5, size, angle: Math.sin(this.t * 0.9 + 1.2) * 3 };
  }

  layout(l) {
    const b = this.heroBox();
    this.mouthY = b.y0 + b.h * 0.06;
    this.mouthW = b.w * 0.42;
    this.roseSize = Math.min(150 * l.u, l.H * 0.16);
    this.home = { x: l.W / 2, y: this.field().y1 - this.roseSize * 0.4 };
    this.rose.setScale(this.roseSize / Math.max(this.rose.width, this.rose.height));
    if (!this.fly) this.rose.setPosition(this.home.x, this.home.y).setAngle(-40);
    this.placeHero();
  }

  // where a swipe sends the rose: along the swipe line up to the vase mouth's height
  aim(sw) {
    const dy = Math.min(-1, sw.dy);
    const k = (this.mouthY - this.home.y) / dy;
    return { x: clamp(this.home.x + sw.dx * k, this.l.margin, this.l.W - this.l.margin), y: this.mouthY };
  }

  onDown(p) {
    if (this.fly || !this.playing) return;
    this.swipe.down(p);
  }

  onMove(p) {
    this.swipe.move(p);
  }

  onUp(p) {
    if (this.fly || !this.playing) return;
    const sw = this.swipe.up(p, this.u);
    if (!sw || sw.dy > -20 * this.u) return;
    const a = this.aim(sw);
    // within reach of where the vase will be: the rose homes onto the mouth's centre
    const vx = this.vaseX(this.t + FLIGHT);
    const home = Math.abs(a.x - vx) < this.mouthW * 0.5 + this.roseSize * 0.2;
    this.fly = { x1: a.x, y1: a.y, k: 0, home };
    this.s.services.audio.noise({ dur: 0.3, freq: 600, to: 1800, q: 0.9, gain: 0.3 });
  }

  timeUp() {
    this.end(this.res.filter((x) => x === 'ok').length >= NEED);
  }

  update(dt) {
    this.t += dt;
    if (!this.fly) this.tickClock(dt);
    if (this.s.state === 'play') this.placeHero();
    const h = this.s.hero;
    void h;
    this.bouquet.update(dt);
    const g = this.guide.clear();
    if (this.swipe.active && !this.fly && this.playing) {
      const a = this.swipe.active;
      if (a.y < a.y0 - 10 * this.u) {
        const q = this.aim({ dx: a.x - a.x0, dy: a.y - a.y0 });
        drawGuide(g, this.home.x, this.home.y, q.x, q.y, 80 * this.u, this.u);
      }
    }
    if (!this.fly) {
      if (this.playing) this.rose.setAngle(-40 + Math.sin(this.t * 3) * 4);
      return;
    }
    if (typeof this.fly !== 'object') return; // landed, waiting for the next rose
    const f = this.fly;
    f.k += dt / FLIGHT;
    const k = Math.min(1, f.k);
    if (f.home) f.x1 = this.vaseX(this.t + (1 - k) * FLIGHT);
    const q = arcPoint(this.home.x, this.home.y, f.x1, f.y1, k, 80 * this.u);
    this.rose.setPosition(q.x, q.y).setAngle(-40 + 400 * k);
    if (k < 1) return;
    this.land(f);
  }

  land(f) {
    const s = this.s;
    const vx = this.s.hero.x;
    const hit = f.home;
    this.res.push(hit ? 'ok' : 'miss');
    s.setPips([...this.res, ...Array(THROWS - this.res.length).fill(null)]);
    if (hit) {
      // the thrown rose becomes a bouquet rose: same spot, stem end as its anchor, behind the vase
      const img = this.s.add.image(0, 0, 'mg-rose').setOrigin(0.86, 0.95);
      this.roseTex = { w: img.width, h: img.height };
      s.world.add(img);
      img.setPosition(vx, this.mouthY).setScale(this.rose.scaleX).setAngle(this.rose.angle);
      this.rose.setAlpha(0);
      this.bouquet.add(img);
      s.flash(this.bouquet.length >= NEED ? 'BEAUTIFUL!' : 'IN!', vx, this.mouthY - 80 * this.u, '#FFE15A', '#B4501E');
      s.burst(vx, this.mouthY, [0xff5a7a, 0xffffff, 0x7ad35a], 14, 0.85);
      s.puffs(vx, this.mouthY, { key: 'fx-sparkle', n: 4, size: 26, speed: 140, life: 600, rise: 60, alpha: 1 });
      s.services.audio.play('place');
      s.services.audio.bell([880, 1046.5, 1318.51, 1567.98, 1760][this.bouquet.length - 1], { gain: 0.38 });
    } else {
      s.flash('MISS', f.x1, this.mouthY - 60 * this.u, '#FFFFFF', '#5C6B85');
      s.services.audio.play('ui-pop');
      s.tweens.add({ targets: this.rose, y: this.l.H + 150 * this.u, angle: this.rose.angle + 160, duration: 650, ease: 'Quad.easeIn' });
    }
    const ok = this.res.filter((x) => x === 'ok').length;
    this.fly = 'reset';
    if (ok >= NEED) return s.time.delayedCall(450, () => this.end(true));
    if (this.res.length - ok > THROWS - NEED) return s.time.delayedCall(450, () => this.end(false));
    s.time.delayedCall(hit ? 250 : 700, () => {
      this.rose.setPosition(this.home.x, this.home.y + 120 * this.u).setAngle(-40).setAlpha(1);
      s.tweens.add({ targets: this.rose, y: this.home.y, duration: 220, ease: 'Back.easeOut', onComplete: () => (this.fly = null) });
    });
  }

  // a swipe that sends the rose to where the vase will be when it arrives
  botWin() {
    if (this.fly || this.swipe.active) return null;
    const x = this.vaseX(this.t + 0.18 + FLIGHT); // input latency + flight
    const len = 160 * this.u;
    const k = (this.mouthY - this.home.y) / -len;
    return this.dragAct(this.home.x, this.home.y, this.home.x + (x - this.home.x) / k, this.home.y - len, 6);
  }

  botLose() {
    if (this.fly || this.swipe.active) return null;
    const vx = this.vaseX(this.t + 0.18 + FLIGHT);
    const x = vx > this.l.W / 2 ? this.l.margin + 20 * this.u : this.l.W - this.l.margin - 20 * this.u;
    const len = 160 * this.u;
    const k = (this.mouthY - this.home.y) / -len;
    return this.dragAct(this.home.x, this.home.y, this.home.x + (x - this.home.x) / k, this.home.y - len, 6);
  }

  info() {
    return { throws: this.res.length, inVase: this.bouquet.length, flying: Boolean(this.fly) };
  }
}
