import Phaser from 'phaser';
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
// Result card rows (fractions of the card height from its centre), top to bottom: picture ·
// reward pill · level-chest bar · boost meter · boost button · Home + Replay · Next (rowW = share
// of the panel width used by the meter, the boost button and both button rows).
const RESULT = { picY: -0.18, picW: 0.46, rewardY: -0.055, rewardH: 0.062, chestY: 0.016, meterY: 0.078, meterH: 0.052, markerH: 0.024, boostY: 0.178, boostH: 0.098, row1Y: 0.28, row2Y: 0.374, rowH: 0.086, rowW: 0.86 };

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
// level-progress chest bar and the post-level boost: a multiplier meter (x2…x5) whose highlight
// travels back and forth; the player taps the pink button to lock the current multiplier, then
// the rewarded ad plays. The base reward is already credited when the card opens. Layout, top to
// bottom: picture · reward pill · chest bar · boost meter · boost button · Home + Replay · Next.
export class ResultCard {
  constructor(scene, { reward, picture, boost, chest, onBoost, onOpenChest, onHome, onReplay, onNext }) {
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
    const rowW = panelW * RESULT.rowW;
    this.rowW = rowW;
    // Picture with a soft drop shadow (Step 3 revision).
    const pic = scene.add.image(px, ch * RESULT.picY, picture);
    pic.setScale((panelW * RESULT.picW) / pic.width);
    const picW = pic.width * pic.scale;
    const picH = pic.height * pic.scale;
    const picShadow = scene.add.graphics();
    picShadow.fillStyle(0x6b4a33, 0.16).fillRoundedRect(px - picW / 2, ch * RESULT.picY - picH / 2 + ch * 0.01, picW, picH, picW * 0.07);
    card.add([picShadow, pic]);
    // Reward pill: label · coin · amount as one centred group on the pill's face.
    const pillY = ch * RESULT.rewardY;
    this.pill = nineSlice(scene, 'ui-pill', panelW * 0.66, ch * RESULT.rewardH, px, pillY).setTint(COLORS.rewardPill);
    this.rewardLabel = makeText(scene, 0, pillY, 'Reward :', { size: ch * 0.031, color: TEXT.neutral, weight: '900', family: FONT_UI });
    this.amount = makeText(scene, 0, pillY, `+${reward.amount}`, { size: ch * 0.035, color: TEXT.neutral, weight: '900', family: FONT_UI });
    this.rewardIcon = fitImage(scene, 'icon-coin', ch * 0.048);
    card.add([this.pill, this.rewardLabel, this.rewardIcon, this.amount]);
    this._layoutPill();
    // Level-progress chest bar (approved; tap opens the offer when the chest is full).
    this.chestRow = new ChestProgressRow(scene, { cx: px, cy: ch * RESULT.chestY, w: panelW * 0.8, h: ch * 0.044 });
    this.chestRow.set(chest?.from ?? 0);
    this.chestZone = scene.add.zone(px, ch * RESULT.chestY, panelW * 0.8, ch * 0.07).setInteractive({ useHandCursor: true });
    this.chestZone.on('pointerup', () => this.chestReady && this.enabled && onOpenChest?.());
    card.add([this.chestRow.container, this.chestZone]);
    this.buttons = [];
    this.base = reward.amount;
    this._buildBoost(boost, onBoost);
    // Buttons: row 1 = Home + Replay (wide, yellow, replay icon); row 2 = Next across the full row.
    const r1 = ch * RESULT.row1Y;
    const bh = ch * RESULT.rowH; // ≥ 48 CSS px on a 390-px phone
    const gap = cw * 0.025;
    const homeW = bh * 1.22;
    const left = px - rowW / 2;
    const home = new Button(scene, { id: 'result-home', x: left + homeW / 2, y: r1, w: homeW, h: bh, style: 'yellow', icon: 'icon-home', iconSize: 0.58, onClick: onHome });
    const replayW = rowW - homeW - gap;
    const replay = new Button(scene, { id: 'result-replay', x: left + homeW + gap + replayW / 2, y: r1, w: replayW, h: bh, label: 'Replay', style: 'yellow', icon: 'icon-replay', iconSize: 0.56, onClick: onReplay });
    card.add([home.container, replay.container]);
    this.buttons.push(home, replay);
    if (onNext) {
      const next = new Button(scene, { id: 'result-next', x: px, y: ch * RESULT.row2Y, w: rowW, h: bh, label: 'Next', style: 'green', icon: 'icon-next', iconSize: 0.52, onClick: onNext });
      card.add(next.container);
      this.buttons.push(next);
    }
    this.enabled = true;
    this.setBoostState(boost?.available ? 'idle' : boost?.claimed ? 'granted' : 'gone', boost?.boost);
    // read-only QA geometry (alignment checks): card, reward pill, chest bar, boost meter
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
    scene.qaTargets?.set('result-meter', rectOf(this.meter, rowW, ch * RESULT.meterH));
    scene.qaTargets?.set('result-marker', rectOf(this.marker, ch * RESULT.markerH, ch * RESULT.markerH));
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

  // ---- boost meter (reference: multiplier bar) ---------------------------------------------
  // Rounded green bar with a pale inner lane: zones x2 | x3 | x5 | x3 | x2 (x5 = orange centre).
  // A purple marker below the bar sweeps left ↔ right at constant speed; the zone above it is the
  // current multiplier (shown live on the button). A tap freezes the marker on that zone.
  _buildBoost(boost, onBoost) {
    const { scene, ch, px, rowW } = this;
    this.zones = boost?.zones ?? [2, 3, 5, 3, 2];
    this.sweepMs = boost?.sweepMs ?? 1100;
    const bh = ch * RESULT.meterH;
    this.meterBh = bh;
    this.meter = scene.add.container(px, ch * RESULT.meterY);
    const outer = nineSlice(scene, 'ui-btn-green', rowW, bh);
    const face = bh * -0.075; // the green surface's face centre
    const pad = bh * 0.2;
    const zoneW = (rowW - pad * 2) / this.zones.length;
    this.zoneW = zoneW;
    this.laneX0 = -rowW / 2 + pad;
    // inner segments: one shared height filling the green face evenly; each piece is placed so its
    // own flat face (above its darker lip: pill −0.06 h, orange −0.081 h) sits on the bar's face
    const segH = bh * 0.72;
    const lane = nineSlice(scene, 'ui-pill', zoneW * 3 + bh * 0.2, segH, 0, face + segH * 0.06).setTint(0xfff1c2);
    const centre = nineSlice(scene, 'ui-btn-orange', zoneW * 1.02, segH, 0, face + segH * 0.081);
    // soft glow behind the zone the marker is under (moves with it)
    this.zoneGlow = nineSlice(scene, 'ui-pill', zoneW * 0.94, segH, 0, face + segH * 0.06).setTint(0xffffff).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
    this.meter.add([outer, lane, centre, this.zoneGlow]);
    this.zoneTexts = this.zones.map((v, i) => {
      const x = this.laneX0 + zoneW * (i + 0.5);
      const isCentre = v === Math.max(...this.zones);
      const isEnd = i === 0 || i === this.zones.length - 1;
      const style = isCentre
        ? { color: TEXT.white, stroke: '#A8361A' }
        : isEnd
          ? { color: TEXT.white, stroke: TEXT.greenStroke }
          : { color: '#FFE08A', stroke: '#B0742A' };
      const t = makeText(scene, x, face + bh * 0.02, `x${v}`, { size: bh * 0.46, family: FONT_DISPLAY, weight: '900', strokeThickness: bh * (isCentre || isEnd ? 0.07 : 0.055), ...style });
      this.meter.add(t);
      return t;
    });
    // purple marker under the bar, pointing up at the current zone
    const mh = ch * RESULT.markerH;
    this.marker = scene.add.graphics();
    const mw = mh * 1.15;
    this.marker.fillStyle(0x6b2a9e, 1).fillTriangle(-mw / 2 - mh * 0.08, mh * 1.06, mw / 2 + mh * 0.08, mh * 1.06, 0, -mh * 0.08);
    this.marker.fillStyle(0xb35ce8, 1).fillTriangle(-mw / 2, mh, mw / 2, mh, 0, 0);
    this.marker.fillStyle(0xe2b6ff, 0.9).fillTriangle(-mw * 0.18, mh * 0.62, mw * 0.06, mh * 0.62, -mw * 0.04, mh * 0.18);
    this.marker.setY(bh / 2 - mh * 0.15);
    this.meter.add(this.marker);
    this.card.add(this.meter);
    // pink button: [ad] Claim  xN  [coin] total
    const bth = ch * RESULT.boostH;
    this.boostBtn = new Button(scene, { id: 'result-boost', x: px, y: ch * RESULT.boostY, w: rowW, h: bth, style: 'pink', onClick: () => onBoost?.() });
    const fs = bth * 0.4;
    const outline = { stroke: '#9C1458', strokeThickness: fs * 0.18 };
    this.bIcon = fitImage(scene, 'icon-ad-clapper', bth * 0.68);
    this.bClaim = makeText(scene, 0, 0, 'Claim', { size: fs, color: TEXT.white, family: FONT_DISPLAY, weight: '900', ...outline });
    this.bMult = makeText(scene, 0, 0, 'x2', { size: fs * 1.25, color: '#FFE45C', family: FONT_DISPLAY, weight: '900', ...outline });
    this.bCoin = fitImage(scene, 'icon-coin', bth * 0.42);
    this.bTotal = makeText(scene, 0, 0, '0', { size: fs, color: TEXT.white, family: FONT_DISPLAY, weight: '900', ...outline });
    this.bMsg = makeText(scene, 0, 0, '', { size: fs * 0.9, color: TEXT.white, family: FONT_DISPLAY, weight: '900', ...outline }).setVisible(false);
    this.boostBtn.container.add([this.bIcon, this.bClaim, this.bMult, this.bCoin, this.bTotal, this.bMsg]);
    this.card.add(this.boostBtn.container);
    this.buttons.push(this.boostBtn);
    this.idx = -1;
    this._setPos(0.02);
  }

  get boostValue() {
    return this.zones[Math.max(0, this.idx)];
  }

  // Marker position 0..1 along the lane → zone index → value shown on the button.
  _setPos(p) {
    this.pos = p;
    this.marker.setX(this.laneX0 + this.zoneW * this.zones.length * p);
    const idx = Math.min(this.zones.length - 1, Math.max(0, Math.floor(p * this.zones.length)));
    if (idx === this.idx) return;
    this.idx = idx;
    this.zoneTexts.forEach((t, i) => t.setScale(i === idx ? 1.22 : 1));
    this.zoneGlow.setX(this.laneX0 + this.zoneW * (idx + 0.5));
    this.bMult.setText(`x${this.boostValue}`);
    this.bTotal.setText(`${this.base * this.boostValue}`);
    this._layoutBoost();
  }

  _startCycle() {
    this._stopCycle();
    // constant-speed ping-pong sweep (every zone gets the same time)
    this.cycle = this.scene.tweens.addCounter({ from: 0.02, to: 0.98, duration: this.sweepMs, yoyo: true, repeat: -1, ease: 'Linear', onUpdate: (tw) => this._setPos(tw.getValue()) });
  }

  _stopCycle() {
    this.cycle?.stop();
    this.cycle = null;
  }

  // Player tap: freeze the marker on the current zone and return its multiplier.
  lockBoost() {
    this._stopCycle();
    const t = this.zoneTexts[this.idx];
    this.scene.tweens.add({ targets: t, scale: 1.5, duration: 150, yoyo: true, ease: 'Quad.easeOut', onComplete: () => t.setScale(1.22) });
    this.scene.tweens.add({ targets: this.marker, y: this.marker.y - this.meterBh * 0.08, duration: 120, yoyo: true });
    return this.boostValue;
  }

  _layoutBoost() {
    const btn = this.boostBtn;
    const h = btn.h;
    const msg = this.bMsg.visible;
    const items = msg ? [this.bIcon, this.bMsg] : [this.bIcon, this.bClaim, this.bMult, this.bCoin, this.bTotal];
    items.forEach((o) => {
      o.baseScale ??= { x: o.scaleX, y: o.scaleY };
      o.setScale(o.baseScale.x, o.baseScale.y);
    });
    const gaps = msg ? [h * 0.16] : [h * 0.16, h * 0.1, h * 0.12, h * 0.06];
    const total = items.reduce((a, o) => a + o.displayWidth, 0) + gaps.reduce((a, g) => a + g, 0);
    const k = Math.min(1, (btn.w * 0.9) / total); // long localized text: shrink the group
    if (k < 1) items.forEach((o) => o.setScale(o.baseScale.x * k, o.baseScale.y * k));
    let x = (-total * k) / 2;
    items.forEach((o, i) => {
      // icons on the face centre, text on the optical label centre
      const isText = o.type === 'Text';
      o.setPosition(x + o.displayWidth / 2, isText ? btn.labelY : btn.faceY);
      x += o.displayWidth + (gaps[i] ?? 0) * k;
    });
  }

  // boost states: idle (meter running) · locked (value chosen, ad starting) · busy (ad running) ·
  // granted (claimed) · gone (not offered)
  setBoostState(state, value) {
    this.boostState = state;
    const show = (msg) => {
      this.bMsg.setText(msg ?? '').setVisible(Boolean(msg));
      [this.bClaim, this.bMult, this.bCoin, this.bTotal].forEach((o) => o.setVisible(!msg));
      this.bMsg.baseScale = null;
      this.bMsg.setScale(1);
    };
    if (state === 'idle') {
      show(null);
      this._startCycle();
    } else if (state === 'locked') show(`x${this.boostValue} locked!`);
    else if (state === 'busy') show('Loading ad…');
    else if (state === 'granted') {
      // marker on the claimed zone (kept where it stopped; after a reload: the zone of that value
      // closest to the centre)
      if (value && this.boostValue !== value) {
        const mid = (this.zones.length - 1) / 2;
        const zi = this.zones.map((v, i) => [v, i]).filter(([v]) => v === value).sort((a, b) => Math.abs(a[1] - mid) - Math.abs(b[1] - mid))[0]?.[1] ?? 0;
        this._setPos((zi + 0.5) / this.zones.length);
      }
      const box = this.bIcon.displayHeight;
      this.bIcon.setTexture('icon-check');
      this.bIcon.baseScale = null;
      this.bIcon.setScale((box * 0.86) / Math.max(this.bIcon.width, this.bIcon.height));
      show(`x${value ?? this.boostValue} claimed!`);
    } else if (state === 'gone') {
      this.boostBtn.container.setVisible(false);
      this.meter.setVisible(false);
    }
    if (state !== 'idle') this._stopCycle();
    this._layoutBoost();
    this.boostBtn.setEnabled(state === 'idle' && this.enabled !== false);
    if (state !== 'idle' && state !== 'gone') this.boostBtn.container.setAlpha(1);
    // gentle "look at me" pulse only while the offer is open
    this.boostPulse?.stop();
    this.boostBtn.container.setScale(this.boostBtn.baseScale);
    if (state === 'idle') this.boostPulse = this.scene.tweens.add({ targets: this.boostBtn.container, scale: this.boostBtn.baseScale * 1.035, duration: 420, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Sine.easeInOut' });
    refreshTextResolution(this.scene);
  }

  // Short message on the boost button (ad cancelled / failed), then the meter runs again.
  flashBoost(msg) {
    this.bMsg.setText(msg).setVisible(true);
    [this.bClaim, this.bMult, this.bCoin, this.bTotal].forEach((o) => o.setVisible(false));
    this.bMsg.baseScale = null;
    this.bMsg.setScale(1);
    this._layoutBoost();
    refreshTextResolution(this.scene);
    this.scene.time.delayedCall(1300, () => this.boostState === 'idle' && this.setBoostState('idle'));
  }

  _layoutPill() {
    const ch = this.ch;
    centerRow([this.rewardLabel, this.rewardIcon, this.amount], this.px, ch * (RESULT.rewardY + RESULT.rewardH * PILL_FACE), ch * 0.014);
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
    const maxH = l.H * 0.92;
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
    this.buttons.forEach((b) => b.setEnabled(v && (b !== this.boostBtn || this.boostState === 'idle')));
    if (this.boostState !== 'idle' && this.boostState !== 'gone') this.boostBtn.container.setAlpha(1);
  }

  destroy() {
    this._stopCycle();
    ['result-card', 'result-pill', 'result-chestbar', 'result-meter', 'result-marker'].forEach((k) => this.scene.qaTargets?.delete(k));
    this.boostPulse?.stop();
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
