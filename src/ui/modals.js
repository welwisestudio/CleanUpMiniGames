import { COLORS, FONT_DISPLAY, FONT_UI, TEXT } from './theme.js';
import { makeText } from './text.js';
import { Button } from './Button.js';
import { nineSlice, fitImage } from './kit.js';
import { refreshTextResolution } from './layout.js';
import { ASSET_META } from '../content/generated/assetMeta.js';

// Modals are built in the card texture's own pixel space inside one container, which is
// scaled to fit the screen on every layout change (aspect preserved, never stretched).

function dimLayer(scene) {
  // Deliberately NOT interactive: Phaser sorts hits by render order and invisible button zones
  // are not in the render list, so an interactive dim would swallow modal button presses.
  // Gameplay input under a modal is blocked by the scene state / pause reasons instead.
  return scene.add.rectangle(0, 0, 10, 10, COLORS.dim, 0.72).setOrigin(0, 0);
}

function cardBase(scene) {
  const [cw, ch] = ASSET_META.ui['ui-result-card'].size;
  const card = scene.add.container(0, 0);
  card.add(scene.add.image(0, 0, 'ui-result-card'));
  return { card, cw, ch };
}

// Ribbon title position on the generated card (measured on the asset: ribbon band ≈ 12 % from the top).
const RIBBON_Y = -0.375;
// Inner white panel of the card (fractions of card width / height from the centre).
const PANEL = { cx: -0.011, w: 0.627 };
const PIC = { y: -0.035, w: 0.74 }; // picture centre and width as a share of the panel width
const REWARD_Y = 0.19;
const BUTTONS_Y = 0.325;

function titleText(scene, cw, ch, str) {
  return makeText(scene, 0, ch * RIBBON_Y, str, {
    size: ch * 0.058,
    color: TEXT.white,
    family: FONT_DISPLAY,
    weight: '900',
    stroke: '#9A6B4E',
    strokeThickness: ch * 0.012,
    shadow: { y: ch * 0.004, color: 'rgba(90,50,30,0.45)' },
  });
}

// "Completed" result card (reference: Soccer_ball_completed_reward.PNG, video 01:01.75).
export class ResultCard {
  constructor(scene, { reward, picture, onHome, onReplay, onNext }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(500);
    this.dim = dimLayer(scene);
    this.root.add(this.dim);
    const { card, cw, ch } = cardBase(scene);
    this.card = card;
    this.cw = cw;
    this.ch = ch;
    card.add(titleText(scene, cw, ch, 'Completed'));
    // Everything is laid out on the card's inner white panel, measured on the generated card
    // (card px: x 147–672, y ≈ 300–950 below the ribbon), so contents stay centred inside it.
    const px = PANEL.cx * cw;
    const panelW = PANEL.w * cw;
    // Picture: smaller than the panel, with a soft drop shadow (Step 3 revision).
    const pic = scene.add.image(px, ch * PIC.y, picture);
    pic.setScale((panelW * PIC.w) / pic.width);
    const picW = pic.width * pic.scale;
    const picH = pic.height * pic.scale;
    const picShadow = scene.add.graphics();
    picShadow.fillStyle(0x6b4a33, 0.16).fillRoundedRect(px - picW / 2, ch * PIC.y - picH / 2 + ch * 0.012, picW, picH, picW * 0.07);
    card.add([picShadow, pic]);
    // Reward pill: label · coin · amount as one centred group.
    const pillY = ch * REWARD_Y;
    const pill = nineSlice(scene, 'ui-pill', panelW * 0.66, ch * 0.07, px, pillY).setTint(COLORS.rewardPill);
    const label = makeText(scene, 0, pillY, 'Reward :', { size: ch * 0.034, color: TEXT.neutral, weight: '900', family: FONT_UI, originX: 0 });
    const amount = makeText(scene, 0, pillY, `+${reward.amount}`, { size: ch * 0.038, color: TEXT.neutral, weight: '900', family: FONT_UI, originX: 0 });
    const iconBox = ch * 0.052;
    const gap = ch * 0.014;
    const groupW = label.width + gap + iconBox + gap + amount.width;
    let gx = px - groupW / 2;
    label.setX(gx);
    gx += label.width + gap;
    this.rewardIcon = fitImage(scene, 'icon-coin', iconBox, gx + iconBox / 2, pillY);
    gx += iconBox + gap;
    amount.setX(gx);
    card.add([pill, label, this.rewardIcon, amount]);
    // Buttons: one row, equal height, same baseline, symmetric about the panel centre.
    const by = ch * BUTTONS_Y;
    const bh = ch * 0.11; // ≥ 48 CSS px on a 390-px phone
    const rowW = panelW * 0.84;
    const bgap = cw * 0.03;
    const homeW = bh * 1.18;
    const wide = onNext ? (rowW - homeW - 2 * bgap) / 2 : rowW - homeW - bgap;
    let bx = px - rowW / 2;
    const home = new Button(scene, { id: 'result-home', x: bx + homeW / 2, y: by, w: homeW, h: bh, style: 'yellow', icon: 'icon-home', iconSize: 0.58, onClick: onHome });
    bx += homeW + bgap;
    const replay = new Button(scene, { id: 'result-replay', x: bx + wide / 2, y: by, w: wide, h: bh, label: 'Replay', style: 'green', onClick: onReplay });
    card.add([home.container, replay.container]);
    this.buttons = [home, replay];
    if (onNext) {
      bx += wide + bgap;
      const next = new Button(scene, { id: 'result-next', x: bx + wide / 2, y: by, w: wide, h: bh, label: 'Next', style: 'green', onClick: onNext });
      card.add(next.container);
      this.buttons.push(next);
    }
    this.root.add(card);
    this.layout(scene.layout);
    // Pop in (STYLE-GUIDE §10): scale 0.8 → 1.05 → 1 of the fitted scale.
    const k = card.scale;
    card.setScale(k * 0.8).setAlpha(0);
    this.dim.setAlpha(0);
    scene.tweens.add({ targets: this.dim, alpha: 1, duration: 200 });
    scene.tweens.add({
      targets: card,
      alpha: 1,
      scale: k * 1.05,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => scene.tweens.add({ targets: card, scale: this.fitScale, duration: 90, onComplete: () => refreshTextResolution(scene) }),
    });
  }

