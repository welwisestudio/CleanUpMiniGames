// Carousel Horse → Brass Ring Grab (expansion 2026-10-16, Timing system: a moving target). The
// cleaned carousel horse bobs up and down on its pole; golden rings slide in along the ring arm.
// Tap when a ring passes through the glowing reach zone in front of the horse → the ring is caught
// and slides onto the pole. 6 rings, 4 catches win. Rings that pass are simply gone.
// The ring art is the game's own gold coin with its centre cut out (made at runtime, no new file:
// four Nano Banana 2 attempts at a ring were rejected by the generator's filter).
import { BaseGame, Riders, rand } from '../systems/kit.js';

const POLE = { x: 0.52, y0: 0.085, step: 0.042 }; // the pole in the horse art (hero box fractions)

const TOTAL = 6;
const NEED = 4;
const EVERY = 1.25;

export class BrassRingGrabGame extends BaseGame {
  constructor(shell) {
    super(shell, { ownsHero: true });
    this.ringKey = makeRingTexture(shell);
    this.rail = this.gfx(shell.world);
    this.zoneG = this.gfx(shell.fx);
    this.rings = [];
    this.res = [];
    this.spawned = 0;
    this.next = 0.9;
    this.onPole = new Riders((i) => {
      const h = this.s.hero;
      const w = h.displayWidth * 0.17;
      const sx = w / this.ringTexW;
      return { x: h.x + (POLE.x - 0.5) * h.displayWidth, y: h.y - h.displayHeight / 2 + h.displayHeight * (POLE.y0 + 0.04 + i * POLE.step), sx, sy: sx * 0.34, angle: 0 };
    }, { dur: 0.36 });
    this.ringTexW = shell.textures.get(this.ringKey).getSourceImage().width;
  }

  heroPose(l) {
    const portrait = l.W < l.H;
    const size = Math.min(l.W * (portrait ? 0.74 : 0.4), 440 * l.u, l.H * 0.5);
    const f = this.field();
    const y = (portrait ? f.y1 - size * 0.5 - 10 * l.u : (f.y0 + f.y1) / 2 + size * 0.08) + Math.sin(this.t * 2.2) * 26 * l.u;
    return { x: portrait ? l.W * 0.4 : l.W * 0.34, y, size, angle: Math.sin(this.t * 2.2 + 0.8) * 2 };
  }

  layout(l) {
    this.placeHero();
    const b = this.heroBox({ ...this.heroPose(l), y: this.baseY() });
    this.ringSize = Math.max(Math.min(b.w * 0.24, 110 * l.u), 58 * l.dpr);
    // the ring arm runs at the height of the horse's head; the reach zone sits in front of it
    this.armY = b.y0 + b.h * 0.12;
    this.zoneX = b.x0 + b.w * 0.98;
    this.zoneR = this.ringSize * 0.95;
    this.armX0 = this.zoneX - this.ringSize;
    this.armX1 = l.W + this.ringSize;
    const g = this.rail.clear();
    const u = l.u;
    g.fillStyle(0x000000, 0.25).fillRoundedRect(this.armX0, this.armY - this.ringSize * 0.62 + 5 * u, this.armX1 - this.armX0, 14 * u, 7 * u);
    g.fillStyle(0xc99a3a, 1).fillRoundedRect(this.armX0, this.armY - this.ringSize * 0.62, this.armX1 - this.armX0, 14 * u, 7 * u);
    g.fillStyle(0xffe08a, 1).fillRoundedRect(this.armX0, this.armY - this.ringSize * 0.62 + 2 * u, this.armX1 - this.armX0, 5 * u, 3 * u);
  }

  baseY() {
    const l = this.l;
    const f = this.field();
    const size = this.heroPose(l).size;
    return l.W < l.H ? f.y1 - size * 0.5 - 10 * l.u : (f.y0 + f.y1) / 2 + size * 0.08;
  }

  spawn() {
    const img = this.s.add.image(this.armX1, this.armY, this.ringKey);
    img.setScale(this.ringSize / img.width);
    this.s.fx.add(img);
    this.rings.push({ img, x: this.armX1, speed: rand(0.95, 1.1) * Math.max(250 * this.u, this.l.W * 0.36), alive: true });
    this.spawned += 1;
  }

  inZone(r, slack = 1) {
    return Math.abs(r.x - this.zoneX) < this.zoneR * slack;
  }

