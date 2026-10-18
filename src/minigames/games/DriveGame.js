// Runner / Drive system, lane variant (expansion 2026-10-16): the cleaned vehicle rolls along a
// three-lane strip (generated ground art, scrolling); things come in from the right. Tap ABOVE the
// vehicle to move up a lane, BELOW it to move down (a swipe works too). Pick-ups count towards the
// goal; obstacles cost a life. Three themed configurations share it:
//   Lawn Mower → Mow Dash · Vintage Motorcycle → Highway Ride · Vintage Car → Sunday Drive.
// Phone-first: wide lanes, slow-ish scrolling (≥ 1 s to react), big pick-ups, a short blink of
// safety after a hit, and every obstacle wave leaves a free lane next to the player's lane.
import { BaseGame, Lanes, Strip, rand } from '../systems/kit.js';

class DriveGame extends BaseGame {
  constructor(shell, cfg) {
    super(shell, { ownsHero: true, time: cfg.time });
    this.cfg = cfg;
    this.lanes = new Lanes({ n: 3, lane: 1 });
    this.strip = new Strip(this, cfg.ground, shell.world);
    this.items = [];
    this.got = 0;
    this.lives = cfg.lives;
    this.safe = 0;
    this.next = 0.6;
    this.wave = 0;
    this.dist = 0;
    this.dust = shell.add.particles(0, 0, cfg.dustKey ?? 'mg-smoke', { lifespan: 500, speedX: { min: -220, max: -120 }, speedY: { min: -30, max: 10 }, scale: { start: 0.07, end: 0.18 }, alpha: { start: 0.45, end: 0 }, tint: cfg.dustTint ?? 0xffffff, frequency: 60 });
    shell.fx.add(this.dust);
  }

  heroPose(l) {
    const y = this.laneY ? this.laneY(this.lanes.pos) : l.H * 0.55;
    return { x: this.vx ?? l.W * 0.24, y: y - (this.vehSize ?? 0) * this.cfg.ride, size: this.vehSize ?? Math.min(l.W * 0.3, 240 * l.u), angle: 0 };
  }

  layout(l) {
    this.s.setLives(this.lives, this.cfg.lives);
    const f = this.field();
    const portrait = l.W < l.H;
    // the road band: three lanes, centred in the play field
    this.laneH = Math.max(Math.min((f.y1 - f.y0) * (portrait ? 0.15 : 0.2), 120 * l.u), 64 * l.dpr);
    const bandH = this.laneH * 3;
    this.bandY0 = (f.y0 + f.y1) / 2 - bandH / 2 + 20 * l.u;
    this.laneY = (p) => this.bandY0 + this.laneH * (p + 0.5);
    this.strip.layout(0, l.W, this.bandY0 + bandH / 2 + this.laneH * this.cfg.groundShift, bandH * this.cfg.groundScale);
    this.vehSize = Math.min(this.laneH * this.cfg.vehScale, l.W * (portrait ? 0.34 : 0.22));
    this.vx = Math.max(l.margin + this.vehSize * 0.6, l.W * (portrait ? 0.2 : 0.2));
    this.itemSize = this.laneH * 0.82;
    this.speed = Math.max(Math.min(l.W * 0.5, 520 * l.u), 210 * l.dpr) * this.cfg.speed;
    for (const it of this.items) it.y = this.laneY(it.lane);
  }

  onDown(p) {
    if (!this.playing) return;
    this.downY = p.y;
    const vy = this.laneY(this.lanes.pos);
    if (Math.abs(p.y - vy) < this.laneH * 0.35) return; // a tap on the vehicle itself: wait for a swipe
    this.steer(p.y < vy ? -1 : 1);
    this.downY = null;
  }

  onUp(p) {
    if (this.downY == null) return;
    const dy = p.y - this.downY;
    this.downY = null;
    if (Math.abs(dy) > 30 * this.u) this.steer(Math.sign(dy));
  }

  steer(d) {
    const before = this.lanes.lane;
    this.lanes.set(this.lanes.lane + d);
    if (this.lanes.lane !== before) this.s.services.audio.noise({ dur: 0.18, freq: 800, to: 1400, q: 1, gain: 0.18 });
  }

  // a wave: one obstacle or two (never all three lanes), plus pick-ups in a free lane
  spawnWave() {
    const c = this.cfg;
    const x = this.l.W + this.itemSize;
    const lanes = [0, 1, 2];
    const block = [];
    // every few waves one obstacle aims at the player's lane (doing nothing never wins)
    const aim = this.wave % 2 === 0 ? this.lanes.lane : Math.floor(Math.random() * 3);
    block.push(aim);
    if (this.wave > 1 && Math.random() < c.double) {
      // a second obstacle only where the remaining free lane is next to (or is) the player's lane
      const me = this.lanes.lane;
      const ok = lanes.filter((q) => q !== aim && Math.abs(lanes.find((r) => r !== aim && r !== q) - me) <= 1);
      if (ok.length) block.push(ok[Math.floor(Math.random() * ok.length)]);
    }
    for (const lane of block) {
      const key = c.obstacles[Math.floor(Math.random() * c.obstacles.length)];
      this.add('bad', key, lane, x);
    }
    const free = lanes.filter((q) => !block.includes(q));
    const pl = free[Math.floor(Math.random() * free.length)];
    for (let i = 0; i < c.pickRow; i++) this.add('good', c.pickup, pl, x + i * this.itemSize * 1.25 + this.itemSize * 0.6);
    this.wave += 1;
  }

