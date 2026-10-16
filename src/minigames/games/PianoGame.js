// Upright Piano → Piano Notes (polished 2026-10-15). Three glowing target rings sit on the piano's
// own keyboard; glossy notes (generated sprite, tinted per lane) fall down three bright lanes in
// FRONT of the piano. Tap a ring (or anywhere in its lane) when the note reaches it — each hit plays
// the next note of a little melody. 9 notes; 6 hits win.
// Readability fix: the notes, lanes and rings are drawn on the shell's front layer (above the
// piano) — they were behind the piano before. Timing: slower fall, a wide window (±110 units,
// "PERFECT" inside ±40), notes never overlap in one lane.
const SEQ = [0, 1, 2, 1, 0, 2, 1, 2, 0];
const MELODY = [523.25, 659.25, 783.99, 659.25, 523.25, 783.99, 880, 783.99, 1046.5];
const NEED = 6;
const COLORS = [0xff6fa8, 0x45a3e6, 0xffd23f];
const SPAWN = 0.78; // s between notes
const FALL = 1.85; // s from spawn to the ring
const WINDOW = 110; // UI units either side of the ring
const PERFECT = 40;

export class PianoGame {
  constructor(shell) {
    this.s = shell;
    this.ownsHero = false;
    this.t = 0;
    this.next = 0;
    this.hitsN = 0;
    this.judged = 0;
    this.notes = [];
    this.flashes = [0, 0, 0];
    this.missFlash = [0, 0, 0];
    this.lanesG = shell.add.graphics();
    this.ringsG = shell.add.graphics();
    this.noteLayer = shell.add.container(0, 0);
    // front layer: above the piano (hero) — never hidden behind it
    shell.fx.add([this.lanesG, this.ringsG, this.noteLayer]);
  }

  heroPose(l) {
    return { x: l.W / 2, y: l.H * 0.68, size: Math.min(l.W * 0.92, 470 * l.u), angle: 0 };
  }

  layout(l) {
    const p = this.heroPose(l);
    const h = this.s.hero;
    const hw = h.width ? p.size * (h.width / Math.max(h.width, h.height)) : p.size;
    const hh = h.width ? p.size * (h.height / Math.max(h.width, h.height)) : p.size;
    this.keyY = p.y - hh / 2 + hh * 0.43; // the piano's keyboard line
    this.lanes = [0.31, 0.52, 0.73].map((k) => p.x - hw / 2 + hw * k);
    this.topY = l.margin + 150 * l.u;
    // rings never overlap: radius limited by the lane spacing
    this.r = Math.min(34 * l.u, (this.lanes[1] - this.lanes[0]) * 0.4);
    this.noteSize = this.r * 1.7;
  }

  start() {
    this.layout(this.s.layout);
  }

  lane(x) {
    let best = -1;
    let bd = Infinity;
    this.lanes.forEach((lx, i) => {
      const d = Math.abs(x - lx);
      if (d < bd) [best, bd] = [i, d];
    });
    return bd < (this.lanes[1] - this.lanes[0]) * 0.6 ? best : -1;
  }

  onDown(p) {
    const i = this.lane(p.x);
    if (i < 0 || this.s.state !== 'play') return;
    this.flashes[i] = 0.3;
    const u = this.s.layout.u;
    let best = null;
    for (const n of this.notes) {
      if (n.lane !== i || n.judged) continue;
      const d = Math.abs(n.y - this.keyY);
      if (d < WINDOW * u && (!best || d < Math.abs(best.y - this.keyY))) best = n;
    }
    if (!best) {
      this.s.services.audio.play('ui-tap'); // an empty tap: soft click, no penalty
      return;
    }
    best.judged = true;
    best.hit = true;
    this.judged += 1;
    this.hitsN += 1;
    this.s.progress(Math.min(NEED, this.hitsN));
    const perfect = Math.abs(best.y - this.keyY) < PERFECT * u;
    this.s.services.audio.tone(MELODY[best.idx]);
    this.s.burst(this.lanes[i], this.keyY, [COLORS[i], 0xffffff], perfect ? 16 : 10, 0.9);
    this.s.ring(this.lanes[i], this.keyY, this.r * 2.2, COLORS[i], 380);
    this.s.flash(perfect ? 'PERFECT!' : 'GOOD!', this.lanes[i], this.keyY - this.r * 2.4, '#FFFFFF', perfect ? '#B4501E' : '#5B2A9A');
    // the hit note pops upward and fades
    this.s.tweens.add({ targets: best.img, y: best.img.y - 40 * u, scale: best.img.scale * 1.5, alpha: 0, duration: 260, onComplete: () => best.img.destroy() });
    const h = this.s.hero;
    const base = this.s.heroScale(this.heroPose(this.s.layout).size);
    this.s.tweens.add({ targets: h, scale: base * 1.03, duration: 70, yoyo: true });
  }

