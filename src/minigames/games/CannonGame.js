// Antique Cannon → Cannon Blast (reworked 2026-10-15). The cannon stands on the shore of the level's
// own lake backdrop; three barrel targets (generated sprite) bob on the water. A crosshair glides
// slowly back and forth across the water and a dotted arc shows the ball's path to it — tap to fire
// exactly there. Hitting a barrel blows it up. 3 barrels with 5 cannonballs.
// Readable + fair: what you see is where the ball lands (no hidden physics), generous hit radius,
// calm crosshair speed, the barrels sit at different depths.
const SHOTS = 5;
const FLIGHT = 0.7; // s
// water band in the backdrop image (fractions of its height): landscape / portrait art differ
const WATER = { landscape: [0.8, 0.95], portrait: [0.43, 0.57] };

export class CannonGame {
  constructor(shell) {
    this.s = shell;
    this.ownsHero = true;
    this.t = 0;
    this.shots = 0;
    this.hits = 0;
    this.balls = [];
    this.bank = shell.add.graphics();
    this.arc = shell.add.graphics();
    this.cross = shell.add.graphics();
    this.ballG = shell.add.graphics();
    this.targets = [0, 1, 2].map((i) => ({ i, alive: true, img: shell.add.image(0, 0, 'mg-target'), phase: i * 1.9 }));
    shell.world.add([...this.targets.map((t) => t.img), this.bank, this.arc, this.cross, this.ballG]);
    this.smokeTrail = shell.add.particles(0, 0, 'mg-smoke', { lifespan: 600, speed: { min: 5, max: 25 }, scale: { start: 0.12, end: 0.3 }, alpha: { start: 0.5, end: 0 }, frequency: 22, emitting: false });
    shell.world.add(this.smokeTrail);
  }

  heroPose(l) {
    const size = Math.min(l.W * (l.W < l.H ? 0.5 : 0.34), 330 * l.u);
    return { x: l.margin + size * 0.5, y: l.H - l.margin - 70 * l.u - size * 0.2, size, angle: 0 };
  }

  layout(l) {
    const { W, H, u } = l;
    const r = this.s.bgRect;
    const w = r.portrait ? WATER.portrait : WATER.landscape;
    const p = this.heroPose(l);
    this.waterY0 = r.y + r.h * w[0];
    this.waterY1 = Math.min(r.y + r.h * w[1], p.y - p.size * 0.32);
    // landscape: the field is right of the cannon; portrait: the cannon fires up across the whole lake
    this.fieldX0 = r.portrait ? l.margin + 30 * u : p.x + p.size * 0.55;
    this.fieldX1 = W - l.margin - 30 * u;
    this.tsize = Math.min(110 * u, (this.fieldX1 - this.fieldX0) * 0.26);
    this.targets.forEach((t, i) => {
      t.bx = this.fieldX0 + (this.fieldX1 - this.fieldX0) * [0.18, 0.55, 0.88][i];
      t.by = this.waterY0 + (this.waterY1 - this.waterY0) * [0.75, 0.15, 0.5][i];
      t.img.setScale(this.tsize / Math.max(t.img.width, t.img.height));
    });
    // a sandy bank under the cannon (soft rounded hill)
    const g = this.bank.clear();
    const by = p.y + p.size * 0.18;
    g.fillStyle(0xd9c08a, 1).fillEllipse(p.x, by + 60 * u, p.size * 1.9, 150 * u);
    g.fillStyle(0xe8d3a2, 1).fillEllipse(p.x - 10 * u, by + 50 * u, p.size * 1.7, 120 * u);
    g.fillStyle(0xf3e3bb, 0.8).fillEllipse(p.x - 30 * u, by + 30 * u, p.size * 1.1, 40 * u);
    g.fillStyle(0xd9c08a, 1).fillRect(0, by + 60 * u, p.x + p.size * 0.95, H);
  }

  start() {
    this.layout(this.s.layout);
  }