  layout(l) {
    this.dim.setSize(l.W, l.H);
    const maxW = Math.min(l.W * 0.92, 440 * l.u);
    const maxH = l.H * 0.86;
    this.fitScale = Math.min(maxW / this.cw, maxH / this.ch);
    this.card.setPosition(l.W / 2, l.H * 0.54).setScale(this.fitScale);
  }

  // Where the reward coin will sit once the pop-in has settled at the fitted scale.
  rewardIconWorld() {
    const m = this.rewardIcon.getWorldTransformMatrix();
    const k = this.fitScale / this.card.scale;
    return { x: this.card.x + (m.tx - this.card.x) * k, y: this.card.y + (m.ty - this.card.y) * k };
  }

  // On-screen size of the reward coin at its final (fitted) card scale.
  rewardIconWorldSize() {
    const m = this.rewardIcon.getWorldTransformMatrix();
    const k = this.fitScale / this.card.scale; // the card may still be popping in
    return Math.hypot(m.a, m.b) * k * Math.max(this.rewardIcon.width, this.rewardIcon.height);
  }

  setEnabled(v) {
    this.buttons.forEach((b) => b.setEnabled(v));
  }

  destroy() {
    this.buttons.forEach((b) => b.destroy());
    this.root.destroy();
  }
}

export class PauseModal {
  constructor(scene, { onResume, onRestart, onMenu }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(600);
    this.dim = dimLayer(scene).setAlpha(0.6);
    this.root.add(this.dim);
    const { card, cw, ch } = cardBase(scene);
    this.card = card;
    this.cw = cw;
    this.ch = ch;
    card.add(titleText(scene, cw, ch, 'Paused'));
    const bw = cw * 0.62;
    const bh = ch * 0.105;
    const resume = new Button(scene, { id: 'pause-resume', x: 0, y: -ch * 0.12, w: bw, h: bh, label: 'Resume', style: 'green', onClick: onResume });
    const restart = new Button(scene, { id: 'pause-restart', x: 0, y: ch * 0.04, w: bw, h: bh, label: 'Restart', style: 'yellow', onClick: onRestart });
    const menu = new Button(scene, { id: 'pause-menu', x: 0, y: ch * 0.2, w: bw, h: bh, label: 'Menu', style: 'white', onClick: onMenu });
    card.add([resume.container, restart.container, menu.container]);
    this.buttons = [resume, restart, menu];
    this.root.add(card);
    this.layout(scene.layout);
    refreshTextResolution(scene);
  }

  layout(l) {
    this.dim.setSize(l.W, l.H);
    const s = Math.min(Math.min(l.W * 0.86, 380 * l.u) / this.cw, (l.H * 0.8) / this.ch);
    this.card.setPosition(l.W / 2, l.H / 2).setScale(s);
  }

  setEnabled(v) {
    this.buttons.forEach((b) => b.setEnabled(v));
  }

  destroy() {
    this.buttons.forEach((b) => b.destroy());
    this.root.destroy();
  }
}