  add(kind, key, lane, x) {
    const shadow = kind === 'bad' ? this.s.add.ellipse(x, 0, this.itemSize * this.cfg.obsScale * 0.9, this.itemSize * 0.22, 0x000000, 0.28) : null;
    if (shadow) this.s.fx.add(shadow);
    const img = this.img(key, this.itemSize * (kind === 'good' ? this.cfg.pickScale : this.cfg.obsScale), this.s.fx);
    if (kind === 'bad' && this.cfg.flipObstacles) img.setFlipX(true);
    this.items.push({ kind, key, lane, x, y: this.laneY(lane), img, shadow });
  }

  update(dt) {
    this.t += dt;
    if (!this.laneY) return;
    const u = this.u;
    this.lanes.update(dt);
    const run = this.playing ? 1 : this.s.state === 'end' ? 0.3 : 0;
    this.strip.scroll(this.speed * dt * run);
    // the vehicle: lane position, a little bounce, lean into lane changes
    const p = this.heroPose(this.l);
    const h = this.s.hero;
    if (this.s.state === 'play' || this.s.state === 'end') {
      const lean = (this.lanes.lane - this.lanes.pos) * -10;
      h.setPosition(p.x, p.y + Math.sin(this.t * 22) * 1.6 * u).setScale(this.s.heroScale(p.size) * (0.92 + 0.04 * this.lanes.pos)).setAngle(lean);
      if (this.cfg.flipHero) h.setFlipX(true);
      h.setAlpha(this.safe > 0 ? 0.45 + 0.55 * (Math.sin(this.t * 40) > 0 ? 1 : 0) : 1);
    }
    this.dust.setPosition(p.x - p.size * 0.45, this.laneY(this.lanes.pos) + this.laneH * 0.3);


    if (!this.playing) return;
    this.tickClock(dt);
    this.safe = Math.max(0, this.safe - dt);
    this.dist += dt;
    if (this.cfg.goal === 'distance') this.s.progress(Math.min(this.cfg.need, Math.floor((this.dist / this.cfg.time) * this.cfg.need + 0.001)));
    this.next -= dt;
    if (this.next <= 0) {
      this.spawnWave();
      this.next = this.cfg.every * rand(0.9, 1.1);
    }
    const hw = p.size * 0.38;
    for (const it of this.items) {
      it.x -= this.speed * dt;
      it.img.setPosition(it.x, it.y - (it.kind === 'good' ? Math.abs(Math.sin(this.t * 5 + it.x * 0.01)) * 8 * u : 0)).setScale(it.img.scale);
      if (it.shadow?.active) it.shadow.setPosition(it.x, it.y + it.img.displayHeight * 0.45);
      if (it.done) continue;
      const sameLane = Math.abs(this.lanes.pos - it.lane) < 0.45;
      if (sameLane && Math.abs(it.x - p.x) < hw + this.itemSize * 0.3) {
        if (it.kind === 'good') this.pick(it);
        else if (this.safe <= 0) this.crash(it);
      }
      if (it.x < -this.itemSize) {
        it.done = true;
        it.img.destroy();
        it.shadow?.destroy();
      }
    }
    this.items = this.items.filter((it) => !it.done || it.img.active);
  }

  pick(it) {
    const s = this.s;
    it.done = true;
    this.got += 1;
    if (this.cfg.goal === 'collect') s.progress(Math.min(this.cfg.need, this.got));
    this.cfg.onPick?.(this, it);
    s.services.audio.tone([783.99, 880, 1046.5, 1174.66][this.got % 4], { gain: 0.28, dur: 0.3 });
    s.tweens.add({ targets: it.img, y: it.y - 60 * this.u, scale: it.img.scale * 1.3, alpha: 0, duration: 260, onComplete: () => it.img.destroy() });
    if (this.cfg.goal === 'collect' && this.got >= this.cfg.need) s.time.delayedCall(300, () => this.end(true));
  }

