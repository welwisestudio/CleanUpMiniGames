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
    const pic = scene.add.image(0, -ch * 0.12, picture);
    pic.setScale((cw * 0.7) / pic.width);
    card.add(pic);
    // reward pill
    const pill = nineSlice(scene, 'ui-pill', cw * 0.56, ch * 0.075, 0, ch * 0.165).setTint(COLORS.rewardPill);
    this.rewardIcon = fitImage(scene, 'icon-coin', ch * 0.06, cw * 0.06, ch * 0.165);
    card.add([
      pill,
      makeText(scene, -cw * 0.02, ch * 0.165, 'Reward :', { size: ch * 0.036, color: TEXT.neutral, weight: '900', family: FONT_UI, originX: 1 }),
      this.rewardIcon,
      makeText(scene, cw * 0.115, ch * 0.165, `+${reward.amount}`, { size: ch * 0.04, color: TEXT.neutral, weight: '900', family: FONT_UI, originX: 0 }),
    ]);
    const by = ch * 0.3;
    const bh = ch * 0.118;
    const home = new Button(scene, { id: 'result-home', x: -cw * 0.25, y: by, w: bh * 1.15, h: bh, style: 'yellow', icon: 'icon-home', iconSize: 0.6, onClick: onHome });
    const replay = new Button(scene, { id: 'result-replay', x: onNext ? cw * 0.0 : cw * 0.1, y: by, w: onNext ? cw * 0.28 : cw * 0.46, h: bh, label: 'Replay', style: 'green', onClick: onReplay });
    card.add([home.container, replay.container]);
    this.buttons = [home, replay];
    if (onNext) {
      const next = new Button(scene, { id: 'result-next', x: cw * 0.28, y: by, w: cw * 0.26, h: bh, label: 'Next', style: 'green', onClick: onNext });
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

  rewardIconWorld() {
    const m = this.rewardIcon.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
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
