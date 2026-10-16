// Toolbox → Tool Memory (expansion 2026-10-16, Memory system: pairs). Six cards fly out of the
// cleaned toolbox showing three tools (the game's own tool sprites), stay face-up for a moment,
// then flip. Tap two cards — a matching pair stays open. Find all three pairs; five wrong pairs or
// the 20 s timer end the round. Cards are big (phone-first) and the preview is generous.
import { BaseGame, shuffledPairs } from '../systems/kit.js';

const KINDS = ['tool-hammer', 'tool-screwdriver', 'tool-paint-brush'];
const MAX_WRONG = 4;
const PREVIEW = 1.8;

export class ToolMemoryGame extends BaseGame {
  constructor(shell) {
    super(shell, { time: 20 });
    this.order = shuffledPairs(KINDS);
    this.cards = this.order.map((kind, i) => {
      const c = shell.add.container(0, 0);
      const g = shell.add.graphics();
      const face = shell.add.image(0, 0, kind);
      c.add([g, face]);
      shell.fx.add(c);
      return { i, kind, c, g, face, open: true, matched: false };
    });
    this.picked = [];
    this.busy = true;
    this.pairs = 0;
    this.wrong = 0;
  }

  heroPose(l) {
    const size = Math.min(l.W * 0.5, 280 * l.u, l.H * 0.24);
    return { x: l.W / 2, y: l.H - l.margin - 70 * l.u - size * 0.36, size, angle: 0 };
  }

  layout(l) {
    const f = this.field();
    const hb = this.heroBox();
    const top = f.y0 + 6 * l.u;
    const bottom = hb.y0 - 16 * l.u;
    const gap = 14 * l.u;
    // a centred 3 x 2 grid whenever two rows fit; one row of 6 only on very short screens
    const twoRows = l.W < l.H || bottom - top > 300 * l.u;
    const cols = twoRows ? 3 : 6;
    const rows = twoRows ? 2 : 1;
    const cw = Math.min((f.x1 - f.x0 - gap * (cols - 1)) / cols, 160 * l.u, ((bottom - top - gap * (rows - 1)) / rows) * 0.78);
    const ch = cw * 1.28;
    this.cw = cw;
    this.ch = ch;
    const y0 = (top + bottom) / 2 - ((ch + gap) * rows - gap) / 2 + ch / 2;
    this.cards.forEach((c) => {
      c.x = l.W / 2 + ((c.i % cols) - (cols - 1) / 2) * (cw + gap);
      c.y = y0 + Math.floor(c.i / cols) * (ch + gap);
      if (this.dealt) c.c.setPosition(c.x, c.y);
      this.drawCard(c);
    });
  }