  crash(it) {
    const s = this.s;
    it.done = true;
    this.lives -= 1;
    this.s.setLives(this.lives, this.cfg.lives);
    this.safe = 1.1;
    s.shake(0.012, 220);
    s.services.audio.play('hit');
    s.services.audio.noise({ dur: 0.35, freq: 700, to: 250, q: 0.8, gain: 0.5 });
    s.burst(it.x, it.y, [0xffffff, 0xffb347, 0x9aa3ad], 14, 0.9);
    s.flash(this.cfg.crashWord, it.x, it.y - this.laneH * 0.9, '#FFFFFF', '#B32F2F');
    it.shadow?.destroy();
    s.tweens.add({ targets: it.img, x: it.x + 140 * this.u, y: it.y - 90 * this.u, angle: 120, alpha: 0, duration: 450, ease: 'Quad.easeOut', onComplete: () => it.img.destroy() });
    if (this.lives <= 0) s.time.delayedCall(450, () => this.end(false));
  }

  timeUp() {
    if (this.cfg.goal === 'distance') {
      this.s.progress(this.cfg.need);
      this.end(true);
    } else this.end(this.got >= this.cfg.need);
  }

  // bot: stay in a lane with no obstacle coming, prefer the one with a pick-up
  laneScores() {
    const p = this.heroPose(this.l);
    const ahead = this.items.filter((it) => !it.done && it.x > p.x - p.size * 0.38 - this.itemSize * 0.5 && it.x < p.x + this.speed * 1.1);
    return [0, 1, 2].map((lane) => {
      let v = 0;
      for (const it of ahead) if (it.lane === lane) v += it.kind === 'bad' ? -100 / (1 + (it.x - p.x) / this.speed) : 3;
      return v - Math.abs(lane - this.lanes.lane) * 0.5;
    });
  }

  botWin() {
    const sc = this.laneScores();
    // one lane at a time, like a player: stay, or step to a neighbour that is clearly better
    const best = [this.lanes.lane - 1, this.lanes.lane, this.lanes.lane + 1].filter((q) => q >= 0 && q <= 2).sort((a, b) => sc[b] - sc[a])[0];
    if (best === this.lanes.lane || this.lanes.pos !== this.lanes.lane) return null;
    const vy = this.laneY(this.lanes.pos);
    return { ...this.tapAct(this.l.W * 0.6, vy + Math.sign(best - this.lanes.lane) * this.laneH), wait: 120 };
  }

  info() {
    const d = this.l.dpr;
    return { lane: this.lanes.lane, pos: this.lanes.pos, lives: this.lives, got: this.got, lanePx: this.laneH / d, vx: this.vx / d, scores: this.laneScores().map((x) => Math.round(x)), items: this.items.filter((it) => !it.done).map((it) => [it.kind[0], it.lane, Math.round(it.x / d)]) };
  }
}

const mowClip = (game, it) => {
  game.s.burst(it.x, it.y, [0x5fbf3a, 0x8fdc5a, 0x3e8f2a, 0xfff36a], 16, 0.9);
  game.s.services.audio.noise({ dur: 0.2, freq: 3200, q: 0.9, gain: 0.3 });
  if (game.got % 3 === 0) game.s.flash('MOWED!', it.x, it.y - game.laneH, '#FFE15A', '#3E8F2A');
};

const coinPick = (game, it) => {
  game.s.burst(it.x, it.y, [0xffd23f, 0xffffff], 10, 0.75);
  game.s.services.audio.play('coins');
};

export class MowDashGame extends DriveGame {
  constructor(shell) {
    super(shell, {
      ground: 'mg-lawn', groundScale: 1.25, groundShift: 0, ride: 0.18, vehScale: 1.9, speed: 0.85,
      time: 14, lives: 2, goal: 'collect', need: 8, every: 1.05, double: 0.25, pickRow: 3,
      pickup: 'mg-grass', pickScale: 1.05, obstacles: ['mg-gnome'], obsScale: 1.25, flipHero: true,
      crashWord: 'BONK!', dustTint: 0x8fdc5a, onPick: mowClip,
    });
  }
}

export class HighwayRideGame extends DriveGame {
  constructor(shell) {
    super(shell, {
      ground: 'mg-road', groundScale: 1.3, groundShift: 0.1, ride: 0.16, vehScale: 2.0, speed: 1.05,
      time: 11, lives: 3, goal: 'distance', need: 5, every: 1.0, double: 0.3, pickRow: 3,
      pickup: 'icon-coin', pickScale: 0.6, obstacles: ['mg-cone', 'mg-barrier'], obsScale: 1.0,
      crashWord: 'CRASH!', onPick: coinPick,
    });
  }
}

export class SundayDriveGame extends DriveGame {
  constructor(shell) {
    super(shell, {
      ground: 'mg-road', groundScale: 1.3, groundShift: 0.1, ride: 0.14, vehScale: 2.2, speed: 0.8,
      time: 14, lives: 2, goal: 'collect', need: 6, every: 1.2, double: 0.2, pickRow: 2,
      pickup: 'icon-coin', pickScale: 0.55, obstacles: ['mg-hay'], obsScale: 1.05,
      crashWord: 'OOF!', onPick: coinPick,
    });
  }
}
