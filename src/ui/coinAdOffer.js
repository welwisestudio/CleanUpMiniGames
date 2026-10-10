import { TEXT, FONT_UI } from './theme.js';
import { makeText, fitText } from './text.js';
import { Button } from './Button.js';
import { fitImage } from './kit.js';
import { refreshTextResolution } from './layout.js';
import { dimLayer } from './modals.js';

// "Not enough coins" offer for a COIN tool variant (functional or visual-only): unlock THIS variant
// with a rewarded ad instead. A small card over the scene: picture · name · Watch Ad to Unlock
// (purple) · No thanks. The scene runs the ad through ToolService; a cancelled / failed ad shows a
// message and keeps the card open (retry or No thanks). Built in UI units, scaled by layout `u`.
export class CoinAdOffer {
  constructor(scene, { name, texture, onWatch, onClose }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(660);
    this.dim = dimLayer(scene).setAlpha(0.55);
    this.panel = scene.add.container(0, 0);
    const W = 300;
    const H = 360;
    this.W = W;
    this.H = H;
    const top = -H / 2;
    const g = scene.add.graphics();
    g.fillStyle(0x6b4a33, 0.18).fillRoundedRect(-W / 2, top + 6, W, H, 26);
    g.fillStyle(0xfffaf3, 1).fillRoundedRect(-W / 2, top, W, H, 26);
    g.lineStyle(5, 0xf0b98d, 1).strokeRoundedRect(-W / 2, top, W, H, 26);
    // rows: title · picture box · name · hint · Watch · No thanks (each in its own band)
    const title = makeText(scene, 0, top + 38, 'Not enough coins', { size: 25, color: TEXT.navy, weight: '900', family: FONT_UI });
    const bg = scene.add.graphics();
    bg.fillStyle(0xe2ecf7, 1).fillRoundedRect(-62, top + 66, 124, 110, 16);
    const img = fitImage(scene, texture, 96, 0, top + 121);
    const label = fitText(makeText(scene, 0, top + 198, name, { size: 18, color: TEXT.navy, weight: '900', family: FONT_UI }), W * 0.86);
    this.line = fitText(makeText(scene, 0, top + 226, 'Watch an ad to unlock it for free', { size: 15, color: '#6B7690', weight: '800', family: FONT_UI }), W * 0.86);
    this.watch = new Button(scene, { id: 'tool-offer-watch', x: 0, y: H / 2 - 90, w: 236, h: 54, label: 'Watch Ad to Unlock', style: 'purple', icon: 'icon-ad-clapper', iconSize: 0.62, fontSize: 19, onClick: () => onWatch?.() });
    this.cancel = new Button(scene, { id: 'tool-offer-cancel', x: 0, y: H / 2 - 34, w: 150, h: 38, label: 'No thanks', style: 'white', fontSize: 16, onClick: () => onClose?.() });
    this.panel.add([g, title, bg, img, label, this.line, this.watch.container, this.cancel.container]);
    this.root.add([this.dim, this.panel]);
    this.layout(scene.layout);
    refreshTextResolution(scene);
  }

  setBusy(v) {
    this.watch.setEnabled(!v);
    this.cancel.setEnabled(!v);
    this.watch.setLabel(v ? 'Loading ad…' : 'Watch Ad to Unlock');
  }

  message(msg) {
    this.line.setText(msg).setColor('#D93A2B');
    refreshTextResolution(this.scene);
  }

  layout(l) {
    this.dim.setSize(l.W, l.H);
    const k = Math.min(l.u * 1.15, (l.W * 0.86) / this.W, (l.H * 0.7) / this.H);
    this.panel.setPosition(l.W / 2, l.H / 2).setScale(k);
  }

  destroy() {
    this.watch.destroy();
    this.cancel.destroy();
    this.root.destroy();
  }
}
