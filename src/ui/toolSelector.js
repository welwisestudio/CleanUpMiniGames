import { TEXT, FONT_UI } from './theme.js';
import { makeText, fitText, centerRow } from './text.js';
import { nineSlice, fitImage } from './kit.js';
import { getTool } from '../content/tools.js';

// Alternative-tool cards (Step 7, reference REFERENCE-BREAKDOWN §2 / Rug_foam_brush_cleaning):
// three cards — tool picture on a coloured tile, a label pill below it: "Equipped" (✓), "Free" /
// "Owned", a coin or diamond price, or the watch-ad badge. The equipped card has a gold frame.
// Built in UI units; the scene places it (bottom row on portrait, right column on landscape).
// Displays ToolService state only; every action goes through the scene → ToolService.
export const CARD = { w: 74, h: 74, gap: 12, label: 24 };

export class ToolSelector {
  constructor(scene, { onTap, onSkin }) {
    this.scene = scene;
    this.onTap = onTap;
    this.onSkin = onSkin;
    this.container = scene.add.container(0, 0).setDepth(120);
    this.cards = [];
    this.vertical = false;
  }

  // options = ToolService.options(family) (+ affordable flag)
  setOptions(familyId, options) {
    this.familyId = familyId;
    this.scene.tweens.killTweensOf(this.container); // a running hide() must not hide the new cards
    this.cards.forEach((c) => c.root.destroy());
    this.cards = options.map((o) => this._card(o));
    this._arrange();
    this.container.setVisible(true).setAlpha(1);
  }

