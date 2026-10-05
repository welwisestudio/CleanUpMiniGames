import { LEVEL_META } from '../../content/generated/levelMeta.js';

// Glove-hand hint (reference: white glove at 10:04 / 10:28 and the screenshots). It moves the
// fingertip along the real finger path of the current gesture: rubbing zigzags, jet sweeps,
// dragging an item into the bin, rubbing a putty spot. Purely visual: it never calls a mechanic
// and is hidden as soon as the player touches the screen.

export class HintController {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.unit = 1;
    const tip = LEVEL_META.ui?.['ui-hint-hand']?.tip ?? [0.42, 0.04];
    this.hand = scene.add.image(0, 0, 'ui-hint-hand').setOrigin(tip[0], tip[1]).setDepth(300).setVisible(false);
    this.chain = null;
  }

  setUnit(u) {
    this.unit = u;
    this.base = (74 * u) / Math.max(this.hand.width, this.hand.height);
    if (!this.visible) this.hand.setScale(this.base);
  }

  show(points, { press = true, drag = false } = {}) {
    if (!points?.length) return;
    this.hide();
    this.visible = true;
    const h = this.hand;
    const base = this.base ?? 1;
    h.setVisible(true).setAlpha(0).setScale(base).setPosition(points[0].x, points[0].y);
    const seg = drag ? 900 : 420;
    const tweens = [
      { alpha: 1, duration: 220 },
      { scale: press ? base * 0.88 : base, duration: 160 },
      ...points.slice(1).map((p) => ({ x: p.x, y: p.y, duration: seg, ease: 'Sine.easeInOut' })),
      { scale: base, duration: 140 },
      { alpha: 0, duration: 260, delay: 200 },
      { x: points[0].x, y: points[0].y, duration: 0 },
    ];
    this.chain = this.scene.tweens.chain({ targets: h, tweens, loop: -1, loopDelay: 500 });
  }

  // Several separate strokes: for each one the hand appears at its start, presses, rubs along it
  // and lifts (fades) before the next one, so it never crosses areas that are not part of the work.
  showStrokes(strokes) {
    if (!strokes?.length) return;
    this.hide();
    this.visible = true;
    const h = this.hand;
    const base = this.base ?? 1;
    h.setVisible(true).setAlpha(0).setScale(base).setPosition(strokes[0][0].x, strokes[0][0].y);
    const tweens = [];
    for (const st of strokes) {
      tweens.push({ x: st[0].x, y: st[0].y, alpha: 0, duration: 0 });
      tweens.push({ alpha: 1, duration: 180 });
      tweens.push({ scale: base * 0.88, duration: 140 });
      for (const p of st.slice(1)) tweens.push({ x: p.x, y: p.y, duration: 520, ease: 'Sine.easeInOut' });
      tweens.push({ scale: base, duration: 120 });
      tweens.push({ alpha: 0, duration: 160 });
    }
    this.chain = this.scene.tweens.chain({ targets: h, tweens, loop: -1, loopDelay: 400 });
  }

  hide() {
    this.chain?.stop();
    this.chain = null;
    this.scene.tweens.killTweensOf(this.hand);
    this.hand.setVisible(false);
    this.visible = false;
  }

  destroy() {
    this.hide();
    this.hand.destroy();
  }
}