  update(dt) {
    if (this.s.state !== 'play') {
      this.draw(dt);
      return;
    }
    this.t += dt;
    const u = this.s.layout.u;
    while (this.next < SEQ.length && this.t >= 0.7 + this.next * SPAWN) {
      const lane = SEQ[this.next];
      const img = this.s.add.image(this.lanes[lane], this.topY, 'mg-note').setTint(COLORS[lane]);
      img.setScale(this.noteSize / Math.max(img.width, img.height)).setAlpha(0);
      this.s.tweens.add({ targets: img, alpha: 1, duration: 180 });
      this.noteLayer.add(img);
      this.notes.push({ lane, idx: this.next, y: this.topY, img });
      this.next += 1;
    }
    const speed = (this.keyY - this.topY) / FALL;
    for (const n of this.notes) {
      if (n.hit) continue;
      n.y += speed * dt;
      n.img.setPosition(this.lanes[n.lane], n.y).setAngle(Math.sin((this.t + n.idx) * 5) * 6);
      if (!n.judged && n.y > this.keyY + WINDOW * u) {
        n.judged = true;
        this.judged += 1;
        this.missFlash[n.lane] = 0.35;
        n.img.setTint(0x8c93a3);
        this.s.tweens.add({ targets: n.img, alpha: 0, duration: 300, onComplete: () => n.img.destroy() });
        this.s.flash('miss', this.lanes[n.lane], this.keyY + this.r * 1.6, '#D6DCE8', '#5C6B85');
      }
    }
    this.notes = this.notes.filter((n) => !n.hit && !(n.judged && n.y > this.keyY + WINDOW * u + 1));
    this.draw(dt);
    if (this.judged >= SEQ.length) this.s.finish(this.hitsN >= NEED);
  }

  draw(dt) {
    if (!this.lanes) return;
    const u = this.s.layout.u;
    // lanes: soft glowing tracks from the top down to the rings
    const lg = this.lanesG.clear();
    this.lanes.forEach((x, i) => {
      const w = this.r * 1.5;
      lg.fillStyle(COLORS[i], 0.14).fillRoundedRect(x - w / 2, this.topY - this.r, w, this.keyY - this.topY + this.r, w / 2);
      lg.lineStyle(2 * u, COLORS[i], 0.45).strokeRoundedRect(x - w / 2, this.topY - this.r, w, this.keyY - this.topY + this.r, w / 2);
    });
    // rings: the target zone, glowing on a tap, red-ish on a miss; the window shown as a soft halo
    const g = this.ringsG.clear();
    this.lanes.forEach((x, i) => {
      this.flashes[i] = Math.max(0, this.flashes[i] - dt);
      this.missFlash[i] = Math.max(0, this.missFlash[i] - dt);
      const f = this.flashes[i] * 3.3;
      const m = this.missFlash[i] * 2.8;
      g.fillStyle(COLORS[i], 0.22 + 0.35 * f).fillCircle(x, this.keyY, this.r * (1.45 + 0.35 * f));
      g.fillStyle(0x1a0f3a, 0.55).fillCircle(x, this.keyY, this.r);
      g.lineStyle(6 * u, m > 0 ? 0xff5a5a : COLORS[i], 1).strokeCircle(x, this.keyY, this.r);
      g.lineStyle(2 * u, 0xffffff, 0.9).strokeCircle(x, this.keyY, this.r * 0.62);
    });
  }

  qa() {
    const d = this.s.layout.dpr;
    return { keyY: this.keyY / d, lanes: this.lanes.map((x) => x / d), notes: this.notes.filter((n) => !n.judged).map((n) => ({ id: n.idx, lane: n.lane, y: n.y / d })), hits: this.hitsN, judged: this.judged, total: SEQ.length, notesInFront: this.noteLayer.parentContainer === this.s.fx };
  }
}