  drawCard(c) {
    const u = this.u;
    const { cw, ch } = this;
    const g = c.g.clear();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-cw / 2 + 3 * u, -ch / 2 + 6 * u, cw, ch, 16 * u);
    if (c.open) {
      g.fillStyle(c.matched ? 0xfff4c2 : 0xffffff, 1).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 16 * u);
      g.lineStyle(5 * u, c.matched ? 0xffc93c : 0x2f4e8c, 1).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 16 * u);
      c.face.setVisible(true).setScale((Math.min(cw, ch) * 0.78) / Math.max(c.face.width, c.face.height)).setAngle(-35);
    } else {
      // the back: toolbox red with a riveted metal plate
      g.fillStyle(0xd8342c, 1).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 16 * u);
      g.fillStyle(0xf05a4a, 1).fillRoundedRect(-cw / 2 + 6 * u, -ch / 2 + 6 * u, cw - 12 * u, ch * 0.42, 12 * u);
      g.lineStyle(5 * u, 0x8e1c18, 1).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 16 * u);
      g.fillStyle(0xd9dde3, 1).fillRoundedRect(-cw * 0.28, -ch * 0.14, cw * 0.56, ch * 0.28, 8 * u);
      g.lineStyle(3 * u, 0x8b929c, 1).strokeRoundedRect(-cw * 0.28, -ch * 0.14, cw * 0.56, ch * 0.28, 8 * u);
      for (const [x, y] of [[-0.2, -0.08], [0.2, -0.08], [-0.2, 0.08], [0.2, 0.08]]) g.fillStyle(0x8b929c, 1).fillCircle(cw * x, ch * y, 3.5 * u);
      g.fillStyle(0xffffff, 0.9).fillCircle(0, 0, 9 * u);
      g.fillStyle(0x2f4e8c, 1).fillCircle(0, 0, 5 * u);
      c.face.setVisible(false);
    }
  }

  begin() {
    // deal: the cards fly out of the toolbox, face-up, then flip after the preview
    const s = this.s;
    const hb = this.heroBox();
    this.cards.forEach((c, k) => {
      c.c.setPosition(hb.x, hb.y).setScale(0.2).setAlpha(0);
      s.tweens.add({ targets: c.c, x: c.x, y: c.y, scale: 1, alpha: 1, delay: k * 70, duration: 420, ease: 'Back.easeOut' });
    });
    s.services.audio.play('ui-pop');
    s.time.delayedCall(450 + this.cards.length * 70, () => {
      this.dealt = true;
      s.time.delayedCall(PREVIEW * 1000, () => {
        this.cards.forEach((c) => this.flip(c, false));
        s.time.delayedCall(260, () => (this.busy = false));
      });
    });
  }

  flip(c, open, done) {
    this.s.tweens.add({
      targets: c.c,
      scaleX: 0,
      duration: 110,
      ease: 'Quad.easeIn',
      onComplete: () => {
        c.open = open;
        this.drawCard(c);
        this.s.tweens.add({ targets: c.c, scaleX: 1, duration: 120, ease: 'Quad.easeOut', onComplete: done });
      },
    });
  }

  cardAt(x, y) {
    return this.cards.find((c) => !c.matched && !c.open && Math.abs(x - c.x) < this.cw * 0.55 && Math.abs(y - c.y) < this.ch * 0.55);
  }

  onDown(p) {
    if (!this.playing || this.busy) return;
    const c = this.cardAt(p.x, p.y);
    if (!c) return;
    this.s.services.audio.play('ui-tap');
    this.picked.push(c);
    this.flip(c, true);
    if (this.picked.length < 2) return;
    this.busy = true;
    const [a, b] = this.picked;
    this.picked = [];
    this.s.time.delayedCall(300, () => (a.kind === b.kind ? this.match(a, b) : this.miss(a, b)));
  }

  match(a, b) {
    const s = this.s;
    a.matched = b.matched = true;
    this.pairs += 1;
    s.progress(this.pairs);
    for (const c of [a, b]) {
      this.drawCard(c);
      s.tweens.add({ targets: c.c, scale: 1.12, duration: 120, yoyo: true });
      s.burst(c.x, c.y, [0xffd23f, 0xffffff, 0x4fc84b], 10, 0.8);
    }
    s.flash(this.pairs === KINDS.length ? 'ALL FOUND!' : 'MATCH!', (a.x + b.x) / 2, Math.min(a.y, b.y) - this.ch * 0.6, '#FFE15A', '#B4501E');
    s.services.audio.play('place');
    s.services.audio.bell(659.25 * [1, 1.25, 1.5][this.pairs - 1]);
    this.bounceHero(1.05);
    if (this.pairs >= KINDS.length) return s.time.delayedCall(350, () => this.end(true));
    this.busy = false;
  }

  miss(a, b) {
    const s = this.s;
    this.wrong += 1;
    for (const c of [a, b]) s.tweens.add({ targets: c.c, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => c.c.setAngle(0) });
    s.services.audio.play('error');
    s.time.delayedCall(520, () => {
      this.flip(a, false);
      this.flip(b, false, () => {
        if (this.wrong > MAX_WRONG) return this.end(false);
        this.busy = false;
      });
    });
  }

  timeUp() {
    this.end(false);
  }

  update(dt) {
    this.t += dt;
    if (!this.busy || this.dealt) this.tickClock(dt);
  }

  botWin() {
    if (this.busy) return null;
    const open = this.picked[0];
    const pick = open ? this.cards.find((c) => c !== open && c.kind === open.kind) : this.cards.find((c) => !c.matched && !c.open);
    return pick ? { ...this.tapAct(pick.x, pick.y), wait: 120 } : null;
  }

  botLose() {
    if (this.busy) return null;
    const open = this.picked[0];
    const pick = open ? this.cards.find((c) => !c.matched && !c.open && c.kind !== open.kind) : this.cards.find((c) => !c.matched && !c.open);
    return pick ? { ...this.tapAct(pick.x, pick.y), wait: 120 } : null;
  }

  info() {
    return { pairs: this.pairs, wrong: this.wrong, busy: this.busy, cardW: this.cw / this.l.dpr };
  }
}
