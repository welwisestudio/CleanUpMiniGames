// Rusty Cleaver → Cleaver Throw (polished 2026-10-15). A real log (generated sprite) spins in the
// workshop; tap to throw the freshly sharpened cleaver up into it. Stick 4 cleavers; a throw into a
// cleaver that is already stuck bounces off with a CLANG (2 bounces end the round as "nice try").
// Ramp: 95 → 115 → 135 °/s, direction flips after every hit; the gap rule is generous (22°).
const NEED = 4;
const LIVES = 2;
const GAP_DEG = 22;
const SPEEDS = [95, -115, 135, -150];

export class CleaverThrowGame {
  constructor(shell) {
    this.s = shell;
    this.ownsHero = true;
    this.hits = 0;
    this.misses = 0;
    this.rot = 0;
    this.speed = SPEEDS[0];
    this.stuck = []; // local angles (deg)
    this.fly = null;
    this.log = shell.add.container(0, 0);
    this.logImg = shell.add.image(0, 0, 'mg-log');
    this.logFlash = shell.add.image(0, 0, 'mg-log').setTintFill(0xffffff).setAlpha(0);
    this.log.add([this.logImg, this.logFlash]);
    this.shadow = shell.add.ellipse(0, 0, 10, 10, 0x000000, 0.25);
    this.lifeG = shell.add.graphics();
    shell.world.add([this.shadow, this.log, this.lifeG]);
    this.trail = shell.add.particles(0, 0, 'fx-dot', { lifespan: 200, speed: 0, scale: { start: 1.4, end: 0 }, alpha: { start: 0.55, end: 0 }, tint: 0xdfe8f2, frequency: 12, emitting: false });
    shell.world.add(this.trail);
  }

  heroPose(l) {
    // 2026-10-16: the cleaver waits at the bottom of the screen (clear of Skip / lives at the sides)
    return { x: l.W / 2, y: l.H - l.margin - 46 * l.u - this.len(l) / 2, size: this.len(l), angle: 90 };
  }

  len(l) {
    return Math.min(l.H * 0.22, 210 * l.u);
  }

  layout(l) {
    // the log sits right under the title / pips; between its bottom and the cleaver's tip there is
    // always a clear gap (≥ 22 % of the screen height); on short screens the log shrinks instead
    const top = l.margin + 158 * l.u;
    const cleaverTip = this.heroPose(l).y - this.len(l) / 2;
    const gap = Math.max(130 * l.u, l.H * 0.22);
    this.R = Math.max(70 * l.u, Math.min(l.W * 0.3, 165 * l.u, (cleaverTip - gap - top) / 2));
    this.lx = l.W / 2;
    this.ly = top + this.R;
    this.gap = cleaverTip - (this.ly + this.R);
    this.log.setPosition(this.lx, this.ly);
    const k = (this.R * 2) / this.logImg.width;
    this.logImg.setScale(k);
    this.logFlash.setScale(k);
    this.shadow.setPosition(this.lx + 8 * l.u, this.ly + 14 * l.u).setSize(this.R * 2, this.R * 2);
    this.log.list.filter((c) => c.stuckAngle != null).forEach((c) => this.placeStuck(c));
    this.drawLives();
  }

  // remaining tries: red dots in the bottom-left corner (clear of the throw path)
  drawLives() {
    const l = this.s.layout;
    const g = this.lifeG.clear();
    const y = l.H - l.margin - 28 * l.u;
    for (let i = 0; i < LIVES; i++) {
      const x = l.margin + 26 * l.u + i * 30 * l.u;
      const ok = i >= this.misses;
      g.fillStyle(0x000000, 0.25).fillCircle(x, y + 2 * l.u, 11 * l.u);
      g.fillStyle(ok ? 0xff5a6e : 0x8c8f99, 1).fillCircle(x, y, 11 * l.u);
      g.lineStyle(2.5 * l.u, 0xffffff, 1).strokeCircle(x, y, 11 * l.u);
    }
  }

  start() {
    this.layout(this.s.layout);
    this.ready();
  }

  ready() {
    const l = this.s.layout;
    const p = this.heroPose(l);
    this.fly = null;
    const h = this.s.hero;
    h.setPosition(p.x, p.y + 70 * l.u).setAngle(90).setScale(this.s.heroScale(p.size)).setAlpha(1);
    this.s.tweens.add({ targets: h, y: p.y, duration: 170, ease: 'Back.easeOut' });
  }

  onDown() {
    if (this.fly || this.s.state !== 'play') return;
    this.fly = { v: 2800 * this.s.layout.u };
    this.trail.start();
    this.s.services.audio.play('ui-tap');
  }