  muzzle() {
    const h = this.s.hero;
    return { x: h.x + h.displayWidth * 0.47, y: h.y - h.displayHeight * 0.33 };
  }

  // the crosshair glides back and forth across the water, weaving through the barrel depths
  aimPoint() {
    const k = (Math.sin(this.t * 0.95 - Math.PI / 2) + 1) / 2; // 0..1..0, ~3.3 s per sweep
    const x = this.fieldX0 + (this.fieldX1 - this.fieldX0) * (0.05 + 0.92 * k);
    const y = this.waterY0 + (this.waterY1 - this.waterY0) * (0.5 + 0.38 * Math.sin(this.t * 2.1));
    return { x, y };
  }

  targetPos(t) {
    return { x: t.bx, y: t.by + Math.sin(this.t * 2 + t.phase) * 5 * this.s.layout.u };
  }

  onDown() {
    if (this.shots >= SHOTS || this.s.state !== 'play' || this.balls.length) return;
    this.shots += 1;
    const m = this.muzzle();
    const a = this.aimPoint();
    this.balls.push({ x0: m.x, y0: m.y, x1: a.x, y1: a.y, t: 0 });
    // recoil: the cannon kicks back and tips up, then settles
    const h = this.s.hero;
    const p = this.heroPose(this.s.layout);
    const u = this.s.layout.u;
    this.s.tweens.add({ targets: h, x: p.x - 30 * u, angle: -6, duration: 70, ease: 'Quad.easeOut', yoyo: true, hold: 40, onComplete: () => h.setPosition(p.x, p.y).setAngle(0) });
    this.s.ring(m.x, m.y, 60 * u, 0xfff1b0, 300);
    this.s.burst(m.x, m.y, [0xfff1b0, 0xffb347, 0xffffff], 12, 1.1);
    this.s.puffs(m.x + 20 * u, m.y, { n: 7, size: 60, speed: 200, life: 1100, rise: -70, alpha: 0.9 });
    this.smokeTrail.start();
    this.s.services.audio.boom(0.8);
    this.s.shake(0.012, 200);
  }

  update(dt) {
    this.t += dt;
    const u = this.s.layout.u;
    for (const t of this.targets) {
      if (!t.alive) continue;
      const q = this.targetPos(t);
      t.img.setPosition(q.x, q.y).setAngle(Math.sin(this.t * 1.7 + t.phase) * 4);
    }
    // crosshair + dotted arc
    const ag = this.arc.clear();
    const cg = this.cross.clear();
    if (this.shots < SHOTS && this.s.state === 'play' && !this.balls.length) {
      const m = this.muzzle();
      const a = this.aimPoint();
      const top = Math.min(m.y, a.y) - Math.max(90 * u, Math.abs(a.x - m.x) * 0.32);
      for (let i = 1; i < 16; i++) {
        const k = i / 16;
        const x = m.x + (a.x - m.x) * k;
        const y = (1 - k) * (1 - k) * m.y + 2 * (1 - k) * k * top + k * k * a.y;
        ag.fillStyle(0xffffff, 0.9 - k * 0.35).fillCircle(x, y, (5.5 - k * 2) * u);
      }
      const onTarget = this.targets.some((t) => t.alive && this.hitTest(a, t));
      const col = onTarget ? 0xff3b3b : 0xffffff;
      const r = (onTarget ? 30 : 24) * u;
      cg.lineStyle(7 * u, 0x000000, 0.25).strokeCircle(a.x, a.y + 2 * u, r);
      cg.lineStyle(4.5 * u, col, 1).strokeCircle(a.x, a.y, r);
      cg.lineBetween(a.x - r * 1.5, a.y, a.x - r * 0.55, a.y).lineBetween(a.x + r * 0.55, a.y, a.x + r * 1.5, a.y);
      cg.lineBetween(a.x, a.y - r * 1.5, a.x, a.y - r * 0.55).lineBetween(a.x, a.y + r * 0.55, a.x, a.y + r * 1.5);
      cg.fillStyle(col, 1).fillCircle(a.x, a.y, 3.5 * u);
    }
    // cannonballs: a fixed arc to the chosen point (what you aimed at is what you hit)
    const bg = this.ballG.clear();
    for (const b of this.balls) {
      b.t += dt / FLIGHT;
      const k = Math.min(1, b.t);
      const top = Math.min(b.y0, b.y1) - Math.max(90 * u, Math.abs(b.x1 - b.x0) * 0.32);
      const x = b.x0 + (b.x1 - b.x0) * k;
      const y = (1 - k) * (1 - k) * b.y0 + 2 * (1 - k) * k * top + k * k * b.y1;
      const rr = 15 * u * (1 - 0.35 * k);
      bg.fillStyle(0x000000, 0.25).fillCircle(x + 2 * u, y + 3 * u, rr);
      bg.fillStyle(0x2a2d36, 1).fillCircle(x, y, rr);
      bg.fillStyle(0xffffff, 0.35).fillCircle(x - rr * 0.35, y - rr * 0.35, rr * 0.3);
      this.smokeTrail.setPosition(x, y);
      if (k < 1) continue;
      b.done = true;
      this.smokeTrail.stop();
      this.impact({ x: b.x1, y: b.y1 });
    }
    this.balls = this.balls.filter((b) => !b.done);
    if (this.s.state !== 'play' || this.balls.length) return;
    if (this.hits >= this.targets.length) this.s.finish(true);
    else if (this.shots >= SHOTS) this.s.finish(false);
  }

