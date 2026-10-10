import { TEXT, FONT_UI } from './theme.js';
import { makeText, fitText, centerRow } from './text.js';
import { Button } from './Button.js';
import { fitImage, shakeX, stopShake } from './kit.js';
import { refreshTextResolution } from './layout.js';
import { dimLayer } from './modals.js';

// Locked-level offers in the menu (level access, 2026-10-10). A small card over the menu:
//   normal locked level → "Unlock this level?" · preview · "Level 25 · Name" · [Watch Ad] · No thanks
//   VIP level           → "VIP Level" · preview · name · [◆ price  Unlock] · No thanks (no ad)
// The menu runs the action through ProgressionService; a failed ad / missing diamonds shows a
// message and keeps the card open. Built in UI units, scaled by the layout's `u`.
export class LevelOffer {
  constructor(scene, { kind, number, title, texture, price, onConfirm, onClose }) {
    this.scene = scene;
    this.kind = kind;
    this.root = scene.add.container(0, 0).setDepth(700);
    this.dim = dimLayer(scene).setAlpha(0.6);
    this.panel = scene.add.container(0, 0);
    const W = 300;
    const H = 380;
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
    this.line = fitText(makeText(scene, 0, top + 240, vip ? 'A premium level - unlock it with diamonds' : 'Watch an ad to play it now', { size: 15, color: '#6B7690', weight: '800', family: FONT_UI }), W * 0.86);
    const items = [g, head, bg, img, name, this.line];
    if (vip) {
      this.confirm = new Button(scene, { id: 'level-offer-confirm', x: 0, y: H / 2 - 92, w: 236, h: 54, label: 'Unlock', style: 'purple', fontSize: 20, onClick: () => onConfirm?.() });
      // price on the button: [◆ 6]  Unlock
      const d = fitImage(scene, 'icon-diamond', 30);
      const p = makeText(scene, 0, 0, `${price}`, { size: 22, color: TEXT.white, weight: '900', family: FONT_UI, stroke: '#4B1D7A', strokeThickness: 4 });
      const lbl = this.confirm.label;
      this.confirm.container.add([d, p]);
      centerRow([d, p, lbl], 0, this.confirm.faceY, 8);
      lbl.setY(this.confirm.labelY);
      p.setY(this.confirm.labelY);
    } else {
      this.confirm = new Button(scene, { id: 'level-offer-confirm', x: 0, y: H / 2 - 92, w: 236, h: 54, label: 'Watch Ad', style: 'purple', icon: 'icon-ad-clapper', iconSize: 0.62, fontSize: 20, onClick: () => onConfirm?.() });
    }
    this.cancel = new Button(scene, { id: 'level-offer-cancel', x: 0, y: H / 2 - 34, w: 150, h: 38, label: 'No thanks', style: 'white', fontSize: 16, onClick: () => onClose?.() });
    items.push(this.confirm.container, this.cancel.container);
    this.panel.add(items);
    this.root.add([this.dim, this.panel]);
    this.layout(scene.layout);
    refreshTextResolution(scene);
  }

  setBusy(v) {
    this.confirm.setEnabled(!v);
    this.cancel.setEnabled(!v);
    if (this.kind !== 'vip') this.confirm.setLabel(v ? 'Loading ad…' : 'Watch Ad');
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
