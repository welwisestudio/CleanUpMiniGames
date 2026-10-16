// Soccer Ball → Penalty Kick (polished 2026-10-15). The level's own stadium backdrop provides the
// goal (its opening is mapped from the image), a generated goalkeeper defends it. Pull back from the
// ball — an aim arrow with a power fill appears — and let go. 3 shots; 2 goals win.
// Fairness: the keeper shuffles calmly; after the kick he reacts (≈0.12 s) and dives towards the
// ball but his reach is limited — a shot into a corner away from him always scores; a shot close to
// him is saved.
const SHOTS = 3;
const NEED = 2;
// goal opening in the backdrop image (fractions): landscape / portrait art differ
const GOAL = { landscape: [0.1, 0.175, 0.9, 0.752], portrait: [0.095, 0.205, 0.905, 0.388] };

export class PenaltyGame {
  constructor(shell) {
    this.s = shell;
    this.ownsHero = true;
    this.shots = 0;
    this.goals = 0;
    this.results = [null, null, null];
    this.t = 0;
    this.aim = null;
    this.ball = null;
    this.dive = null;
    this.spot = shell.add.graphics();
    this.netFx = shell.add.graphics();
    this.keeper = shell.add.image(0, 0, 'mg-keeper').setOrigin(0.5, 1);
    this.ballShadow = shell.add.ellipse(0, 0, 10, 4, 0x000000, 0.3);
    this.arrow = shell.add.graphics();
    shell.world.add([this.spot, this.netFx, this.keeper, this.ballShadow, this.arrow]);
    this.trail = shell.add.particles(0, 0, 'fx-dot', { lifespan: 260, speed: 0, scale: { start: 1.1, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: 0xffffff, frequency: 16, emitting: false });
    shell.world.add(this.trail);
    this.netPulse = 0;
    shell.setPips(this.results);
  }

  heroPose(l) {
    return { x: l.W / 2, y: this.ballY ?? l.H * 0.82, size: this.ballSize ?? 92 * l.u, angle: 0 };
  }

  layout(l) {
    const { W, H, u } = l;
    const r = this.s.bgRect;
    const f = r.portrait ? GOAL.portrait : GOAL.landscape;
    this.gx0 = r.x + r.w * f[0];
    this.gx1 = r.x + r.w * f[2];
    this.gy0 = r.y + r.h * f[1];
    this.gy1 = r.y + r.h * f[3];
    // the goal can be wider than the screen on very narrow phones: play inside the visible part
    this.gx0 = Math.max(this.gx0, l.margin);
    this.gx1 = Math.min(this.gx1, W - l.margin);
    this.gx = (this.gx0 + this.gx1) / 2;
    this.gw = this.gx1 - this.gx0;
    this.gh = this.gy1 - this.gy0;
    this.kh = this.gh * 0.86;
    this.keeper.setScale(this.kh / this.keeper.height);
    this.kw = this.keeper.displayWidth;
    // 2026-10-16: a clearly bigger ball (was ≤ 96 units), limited by the space under the goal and the
    // screen width; the gameplay radius (hitR) stays the old one, so aiming / saves are unchanged
    this.ballSize = Math.min(150 * u, (H - this.gy1) * 0.62, W * 0.34, Math.max(this.gh * 0.75, 125 * u));
    this.hitR = Math.min(96 * u, (H - this.gy1) * 0.3) * 0.2;
    this.ballY = H - Math.max(l.margin + 40 * u, (H - this.gy1) * 0.16) - this.ballSize / 2;
    this.spot.clear().fillStyle(0xffffff, 0.85).fillEllipse(W / 2, this.ballY + this.ballSize * 0.48, this.ballSize * 0.7, this.ballSize * 0.18);
    if (!this.ball && this.s.state === 'play') this.resetBall();
  }

  start() {
    this.layout(this.s.layout);
    this.resetBall();
  }

  resetBall() {
    const p = this.heroPose(this.s.layout);
    this.ball = null;
    this.dive = null;
    this.keeper.setAngle(0).setAlpha(1);
    const h = this.s.hero;
    h.setPosition(p.x, p.y).setScale(this.s.heroScale(p.size)).setAngle(0).setAlpha(0);
    this.s.tweens.add({ targets: h, alpha: 1, duration: 200 });
    this.ballShadow.setVisible(true);
  }

  keeperIdleX() {
    // calm shuffle across the middle half of the goal
    return this.gx + Math.sin(this.t * 1.5) * this.gw * 0.22;
  }

  onDown(p) {
    if (this.ball) return;
    const h = this.s.hero;
    if (Math.hypot(p.x - h.x, p.y - h.y) < Math.max(140 * this.s.layout.u, this.ballSize * 0.9)) this.aim = { x: p.x, y: p.y };
  }

  onMove(p) {
    if (!this.aim) return;
    this.aim = { x: p.x, y: p.y };
    this.drawArrow();
  }

  shotVector() {
    const h = this.s.hero;
    const u = this.s.layout.u;
    let dx = h.x - this.aim.x;
    let dy = h.y - this.aim.y;
    const len = Math.hypot(dx, dy);
    if (len < 18 * u || dy > -6 * u) return null; // pull back (down) to shoot up
    dx /= len;
    dy /= len;
    return { dx, dy, power: Math.min(1, len / (150 * u)) };
  }

  drawArrow() {
    const g = this.arrow.clear();
    const v = this.aim && this.shotVector();
    if (!v) return;
    const u = this.s.layout.u;
    const h = this.s.hero;
    // dotted aim line towards the goal + a power arrow
    const lineY = this.gy0 + this.gh * 0.55;
    const tx = h.x + v.dx * ((lineY - h.y) / v.dy);
    for (let i = 1; i <= 12; i++) {
      const k = i / 13;
      g.fillStyle(0xffffff, 0.85 - k * 0.5).fillCircle(h.x + (tx - h.x) * k, h.y + (lineY - h.y) * k, (5 - k * 2) * u);
    }
    g.lineStyle(3 * u, 0xffffff, 0.9).strokeCircle(tx, lineY, 16 * u);
    const L = (60 + 90 * v.power) * u;
    const a = Math.atan2(v.dy, v.dx);
    const col = v.power > 0.75 ? 0xff5a3c : v.power > 0.4 ? 0xffd23f : 0x7fe07a;
    const x0 = h.x + v.dx * this.ballSize * 0.62;
    const y0 = h.y + v.dy * this.ballSize * 0.62;
    const x1 = x0 + v.dx * L;
    const y1 = y0 + v.dy * L;
    g.lineStyle(14 * u, 0x2f4e8c, 0.5).lineBetween(x0, y0, x1, y1);
    g.lineStyle(9 * u, col, 1).lineBetween(x0, y0, x1, y1);
    g.fillStyle(col, 1).fillTriangle(x1 + Math.cos(a) * 22 * u, y1 + Math.sin(a) * 22 * u, x1 + Math.cos(a + 2.4) * 17 * u, y1 + Math.sin(a + 2.4) * 17 * u, x1 + Math.cos(a - 2.4) * 17 * u, y1 + Math.sin(a - 2.4) * 17 * u);
  }

  onUp() {
    if (!this.aim) return;
    const v = this.shotVector();
    this.aim = null;
    this.arrow.clear();
    if (!v) return;
    const h = this.s.hero;
    const lineY = this.gy0 + this.gh * (0.62 - 0.3 * v.power); // harder shots fly higher
    const tx = h.x + v.dx * ((lineY - h.y) / v.dy);
    this.shots += 1;
    this.ball = { x0: h.x, y0: h.y, tx, ty: lineY, t: 0, dur: 0.62 - 0.2 * v.power, s0: h.scale };
    // kick impact
    this.s.services.audio.play('hit');
    this.s.shake(0.005, 110);
    this.s.ring(h.x, h.y, this.ballSize * 0.9);
    this.s.puffs(h.x, h.y + this.ballSize * 0.4, { n: 4, size: 36, speed: 90, tint: 0xd8f0c8, life: 500, rise: -30, alpha: 0.6 });
    this.trail.start();
    // keeper: reacts after a short delay, dives towards the ball with a limited reach
    const kx = this.keeperIdleX();
    const reach = this.gw * 0.24;
    const target = Math.max(kx - reach, Math.min(kx + reach, tx));
    this.dive = { from: kx, to: target, t: -0.12, dir: Math.sign(tx - kx) || 1 };
  }

  update(dt) {
    this.t += dt;
    const u = this.s.layout.u;
    // keeper
    let kx = this.keeperIdleX();
    let ky = this.gy1;
    let ang = Math.sin(this.t * 6) * 2;
    const d = this.dive;
    if (d) {
      d.t += dt;
      const k = Math.max(0, Math.min(1, d.t / 0.3));
      const e = 1 - (1 - k) ** 3;
      kx = d.from + (d.to - d.from) * e;
      ang = d.dir * 55 * e * Math.min(1, Math.abs(d.to - d.from) / (this.gw * 0.08));
      ky = this.gy1 - Math.sin(e * Math.PI) * this.kh * 0.12;
      this.keeperX = kx;
    } else {
      this.keeperX = kx;
    }
    this.keeper.setPosition(kx, ky).setAngle(ang);
    // goal ripple
    const g = this.netFx.clear();
    if (this.netPulse > 0) {
      this.netPulse = Math.max(0, this.netPulse - dt * 1.6);
      for (let i = 0; i < 3; i++) g.lineStyle(3 * u, 0xffffff, this.netPulse * (0.7 - i * 0.2)).strokeEllipse(this.bulge.x, this.bulge.y, (40 + i * 34) * u * (1.6 - this.netPulse), (26 + i * 22) * u * (1.6 - this.netPulse));
    }
    const b = this.ball;
    const h = this.s.hero;
    if (!b || b.done) {
      if (!b) this.ballShadow.setPosition(h.x, this.ballY + this.ballSize * 0.46).setSize(this.ballSize * 0.8, this.ballSize * 0.22);
      return;
    }
    b.t += dt / b.dur;
    const k = Math.min(1, b.t);
    const x = b.x0 + (b.tx - b.x0) * k;
    const y = b.y0 + (b.ty - b.y0) * k - Math.sin(k * Math.PI) * 50 * u;
    const endK = 1 - Math.min(0.75, (this.hitR * 4.5) / this.ballSize); // arrives at the old on-goal size
    h.setPosition(x, y).setScale(b.s0 * (1 - (1 - endK) * k)).setAngle(h.angle + 1000 * dt);
    this.trail.setPosition(x, y);
    const sk = 1 - (1 - endK) * k;
    this.ballShadow.setPosition(b.x0 + (b.tx - b.x0) * k, b.y0 + this.ballSize * 0.46 + (this.gy1 - b.y0 - this.ballSize * 0.46) * k).setSize(this.ballSize * 0.8 * sk, this.ballSize * 0.22 * sk);
    if (k < 1) return;
    b.done = true;
    this.trail.stop();
    const r = this.hitR; // unchanged gameplay radius (independent of the ball's look)
    const inside = b.tx > this.gx0 + r && b.tx < this.gx1 - r;
    const kxNow = this.keeperX;
    const saved = inside && Math.abs(b.tx - kxNow) < this.kw * 0.42 + r;
    const audio = this.s.services.audio;
    const i = this.shots - 1;
    if (inside && !saved) {
      this.goals += 1;
      this.results[i] = 'ok';
      this.netPulse = 1;
      this.bulge = { x: b.tx, y: b.ty };
      this.s.burst(b.tx, b.ty, [0xffffff, 0xffd23f, 0x4fc84b], 20);
      this.s.ring(b.tx, b.ty, 90 * u, 0xffe15a);
      this.s.flash('GOAL!', b.tx, b.ty - 50 * u, '#FFE15A', '#B4501E');
      audio.play('reward');
      this.s.shake(0.008, 180);
      this.s.tweens.add({ targets: h, y: this.gy1 - 14 * u, duration: 380, ease: 'Bounce.easeOut' });
    } else if (saved) {
      this.results[i] = 'miss';
      this.s.flash('SAVED!', b.tx, b.ty - 50 * u);
      this.s.burst(b.tx, b.ty, [0xffffff], 10, 0.8);
      audio.play('chisel-hit');
      this.s.tweens.add({ targets: h, y: h.y + 170 * u, x: h.x + (b.tx > this.gx ? 70 : -70) * u, alpha: 0, duration: 560, ease: 'Quad.easeIn' });
    } else {
      this.results[i] = 'miss';
      this.s.flash('MISS!', b.tx, b.ty - 30 * u, '#FFFFFF', '#5C6B85');
      audio.play('ui-tap');
      this.s.tweens.add({ targets: h, y: h.y - 90 * u, alpha: 0, duration: 420 });
    }
    this.s.setPips(this.results);
    const missesLeft = SHOTS - this.shots;
    const decided = this.goals >= NEED || this.goals + missesLeft < NEED;
    this.s.time.delayedCall(inside && !saved ? 900 : 750, () => {
      if (this.s.state !== 'play') return;
      if (decided) this.s.finish(this.goals >= NEED);
      else this.resetBall();
    });
  }

  qa() {
    const dpr = this.s.layout.dpr;
    const h = this.s.hero;
    return { ballSize: this.ballSize / dpr, ball: { x: h.x / dpr, y: h.y / dpr }, goal: { x: this.gx / dpr, y: (this.gy0 + this.gh * 0.5) / dpr, w: this.gw / dpr, h: this.gh / dpr }, keeperX: (this.keeperX ?? this.gx) / dpr, shots: this.shots, goals: this.goals, flying: Boolean(this.ball && !this.ball.done) };
  }
}