  hitTest(p, t) {
    const q = this.targetPos(t);
    return Math.abs(p.x - q.x) < this.tsize * 0.62 && Math.abs(p.y - q.y) < this.tsize * 0.7;
  }

  impact(p) {
    const u = this.s.layout.u;
    const s = this.s;
    const t = this.targets.find((x) => x.alive && this.hitTest(p, x));
    if (!t) {
      // splash: water ring + droplets
      s.ring(p.x, p.y, 50 * u, 0xdff6ff, 380);
      s.burst(p.x, p.y, [0xbfe9ff, 0xffffff, 0x7fd0f5], 14, 0.8);
      s.flash('SPLASH', p.x, p.y - 40 * u, '#FFFFFF', '#2C6FA0');
      s.services.audio.play('ui-pop');
      return;
    }
    // BOOM: the barrel bursts into planks + smoke + fire flash
    t.alive = false;
    this.hits += 1;
    s.progress(this.hits);
    const q = this.targetPos(t);
    s.services.audio.boom(1);
    s.services.audio.play('chunk-fall');
    s.shake(0.014, 240);
    s.ring(q.x, q.y, 110 * u, 0xffd23f, 450);
    s.burst(q.x, q.y, [0xffb347, 0xff6b3c, 0xfff1b0], 18, 1.4);
    s.burst(q.x, q.y, [0x8a5a2b, 0xb57a3e, 0xe8403a, 0xffffff], 16, 1);
    s.puffs(q.x, q.y, { n: 8, size: 80, speed: 220, life: 1200, rise: -90, alpha: 0.8, tint: 0xf2eee8 });
    s.flash(this.hits >= this.targets.length ? 'KABOOM!' : 'BOOM!', q.x, q.y - 70 * u, '#FFE15A', '#B4501E');
    s.tweens.add({ targets: t.img, scale: t.img.scale * 1.35, alpha: 0, angle: 40, duration: 260, onComplete: () => t.img.setVisible(false) });
  }

  qa() {
    const d = this.s.layout.dpr;
    const a = this.aimPoint();
    return { shots: this.shots, hits: this.hits, inFlight: this.balls.length, aim: { x: a.x / d, y: a.y / d }, onTarget: this.targets.some((t) => t.alive && this.hitTest(a, t)), targets: this.targets.map((t) => ({ alive: t.alive, ...((q) => ({ x: q.x / d, y: q.y / d }))(this.targetPos(t)) })) };
  }
}
