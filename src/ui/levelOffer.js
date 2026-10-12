import { TEXT, FONT_UI } from './theme.js';
import { makeText, fitText, centerRow } from './text.js';
import { Button } from './Button.js';
import { fitImage, shakeX, stopShake } from './kit.js';
import { refreshTextResolution } from './layout.js';
import { dimLayer } from './modals.js';

// Locked-level offers in the menu (systems pass 2026-10-12; price shown once, 2026-10-12 polish):
//   coins (enough coins)  → "Unlock this level?" · preview · "Level 25 · Name" · "Unlock it with coins"
//                           · [◎ 275  Unlock] (the price lives only in the button)
//   ad (not enough coins) → same card · "Needs 275 coins - you have 40" · [▶ Watch Ad to Unlock]
//   vip                   → "VIP Level" · preview · name · VIP chip · "Premium level - unlock it with an ad"
//                           · [▶ Watch Ad to Unlock]
// No thanks closes it. The menu runs the action through ProgressionService; a failed ad shows a
// message and keeps the card open. Built in UI units, scaled by the layout's `u`.
export class LevelOffer {
  constructor(scene, { kind, number, title, texture, price = 0, coins = 0, onConfirm, onClose }) {
    this.scene = scene;
    this.kind = kind;
    this.root = scene.add.container(0, 0).setDepth(700);
    this.dim = dimLayer(scene).setAlpha(0.6);
    this.panel = scene.add.container(0, 0);
    const W = 300;
    const H = kind === 'vip' ? 424 : 392;
    this.W = W;
    this.H = H;
    const top = -H / 2;
    const vip = kind === 'vip';
    const g = scene.add.graphics();
    g.fillStyle(0x6b4a33, 0.18).fillRoundedRect(-W / 2, top + 6, W, H, 26);
    g.fillStyle(0xfffaf3, 1).fillRoundedRect(-W / 2, top, W, H, 26);
    g.lineStyle(5, vip ? 0xb07ae8 : 0xf0b98d, 1).strokeRoundedRect(-W / 2, top, W, H, 26);
    const head = makeText(scene, 0, top + 38, vip ? 'VIP Level' : 'Unlock this level?', { size: 25, color: vip ? '#6B2FA8' : TEXT.navy, weight: '900', family: FONT_UI });
    const bg = scene.add.graphics();
    bg.fillStyle(vip ? 0xefe4fb : 0xe2ecf7, 1).fillRoundedRect(-70, top + 66, 140, 124, 18);
    const img = fitImage(scene, texture, 112, 0, top + 128);
    const name = fitText(makeText(scene, 0, top + 212, `Level ${number} · ${title}`, { size: 18, color: TEXT.navy, weight: '900', family: FONT_UI }), W * 0.86);
    const items = [g, head, bg, img, name];
    if (vip) {
      // VIP badge row (ad only)
      const chip = scene.add.graphics();
      chip.fillStyle(0x8a4fe0, 1).fillRoundedRect(-34, top + 232, 68, 26, 13);
      items.push(chip, makeText(scene, 0, top + 245, 'VIP', { size: 16, color: TEXT.white, weight: '900', family: FONT_UI }));
    }
    const sub = vip ? 'Premium level - unlock it with an ad' : kind === 'coins' ? 'Unlock it with coins' : `Needs ${price} coins - you have ${coins}`;
    this.line = fitText(makeText(scene, 0, top + (vip ? 280 : 250), sub, { size: 15, color: kind === 'ad' ? '#C0392B' : '#6B7690', weight: '800', family: FONT_UI }), W * 0.86);
    items.push(this.line);
    if (kind === 'coins') {
      this.confirm = new Button(scene, { id: 'level-offer-confirm', x: 0, y: H / 2 - 94, w: 236, h: 54, label: 'Unlock', style: 'green', fontSize: 21, onClick: () => onConfirm?.() });
      // price on the button: [◎ 275]  Unlock
      const c = fitImage(scene, 'icon-coin', 30);
      const p = makeText(scene, 0, 0, `${price}`, { size: 22, color: TEXT.white, weight: '900', family: FONT_UI, stroke: '#1F7A2A', strokeThickness: 4 });
      const lbl = this.confirm.label;
      this.confirm.container.add([c, p]);
      centerRow([c, p, lbl], 0, this.confirm.faceY, 8);
      lbl.setY(this.confirm.labelY);
      p.setY(this.confirm.labelY);
    } else {
      this.confirm = new Button(scene, { id: 'level-offer-confirm', x: 0, y: H / 2 - 94, w: 250, h: 54, label: 'Watch Ad to Unlock', style: 'purple', icon: 'icon-ad-clapper', iconSize: 0.62, fontSize: 19, onClick: () => onConfirm?.() });
    }
    this.cancel = new Button(scene, { id: 'level-offer-cancel', x: 0, y: H / 2 - 36, w: 150, h: 38, label: 'No thanks', style: 'white', fontSize: 16, onClick: () => onClose?.() });
    items.push(this.confirm.container, this.cancel.container);
    this.panel.add(items);
    this.root.add([this.dim, this.panel]);
    this.layout(scene.layout);
    refreshTextResolution(scene);
  }

  setBusy(v) {
    this.confirm.setEnabled(!v);
    this.cancel.setEnabled(!v);
    if (this.kind !== 'coins') this.confirm.setLabel(v ? 'Loading ad…' : 'Watch Ad to Unlock');
  }

  message(msg) {
    this.line.setText(msg).setColor('#D93A2B');
    refreshTextResolution(this.scene);
  }

  shake() {
    shakeX(this.scene, this.panel, 8);
  }

  layout(l) {
    this.dim.setSize(l.W, l.H);
    const k = Math.min(l.u * 1.15, (l.W * 0.86) / this.W, (l.H * 0.72) / this.H);
    stopShake(this.panel);
    this.panel.setPosition(l.W / 2, l.H / 2).setScale(k);
  }

  destroy() {
    this.confirm.destroy();
    this.cancel.destroy();
    this.root.destroy();
  }
}