  placeStuck(img) {
    const L = this.len(this.s.layout);
    const depth = L * 0.24;
    const a = (img.stuckAngle * Math.PI) / 180;
    const d = this.R - depth + L / 2;
    img.setPosition(Math.cos(a) * d, Math.sin(a) * d).setAngle(img.stuckAngle).setScale(this.s.heroScale(L));
  }

  update(dt) {
    this.rot = (this.rot + this.speed * dt + 360) % 360;
    this.log.setAngle(this.rot);
    const f = this.fly;
    if (!f || f.done) return;
    const h = this.s.hero;
    const L = this.len(this.s.layout);
    h.y -= f.v * dt;
    this.trail.setPosition(h.x, h.y + L * 0.3);
    const tipY = h.y - L / 2;
    if (tipY > this.ly + this.R * 0.8) return;
    f.done = true;
    this.trail.stop();
    const u = this.s.layout.u;
    // impact at the bottom of the log (world 90°) → log-local angle
    const local = (((90 - this.rot) % 360) + 360) % 360;
    const blockedBy = this.log.list.find((c) => c.stuckAngle != null && Math.abs(((local - c.stuckAngle + 540) % 360) - 180) < GAP_DEG);
    const audio = this.s.services.audio;
    if (blockedBy) {
      // CLANG: sparks, the stuck cleaver flashes red, the thrown one spins away
      this.misses += 1;
      this.drawLives();
      audio.play('error');
      audio.play('chisel-hit');
      this.s.shake(0.009, 160);
      this.s.burst(h.x, this.ly + this.R, [0xfff3b0, 0xffd23f, 0xffffff], 16, 0.7);
      this.s.flash('CLANG!', h.x, this.ly + this.R + 40 * u, '#FF6B5A', '#5A1010');
      blockedBy.setTint(0xff6b5a);
      this.s.time.delayedCall(260, () => blockedBy.clearTint());
      this.s.tweens.add({ targets: h, y: h.y + 300 * u, x: h.x + (Math.random() < 0.5 ? -1 : 1) * 120 * u, angle: h.angle + 540, alpha: 0, duration: 650, ease: 'Quad.easeIn' });
      this.s.time.delayedCall(680, () => {
        if (this.s.state !== 'play') return;
        if (this.misses >= LIVES) this.s.finish(false);
        else this.ready();
      });
      return;
    }
    // THUNK: the cleaver sticks — wood chips, a white flash on the log, a little kick upward
    this.stuck.push(local);
    const img = this.s.add.image(0, 0, this.s.heroKey);
    img.stuckAngle = local;
    this.placeStuck(img);
    this.log.addAt(img, 0); // behind the log: the blade disappears into the wood
    h.setAlpha(0);
    this.hits += 1;
    this.s.progress(this.hits);
    audio.play('chisel-hit');
    audio.play('chunk-fall');
    this.s.shake(0.006, 120);
    this.s.puffs(this.lx, this.ly + this.R * 0.95, { n: 4, size: 34, speed: 120, tint: 0xe9c48f, life: 520, rise: 120, alpha: 0.7 });
    this.s.burst(this.lx, this.ly + this.R, [0xe7b56f, 0x8a5a2b, 0xc98d4c], 14, 0.9);
    this.logFlash.setAlpha(0.55);
    this.s.tweens.add({ targets: this.logFlash, alpha: 0, duration: 220 });
    this.s.tweens.add({ targets: this.log, y: this.ly - 12 * u, duration: 70, yoyo: true });
    if (this.hits >= NEED) {
      this.speed = 0;
      this.s.ring(this.lx, this.ly, this.R * 1.2, 0xffe15a, 600);
      this.s.puffs(this.lx, this.ly, { n: 8, size: 60, speed: 260, tint: 0xf3d9a8, life: 800, rise: 60, alpha: 0.6 });
      this.s.time.delayedCall(260, () => this.s.finish(true));
      return;
    }
    this.speed = SPEEDS[this.hits];
    this.s.time.delayedCall(200, () => this.s.state === 'play' && this.ready());
  }

  qa() {
    // predicted log-local impact angle of a throw started NOW (lets a test aim at a stuck cleaver)
    let impactNow = null;
    if (this.s.layout && this.R) {
      const l = this.s.layout;
      const p = this.heroPose(l);
      const flight = (p.y - this.len(l) / 2 - (this.ly + this.R * 0.8)) / (2800 * l.u);
      const rot = (this.rot + this.speed * flight + 3600) % 360;
      impactNow = (((90 - rot) % 360) + 360) % 360;
    }
    const d = this.s.layout?.dpr ?? 1;
    return { hits: this.hits, misses: this.misses, flying: Boolean(this.fly && !this.fly.done), stuck: this.stuck.length, stuckAngles: [...this.stuck], impactNow, rot: this.rot, gapPx: (this.gap ?? 0) / d, logR: (this.R ?? 0) / d };
  }
}
