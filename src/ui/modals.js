import { COLORS, FONT_DISPLAY, FONT_UI, TEXT } from './theme.js';
import { makeText } from './text.js';
import { Button } from './Button.js';
import { nineSlice, fitImage } from './kit.js';
import { refreshTextResolution } from './layout.js';
import { centerRow } from './text.js';
import { ChestProgressRow } from './rewards.js';
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

// Ribbon title position: centre of the ribbon's front band including its darker lower edge
// (card rows ≈ 90–224 of 1024), verified on the rendered screen by
// scripts/check_result_alignment.py.
export const RIBBON_Y = -0.346;
// Vertical centre of a pill's flat face (above its darker lower lip), share of the pill height.
const PILL_FACE = -0.06;
// Inner white panel of the card (fractions of card width / height from the centre).
const PANEL = { cx: -0.011, w: 0.627 };
// Result card rows (fractions of the card height from its centre), top to bottom (Step 6 reward
// pass): picture · reward pill · level-chest bar · x3 offer · Home / Replay / Next.
const RESULT = { picY: -0.165, picW: 0.6, rewardY: 0.005, rewardH: 0.066, chestY: 0.088, x3Y: 0.194, x3H: 0.116, navY: 0.324 };

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

// "Completed" result card (reference: Soccer_ball_completed_reward.PNG, video 01:01.75) with the
// x3 rewarded offer and the level-progress chest bar (references Reward_x3_reference,
// Level_progress_chest_reference). The base reward is already credited when the card opens;
// x3 adds the rest through a rewarded ad. Every value comes from RewardService.
export class ResultCard {
  constructor(scene, { reward, picture, x3, chest, onX3, onOpenChest, onHome, onReplay, onNext }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(500);
    this.dim = dimLayer(scene);
    this.root.add(this.dim);
    const { card, cw, ch } = cardBase(scene);
    this.card = card;
    this.cw = cw;
    this.ch = ch;
    card.add(titleText(scene, cw, ch, 'Completed'));
    const px = PANEL.cx * cw;
    const panelW = PANEL.w * cw;
    this.px = px;
    this.panelW = panelW;
    // Picture with a soft drop shadow (Step 3 revision), smaller now to make room for the offers.
    const pic = scene.add.image(px, ch * RESULT.picY, picture);
    pic.setScale((panelW * RESULT.picW) / pic.width);
    const picW = pic.width * pic.scale;
    const picH = pic.height * pic.scale;
    const picShadow = scene.add.graphics();
    picShadow.fillStyle(0x6b4a33, 0.16).fillRoundedRect(px - picW / 2, ch * RESULT.picY - picH / 2 + ch * 0.01, picW, picH, picW * 0.07);
    card.add([picShadow, pic]);
    // Reward pill: label · coin · amount as one centred group.
    const pillY = ch * RESULT.rewardY;
    this.pill = nineSlice(scene, 'ui-pill', panelW * 0.66, ch * RESULT.rewardH, px, pillY).setTint(COLORS.rewardPill);
    this.rewardLabel = makeText(scene, 0, pillY, 'Reward :', { size: ch * 0.032, color: TEXT.neutral, weight: '900', family: FONT_UI });
    this.amount = makeText(scene, 0, pillY, `+${reward.amount}`, { size: ch * 0.036, color: TEXT.neutral, weight: '900', family: FONT_UI });
    this.rewardIcon = fitImage(scene, 'icon-coin', ch * 0.05);
    card.add([this.pill, this.rewardLabel, this.rewardIcon, this.amount]);
    this._layoutPill();
    // Level-progress chest bar (tap opens the offer when the chest is full).
    this.chestRow = new ChestProgressRow(scene, { cx: px, cy: ch * RESULT.chestY, w: panelW * 0.8, h: ch * 0.046 });
    this.chestRow.set(chest?.from ?? 0);
    this.chestZone = scene.add.zone(px, ch * RESULT.chestY, panelW * 0.8, ch * 0.08).setInteractive({ useHandCursor: true });
    this.chestZone.on('pointerup', () => this.chestReady && this.enabled && onOpenChest?.());
    card.add([this.chestRow.container, this.chestZone]);
    // x3 offer (rewarded ad): purple reward button; on the left the watch-ad clapperboard icon
    // (reference icon from the designer); then a large "Claim x3" with "x3" in yellow. Icon + text
    // are one group centred on the button; text on the button's optical label centre.
    this.buttons = [];
    const x3h = ch * RESULT.x3H;
    this.x3 = new Button(scene, { id: 'result-x3', x: px, y: ch * RESULT.x3Y, w: panelW * 0.88, h: x3h, style: 'purple', onClick: () => onX3?.() });
    this.x3Ad = fitImage(scene, 'icon-ad-clapper', x3h * 0.7);
    this.x3Plate = this.x3Ad; // the icon is its own tile (no separate plate)
    const fs = x3h * 0.42;
    const outline = { stroke: '#4B1D7A', strokeThickness: fs * 0.18 };
    this.x3Label = makeText(scene, 0, 0, 'Claim', { size: fs, color: TEXT.white, family: FONT_DISPLAY, weight: '900', ...outline });
    this.x3Mult = makeText(scene, 0, 0, 'x3', { size: fs * 1.3, color: '#FFE45C', family: FONT_DISPLAY, weight: '900', ...outline });
    this.x3Msg = makeText(scene, 0, 0, '', { size: fs * 0.9, color: TEXT.white, family: FONT_DISPLAY, weight: '900', ...outline }).setVisible(false);
    this.x3.container.add([this.x3Ad, this.x3Label, this.x3Mult, this.x3Msg]);
    card.add(this.x3.container);
    this.buttons.push(this.x3);
    this.x3State = 'idle';
    // Buttons: one row, equal height, same baseline, symmetric about the panel centre.
    const by = ch * RESULT.navY;
    const bh = ch * 0.1; // ≥ 48 CSS px on a 390-px phone
    const rowW = panelW * 0.84;
    const bgap = cw * 0.03;
    const homeW = bh * 1.18;
    const wide = onNext ? (rowW - homeW - 2 * bgap) / 2 : rowW - homeW - bgap;
    let bx = px - rowW / 2;
    const home = new Button(scene, { id: 'result-home', x: bx + homeW / 2, y: by, w: homeW, h: bh, style: 'yellow', icon: 'icon-home', iconSize: 0.58, onClick: onHome });
    bx += homeW + bgap;
    const replay = new Button(scene, { id: 'result-replay', x: bx + wide / 2, y: by, w: wide, h: bh, label: 'Replay', style: 'green', onClick: onReplay });
    card.add([home.container, replay.container]);
    this.buttons.push(home, replay);
    if (onNext) {
      bx += wide + bgap;
      const next = new Button(scene, { id: 'result-next', x: bx + wide / 2, y: by, w: wide, h: bh, label: 'Next', style: 'green', onClick: onNext });
      card.add(next.container);
      this.buttons.push(next);
    }
    // Same label size for the green row buttons (consistent, centred text).
    const labels = [home, replay, ...this.buttons.slice(3)].map((b) => b.label).filter(Boolean);
    const labelScale = Math.min(...labels.map((t) => t.scaleX));
    labels.forEach((t) => t.setScale(labelScale));
    this.enabled = true;
    this.setX3State(x3?.available ? 'idle' : x3?.claimed ? 'granted' : 'gone');
    // read-only QA geometry (alignment checks): card, reward pill and chest bar rectangles
    const self = this;
    const rectOf = (obj, w, h) => ({
      get x() { return obj.getWorldTransformMatrix().tx; },
      get y() { return obj.getWorldTransformMatrix().ty; },
      get w() { return w * self.fitScale; },
      get h() { return h * self.fitScale; },
      visible: true,
    });
    scene.qaTargets?.set('result-card', rectOf(card, cw, ch));
    scene.qaTargets?.set('result-pill', rectOf(this.pill, panelW * 0.66, ch * RESULT.rewardH));
    scene.qaTargets?.set('result-chestbar', rectOf(this.chestRow.track, this.chestRow.barW, this.chestRow.h));
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

  _layoutPill() {
    const ch = this.ch;
    // label · coin · amount: one group centred on the pill's face
    centerRow([this.rewardLabel, this.rewardIcon, this.amount], this.px, ch * (RESULT.rewardY + RESULT.rewardH * PILL_FACE), ch * 0.014);
  }

  _layoutX3() {
    const h = this.x3.h;
    const msg = this.x3Msg.visible;
    const texts = msg ? [this.x3Msg] : [this.x3Label, this.x3Mult];
    const items = [this.x3Ad, ...texts];
    items.forEach((o) => {
      o.baseScale ??= { x: o.scaleX, y: o.scaleY };
      o.setScale(o.baseScale.x, o.baseScale.y);
    });
    const gapPlate = h * 0.16;
    const gapText = h * 0.1;
    const wText = texts.reduce((a, o) => a + o.displayWidth, 0) + gapText * (texts.length - 1);
    const total = this.x3Plate.displayWidth + gapPlate + wText;
    const k = Math.min(1, (this.x3.w * 0.88) / total); // long localized text: shrink the group
    if (k < 1) items.forEach((o) => o.setScale(o.baseScale.x * k, o.baseScale.y * k));
    const left = (-total * k) / 2;
    this.x3Ad.setPosition(left + this.x3Ad.displayWidth / 2, this.x3.faceY);
    const tx = left + this.x3Ad.displayWidth + gapPlate * k + (wText * k) / 2;
    centerRow(texts, tx, this.x3.labelY, gapText * k);
  }

  // x3 offer states: idle (offer) · busy (ad running) · granted (claimed) · gone (not offered).
  setX3State(state) {
    this.x3State = state;
    const show = (msg) => {
      this.x3Msg.setText(msg ?? '').setVisible(Boolean(msg));
      this.x3Label.setVisible(!msg);
      this.x3Mult.setVisible(!msg);
    };
    if (state === 'busy') show('Loading ad…');
    else if (state === 'idle') show(null);
    else if (state === 'granted') {
      const box = this.x3Ad.displayHeight;
      this.x3Ad.setTexture('icon-check');
      this.x3Ad.baseScale = null;
      this.x3Ad.setScale((box * 0.86) / Math.max(this.x3Ad.width, this.x3Ad.height));
      show('x3 claimed!');
    } else if (state === 'gone') this.x3.container.setVisible(false);
    this.x3Msg.baseScale = null;
    this.x3Msg.setScale(1);
    this._layoutX3();
    this.x3.setEnabled(state === 'idle' && this.enabled !== false);
    if (state === 'granted' || state === 'busy') this.x3.container.setAlpha(1);
    // gentle "look at me" pulse only while the offer is available
    this.x3Pulse?.stop();
    this.x3.container.setScale(this.x3.baseScale);
    if (state === 'idle') this.x3Pulse = this.scene.tweens.add({ targets: this.x3.container, scale: this.x3.baseScale * 1.04, duration: 420, yoyo: true, repeat: -1, repeatDelay: 1100, ease: 'Sine.easeInOut' });
    refreshTextResolution(this.scene);
  }

  // Short message on the x3 button (ad cancelled / failed), then back to the offer.
  flashX3(msg) {
    this.x3Msg.setText(msg).setVisible(true);
    this.x3Label.setVisible(false);
    this.x3Mult.setVisible(false);
    this.x3Msg.baseScale = null;
    this.x3Msg.setScale(1);
    this._layoutX3();
    refreshTextResolution(this.scene);
    this.scene.time.delayedCall(1400, () => this.x3State === 'idle' && this.setX3State('idle'));
  }

  setRewardAmount(v) {
    this.amount.setText(`+${v}`);
    this._layoutPill();
    this.scene.tweens.add({ targets: this.amount, scale: 1.3, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
  }

  setChestReady(ready) {
    this.chestReady = ready;
    this.chestRow.setGlow(ready);
  }

  layout(l) {
    this.dim.setSize(l.W, l.H);
    const maxW = Math.min(l.W * 0.92, 440 * l.u);
    const maxH = l.H * 0.9;
    this.fitScale = Math.min(maxW / this.cw, maxH / this.ch);
    this.card.setPosition(l.W / 2, l.H * 0.53).setScale(this.fitScale);
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
    this.enabled = v;
    this.buttons.forEach((b) => b.setEnabled(v && (b !== this.x3 || this.x3State === 'idle')));
    if (this.x3State === 'granted' || this.x3State === 'busy') this.x3.container.setAlpha(1);
  }

  destroy() {
    ['result-card', 'result-pill', 'result-chestbar'].forEach((k) => this.scene.qaTargets?.delete(k));
    this.x3Pulse?.stop();
    this.chestRow.setGlow(false);
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
