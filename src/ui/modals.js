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
    // Same label size for the green row buttons (consistent, centred text).
    const labels = this.buttons.map((b) => b.label).filter(Boolean);
    const labelScale = Math.min(...labels.map((t) => t.scaleX));
    labels.forEach((t) => t.setScale(labelScale));
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
  constructor(scene, { onResume, onRestart, onMenu, onSettings }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(600);
    this.dim = dimLayer(scene).setAlpha(0.6);
    this.root.add(this.dim);
    const { card, cw, ch } = cardBase(scene);
    this.card = card;
    this.cw = cw;
    this.ch = ch;
    card.add(titleText(scene, cw, ch, 'Paused'));
    const bw = cw * 0.56;
    const bh = ch * 0.095;
    const px = PANEL.cx * cw; // centred on the card's inner panel
    const rows = [-0.155, -0.035, 0.085, 0.205];
    const resume = new Button(scene, { id: 'pause-resume', x: px, y: ch * rows[0], w: bw, h: bh, label: 'Resume', style: 'green', onClick: onResume });
    const restart = new Button(scene, { id: 'pause-restart', x: px, y: ch * rows[1], w: bw, h: bh, label: 'Restart', style: 'yellow', onClick: onRestart });
    const settings = new Button(scene, { id: 'pause-settings', x: px, y: ch * rows[2], w: bw, h: bh, label: 'Settings', style: 'white', onClick: onSettings });
    const menu = new Button(scene, { id: 'pause-menu', x: px, y: ch * rows[3], w: bw, h: bh, label: 'Menu', style: 'white', onClick: onMenu });
    card.add([resume.container, restart.container, settings.container, menu.container]);
    this.buttons = [resume, restart, settings, menu];
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

// Settings: sound, music, vibration toggles (reference 12:30). Values live in the save; the audio
// service reads them through its gate. Used from the menu gear and from the pause window.
export class SettingsModal {
  constructor(scene, { save, onClose, depth = 650 }) {
    this.scene = scene;
    this.save = save;
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.dim = dimLayer(scene).setAlpha(0.6);
    this.root.add(this.dim);
    const { card, cw, ch } = cardBase(scene);
    this.card = card;
    this.cw = cw;
    this.ch = ch;
    card.add(titleText(scene, cw, ch, 'Settings'));
    const px = PANEL.cx * cw;
    const panelW = PANEL.w * cw;
    const rowH = ch * 0.11;
    const rows = [
      { key: 'sound', label: 'Sound', icon: 'icon-sound' },
      { key: 'music', label: 'Music', icon: 'icon-music' },
      { key: 'vibration', label: 'Vibration', icon: 'icon-vibration' },
    ];
    this.toggles = [];
    rows.forEach((r, i) => {
      const y = -ch * 0.15 + i * rowH * 1.15;
      const left = px - panelW / 2 + panelW * 0.08;
      const icon = fitImage(scene, r.icon, rowH * 0.62, left + rowH * 0.31, y);
      const label = makeText(scene, left + rowH * 0.75, y, r.label, { size: ch * 0.036, color: TEXT.navy, weight: '900', family: FONT_UI, originX: 0 });
      const tx = px + panelW / 2 - panelW * 0.08 - rowH * 0.7;
      const toggle = scene.add.image(tx, y, 'ui-toggle-on');
      toggle.setScale((rowH * 1.4) / toggle.width);
      const zone = scene.add.zone(tx, y, rowH * 1.6, rowH).setInteractive({ useHandCursor: true });
      const sync = () => toggle.setTexture(this.save.get(`settings.${r.key}`) ? 'ui-toggle-on' : 'ui-toggle-off');
      zone.on('pointerup', () => {
        this.save.update((st) => (st.settings[r.key] = !st.settings[r.key])).catch(() => {});
        sync();
      });
      sync();
      card.add([icon, label, toggle, zone]);
      this.toggles.push({ key: r.key, zone, toggle });
      scene.qaTargets?.set(`settings-${r.key}`, { get x() { return zone.getWorldTransformMatrix().tx; }, get y() { return zone.getWorldTransformMatrix().ty; }, w: 10, h: 10 });
    });
    const close = new Button(scene, { id: 'settings-close', x: px, y: ch * 0.24, w: panelW * 0.62, h: ch * 0.1, label: 'OK', style: 'green', onClick: onClose });
    card.add(close.container);
    this.buttons = [close];
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
    for (const k of ['sound', 'music', 'vibration']) this.scene.qaTargets?.delete(`settings-${k}`);
    this.root.destroy();
  }
}
