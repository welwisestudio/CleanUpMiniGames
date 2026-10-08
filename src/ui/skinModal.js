import { TEXT, FONT_UI } from './theme.js';
import { makeText, fitText, centerRow } from './text.js';
import { Button } from './Button.js';
import { nineSlice, fitImage } from './kit.js';
import { refreshTextResolution } from './layout.js';
import { dimLayer, cardBase, titleText, PANEL } from './modals.js';
import { getTool } from '../content/tools.js';

// Cosmetic skin picker (Step 8): opened from the small brush button on the equipped tool card.
// A 2 × 2 grid of the family's skins (Default first): picture, then a pill with "Equipped" (✓),
// "Owned", a coin / diamond price or the watch-ad badge. Tapping a tile equips an owned skin, buys
// it, or plays the rewarded ad — every rule lives in SkinService; this only displays and asks.
// A skin never changes gameplay (radius, speed, mechanic, rewards).

export class SkinModal {
  constructor(scene, { skins, familyId, onClose, onChanged }) {
    this.scene = scene;
    this.skins = skins;
    this.familyId = familyId;
    this.onChanged = onChanged;
    this.root = scene.add.container(0, 0).setDepth(620);
    this.dim = dimLayer(scene).setAlpha(0.6);
    this.root.add(this.dim);
    const { card, cw, ch } = cardBase(scene);
    this.card = card;
    this.cw = cw;
    this.ch = ch;
    card.add(titleText(scene, cw, ch, 'Tool skins'));
    this.grid = scene.add.container(0, 0);
    card.add(this.grid);
    this.toastText = null;
    const px = PANEL.cx * cw;
    this.close = new Button(scene, { id: 'skin-close', x: px, y: ch * 0.33, w: cw * 0.4, h: ch * 0.085, label: 'Done', style: 'green', onClick: () => onClose?.() });
    card.add(this.close.container);
    this.root.add(card);
    this.tiles = [];
    this._build();
    this.layout(scene.layout);
    refreshTextResolution(scene);
  }

  _build() {
    const s = this.scene;
    this.grid.removeAll(true);
    this.tiles = [];
    const cw = this.cw;
    const ch = this.ch;
    const px = PANEL.cx * cw;
    const tw = cw * 0.27;
    const th = ch * 0.2;
    const opts = this.skins.options(this.familyId);
    const base = getTool(opts[0]?.tool ?? 'cloth');
    opts.forEach((o, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = px + (col === 0 ? -1 : 1) * tw * 0.56;
      const y = -ch * 0.15 + row * (th + ch * 0.055);
      const t = s.add.container(x, y);
      const g = s.add.graphics();
      g.fillStyle(0xffffff, 1).fillRoundedRect(-tw / 2, -th / 2, tw, th, 18);
      g.fillStyle(o.equipped ? 0xfff0a8 : 0xd8e6f5, 1).fillRoundedRect(-tw / 2 + 6, -th / 2 + 6, tw - 12, th - 12, 14);
      if (o.equipped) g.lineStyle(7, 0xffc93c, 1).strokeRoundedRect(-tw / 2 - 4, -th / 2 - 4, tw + 8, th + 8, 20);
      const img = fitImage(s, o.texture ?? base.texture, th * 0.78, 0, -th * 0.03);
      const lh = ch * 0.05;
      const pill = nineSlice(s, 'ui-pill', tw * 0.95, lh, 0, th / 2 + lh * 0.3);
      const ly = th / 2 + lh * 0.3 - lh * 0.06;
      const txt = (str, color) => fitText(makeText(s, 0, ly, str, { size: lh * 0.6, color, weight: '900', family: FONT_UI }), tw * 0.62);
      const icon = (key, size = lh * 0.82) => fitImage(s, key, size, 0, ly);
      let items;
      if (o.equipped) items = [icon('icon-check', lh * 0.74), txt('Equipped', '#1E7A24')];
      else if (o.owned) items = [txt('Owned', TEXT.navy)];
      else if (o.unlock.type === 'coins') items = [icon('icon-coin'), txt(`${o.unlock.price}`, this.skins.canAfford(o) ? TEXT.navy : '#D93A2B')];
      else if (o.unlock.type === 'diamonds') items = [icon('icon-diamond'), txt(`${o.unlock.price}`, this.skins.canAfford(o) ? TEXT.navy : '#D93A2B')];
      else if (o.busy) items = [txt('…', TEXT.navy)];
      else items = [icon('icon-ad-clapper'), txt('Ad', TEXT.navy)];
      centerRow(items, 0, ly, 6);
      const name = makeText(s, 0, -th / 2 + ch * 0.022, o.name, { size: ch * 0.026, color: TEXT.navy, weight: '900', family: FONT_UI });
      const zone = s.add.zone(0, lh * 0.2, tw, th + lh).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.onTap?.(o.id));
      t.add([g, img, pill, ...items, name, zone]);
      this.grid.add(t);
      this.tiles.push({ id: o.id, t, zone, o });
    });
  }

  refresh() {
    this._build();
    refreshTextResolution(this.scene);
    this._qa();
  }

  toast(msg) {
    this.toastText?.destroy();
    const t = makeText(this.scene, PANEL.cx * this.cw, this.ch * 0.255, msg, { size: this.ch * 0.032, color: '#D93A2B', weight: '900', family: FONT_UI });
    this.card.add(t);
    this.toastText = t;
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 1100, duration: 400, onComplete: () => t.destroy() });
  }

  clearToast() {
    if (!this.toastText) return;
    this.scene.tweens.killTweensOf(this.toastText);
    this.toastText.destroy();
    this.toastText = null;
  }

  shake(id) {
    const tile = this.tiles.find((x) => x.id === id);
    if (tile) this.scene.tweens.add({ targets: tile.t, x: tile.t.x + 8, duration: 45, yoyo: true, repeat: 3 });
  }

  layout(l) {
    this.dim.setSize(l.W, l.H);
    const s = Math.min(Math.min(l.W * 0.92, 420 * l.u) / this.cw, (l.H * 0.86) / this.ch);
    this.card.setPosition(l.W / 2, l.H / 2).setScale(s);
    this._qa();
  }

  // QA geometry: one target per skin tile (world px)
  _qa() {
    const qa = this.scene.qaTargets;
    if (!qa) return;
    for (const tile of this.tiles) {
      const m = tile.zone.getWorldTransformMatrix();
      const k = Math.hypot(m.a, m.b);
      qa.set(`skin-${tile.id}`, { x: m.tx, y: m.ty, w: tile.zone.width * k, h: tile.zone.height * k, visible: true });
    }
  }

  setEnabled(v) {
    this.close.setEnabled(v);
    this.tiles.forEach((t) => (v ? t.zone.setInteractive() : t.zone.disableInteractive()));
  }

  destroy() {
    const qa = this.scene.qaTargets;
    this.tiles.forEach((t) => qa?.delete(`skin-${t.id}`));
    this.close.destroy();
    this.root.destroy();
  }
}