  _card(o) {
    const s = this.scene;
    const { w, h, label } = CARD;
    const root = s.add.container(0, 0);
    const g = s.add.graphics();
    const frame = s.add.graphics();
    const tool = getTool(o.tool);
    const img = fitImage(s, o.texture ?? tool.texture, w * 0.72, 0, -h * 0.04);
    const pill = nineSlice(s, 'ui-pill', w * 1.02, label, 0, h / 2 + label * 0.18);
    const content = s.add.container(0, 0);
    const zone = s.add.zone(0, label * 0.2, Math.max(w, 48), Math.max(h + label * 0.6, 48)).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.onTap?.(o.tool));
    root.add([frame, g, img, pill, content, zone]);
    // Step 8: cosmetic skins - a small round brush button on the equipped base tool card
    let skinBtn = null;
    if (o.skinnable && this.onSkin) {
      skinBtn = s.add.container(w / 2 - 2, -h / 2 + 2);
      const bg = s.add.circle(0, 0, 17, 0xffffff, 1).setStrokeStyle(4, 0xc77dff, 1);
      const ic = fitImage(s, 'tool-paint-brush', 26, 0, 0).setAngle(35);
      const hit = s.add.zone(0, 0, 48, 48).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.onSkin?.());
      skinBtn.add([bg, ic, hit]);
      root.add(skinBtn);
    }
    this.container.add(root);
    const card = { o, root, g, frame, img, pill, content, zone, skinBtn };
    this._paint(card, o);
    return card;
  }

  _paint(card, o) {
    const s = this.scene;
    const { w, h, label } = CARD;
    card.o = o;
    if (o.texture !== undefined) card.img.setTexture(o.texture ?? getTool(o.tool).texture);
    card.g.clear();
    card.g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    card.g.fillStyle(o.card ?? 0xd8e6f5, 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 9);
    card.frame.clear();
    if (o.equipped) card.frame.lineStyle(5, 0xffc93c, 1).strokeRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 14);
    card.root.setScale(o.equipped ? 1.06 : 1);
    card.content.removeAll(true);
    const y = h / 2 + label * 0.18 + label * -0.06; // pill face
    const txt = (str, color) => makeText(s, 0, y, str, { size: label * 0.62, color, weight: '900', family: FONT_UI });
    const icon = (key, size = label * 0.86) => fitImage(s, key, size, 0, y);
    let items;
    if (o.equipped) items = [icon('icon-check', label * 0.78), txt('Equipped', '#1E7A24')];
    else if (o.owned) items = [txt(o.unlock.type === 'default' ? 'Free' : 'Owned', TEXT.navy)];
    else if (o.unlock.type === 'coins') items = [icon('icon-coin'), txt(`${o.unlock.price}`, o.affordable ? TEXT.navy : '#D93A2B')];
    else if (o.unlock.type === 'diamonds') items = [icon('icon-diamond'), txt(`${o.unlock.price}`, o.affordable ? TEXT.navy : '#D93A2B')];
    else if (o.busy) items = [txt('…', TEXT.navy)];
    else items = [icon('icon-ad-clapper'), txt('Ad', TEXT.navy)];
    card.content.add(items);
    const texts = items.filter((i) => i.type === 'Text');
    texts.forEach((t) => fitText(t, w * 0.62));
    centerRow(items, 0, y, 4);
  }

  update(options) {
    // a change of the skin button (equip moved) needs the cards rebuilt
    if (options.some((o, i) => Boolean(o.skinnable) !== Boolean(this.cards[i]?.skinBtn))) return this.setOptions(this.familyId, options);
    options.forEach((o, i) => this.cards[i] && this._paint(this.cards[i], o));
  }

  // QA: the skin button of the equipped card (world rect) or null
  skinButtonRect() {
    const c = this.cards.find((k) => k.skinBtn);
    if (!c) return null;
    const m = c.skinBtn.getWorldTransformMatrix();
    const k = Math.hypot(m.a, m.b);
    return { x: m.tx, y: m.ty, w: 48 * k, h: 48 * k, visible: this.container.visible && this.container.alpha > 0.5 };
  }

  _arrange() {
    const { w, h, gap, label } = CARD;
    const stepX = w + gap;
    const stepY = h + label + gap;
    this.cards.forEach((c, i) => {
      const k = i - (this.cards.length - 1) / 2;
      c.root.setPosition(this.vertical ? 0 : k * stepX, this.vertical ? k * stepY : 0);
    });
  }

  // Size of the whole selector in UI units (for layout reservations).
  static extent(vertical) {
    const { w, h, gap, label } = CARD;
    return vertical ? { w: w + 8, h: 3 * (h + label) + 2 * gap + 8 } : { w: 3 * w + 2 * gap + 8, h: h + label + 8 };
  }

  place(x, y, u, vertical) {
    if (vertical !== this.vertical) {
      this.vertical = vertical;
      this._arrange();
    }
    this.container.setPosition(x, y).setScale(u);
  }

  shake(toolId) {
    const c = this.cards.find((k) => k.o.tool === toolId);
    if (!c) return;
    this.scene.tweens.add({ targets: c.root, x: c.root.x + 5, duration: 45, yoyo: true, repeat: 3 });
  }

  pop(toolId) {
    const c = this.cards.find((k) => k.o.tool === toolId);
    if (!c) return;
    const k = c.root.scale;
    this.scene.tweens.add({ targets: c.root, scale: k * 1.15, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
  }

  // Short message above the selector ("Not enough coins", "Ad closed early").
  toast(msg) {
    this.toastText?.destroy();
    const ext = ToolSelector.extent(this.vertical);
    const t = makeText(this.scene, 0, -ext.h / 2 - 20, msg, { size: 17, color: TEXT.white, weight: '900', family: FONT_UI, stroke: '#2A2A2A', strokeThickness: 4 });
    if (this.vertical) t.setOrigin(1, t.originY).setPosition(-ext.w / 2 - 8, 0); // left of the column
    this.container.add(t);
    this.toastText = t;
    this.scene.tweens.add({ targets: t, y: t.y - 14, alpha: { from: 1, to: 0 }, delay: 900, duration: 500, onComplete: () => t.destroy() });
  }

  clearToast() {
    this.toastText?.destroy();
    this.toastText = null;
  }

  hide() {
    this.cards.forEach((c) => c.zone.disableInteractive());
    this.scene.tweens.add({ targets: this.container, alpha: 0, duration: 200, onComplete: () => this.container.setVisible(false) });
  }

  // world rect per card (QA / tests)
  cardRects() {
    return this.cards.map((c) => {
      const m = c.zone.getWorldTransformMatrix();
      const sx = Math.hypot(m.a, m.b);
      return { tool: c.o.tool, x: m.tx, y: m.ty, w: c.zone.width * sx, h: c.zone.height * sx, state: c.o.equipped ? 'equipped' : c.o.owned ? 'owned' : c.o.unlock.type, price: c.o.unlock.price ?? 0, affordable: Boolean(c.o.affordable), visible: this.container.visible && this.container.alpha > 0.5 };
    });
  }

  destroy() {
    this.container.destroy();
  }
}