  onDown() {
    if (!this.playing) return;
    const r = this.rings.filter((x) => x.alive).sort((a, b) => Math.abs(a.x - this.zoneX) - Math.abs(b.x - this.zoneX))[0];
    if (!r || Math.abs(r.x - this.zoneX) > this.zoneR * 2.2) return; // nothing near: ignore the tap
    r.alive = false;
    const s = this.s;
    if (this.inZone(r)) {
      this.res.push('ok');
      const perfect = this.inZone(r, 0.35);
      s.flash(perfect ? 'PERFECT GRAB!' : 'GOT IT!', this.zoneX, this.armY - this.ringSize, '#FFE15A', '#B4501E');
      s.burst(r.x, this.armY, [0xffd23f, 0xffffff, 0xff9ce0], 14, 0.9);
      s.ring(r.x, this.armY, this.ringSize, 0xffe9a0, 320);
      s.services.audio.bell([1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093][this.res.length - 1], { gain: 0.42 });
      // the ring drops neatly onto the horse's pole (edge-on, centred, stacked)
      this.onPole.add(r.img);
    } else {
      this.res.push('miss');
      s.flash('MISSED', r.x, this.armY - this.ringSize, '#FFFFFF', '#5C6B85');
      s.services.audio.play('error');
      s.tweens.add({ targets: r.img, y: this.l.H + 100, angle: 200, duration: 700, ease: 'Quad.easeIn', onComplete: () => r.img.destroy() });
    }
    this.after();
  }

  after() {
    this.s.setPips([...this.res, ...Array(TOTAL - this.res.length).fill(null)]);
    const ok = this.res.filter((x) => x === 'ok').length;
    if (ok >= NEED) this.s.time.delayedCall(450, () => this.end(true));
    else if (this.res.length - ok > TOTAL - NEED) this.s.time.delayedCall(450, () => this.end(false));
  }

  update(dt) {
    this.t += dt;
    if (this.s.state === 'play') this.placeHero();
    // caught rings ride along with the horse
    this.onPole.update(dt);
    const g = this.zoneG.clear();
    if (!this.playing || !this.zoneR) return;
    const u = this.u;
    const near = this.rings.some((r) => r.alive && this.inZone(r));
    g.fillStyle(near ? 0x4fc84b : 0xffffff, near ? 0.35 : 0.16).fillCircle(this.zoneX, this.armY, this.zoneR);
    g.lineStyle(5 * u, near ? 0x4fc84b : 0xffffff, 0.9).strokeCircle(this.zoneX, this.armY, this.zoneR * (0.95 + 0.05 * Math.sin(this.t * 8)));
    this.next -= dt;
    if (this.next <= 0 && this.spawned < TOTAL) {
      this.spawn();
      this.next = EVERY * rand(0.9, 1.15);
    }
    for (const r of this.rings) {
      if (!r.alive) continue;
      r.x -= r.speed * dt;
      r.img.setPosition(r.x, this.armY + Math.sin(this.t * 6 + r.x * 0.01) * 3 * u).setAngle(Math.sin(this.t * 4) * 8);
      if (r.x < this.zoneX - this.zoneR * 1.6) {
        r.alive = false;
        this.res.push('miss');
        this.s.tweens.add({ targets: r.img, alpha: 0, y: r.img.y + 60 * u, duration: 300, onComplete: () => r.img.destroy() });
        this.after();
      }
    }
    this.rings = this.rings.filter((r) => r.alive);
  }

  botWin() {
    const r = this.rings.find((x) => x.alive && this.inZone(x, 0.45));
    return r ? { ...this.tapAct(this.l.W / 2, this.l.H * 0.5), wait: 120 } : null;
  }

  botLose() {
    const r = this.rings.find((x) => x.alive && x.x > this.zoneX + this.zoneR * 1.5 && x.x < this.zoneX + this.zoneR * 2.1);
    return r ? { ...this.tapAct(this.l.W / 2, this.l.H * 0.5), wait: 120 } : null;
  }

  info() {
    return { caught: this.res.filter((x) => x === 'ok').length, results: this.res };
  }
}

// a brass ring: the gold coin sprite with its centre cut out + a bright inner rim
function makeRingTexture(scene) {
  const key = 'mg-ring-made';
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get('icon-coin').getSourceImage();
  const S = 256;
  const t = scene.textures.createCanvas(key, S, S);
  const ctx = t.getContext();
  ctx.drawImage(src, 0, 0, S, S);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = S * 0.03;
  ctx.strokeStyle = 'rgba(255, 244, 190, 0.9)';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.285, Math.PI * 0.9, Math.PI * 1.9);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140, 80, 20, 0.55)';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.285, Math.PI * 1.9, Math.PI * 2.9);
  ctx.stroke();
  t.refresh();
  return key;
}
