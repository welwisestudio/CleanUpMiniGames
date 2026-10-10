import Phaser from 'phaser';
import { TEXT, FONT_UI, FONT_DISPLAY } from './theme.js';
import { makeText, fitText } from './text.js';
import { Button } from './Button.js';
import { fitImage } from './kit.js';
import { refreshTextResolution } from './layout.js';
import { CurrencyPill } from './hud.js';

// Store screen (2026-10-10, reference input/Store_screen.PNG): a full-screen page over the menu /
// level — striped awning header with "Store", the two counters and a close button; below it a
// vertical list of rounded sections (Diamonds, Coins, Bonus), three tiles per currency section,
// the first tile free for a rewarded ad. `focus` ('gems' | 'coins') opens the page scrolled to that
// section (the "+" buttons next to the counters). Every rule lives in StoreService; this only shows
// state and asks. Built in UI units; the content scrolls (drag / wheel) under the header.

const PW = 344; // section width (UI units)
const TW = 104; // tile
const TH = 158;
const THEMES = {
  gems: { border: 0xc79ae8, band: 0xf3e8fc, title: '#6B2FA8' },
  coins: { border: 0x8fd6cf, band: 0xe3f6f3, title: '#2C7F78' },
  bonus: { border: 0xf3b98a, band: 0xfdeee2, title: '#A3532A' },
};

export class StoreModal {
  constructor(scene, { services, focus = null, onClose, onChanged }) {
    this.scene = scene;
    this.services = services;
    this.onClose = onClose;
    this.onChanged = onChanged;
    this.focus = focus;
    this.root = scene.add.container(0, 0).setDepth(900);
    this.bg = scene.add.rectangle(0, 0, 10, 10, 0xfdeff2, 1).setOrigin(0).setInteractive(); // blocks the scene below
    this.content = scene.add.container(0, 0);
    this.maskG = scene.make.graphics({ add: false });
    this.content.setMask(this.maskG.createGeometryMask());
    this.awning = scene.add.graphics();
    this.header = scene.add.container(0, 0);
    this.title = makeText(scene, 0, 0, 'Store', { size: 40, color: TEXT.white, family: FONT_DISPLAY, weight: '900', stroke: '#2F4E8C', strokeThickness: 9 });
    const save = services.save;
    this.coins = new CurrencyPill(scene, { icon: 'icon-coin', value: save.get('coins') });
    this.gems = new CurrencyPill(scene, { icon: 'icon-diamond', value: save.get('diamonds') });
    this.close = new Button(scene, { id: 'store-close', x: 0, y: 0, w: 52, h: 52, style: 'square', icon: 'icon-close', iconSize: 0.5, onClick: () => this.onClose?.() });
    this.header.add([this.coins.container, this.gems.container, this.title, this.close.container]);
    this.root.add([this.bg, this.content, this.awning, this.header]);
    this.buttons = [];
    this.scroll = 0;
    this.drag = null;
    this.dragMoved = 0;
    this._input(true);
    this._build();
    this.layout(scene.layout);
    if (focus) this.scrollToSection(focus);
  }

  // ---- input: drag / wheel scroll; taps after a drag are ignored --------------------------
  _input(on) {
    const inp = this.scene.input;
    const m = on ? 'on' : 'off';
    inp[m]('pointerdown', this._down, this);
    inp[m]('pointermove', this._move, this);
    inp[m]('pointerup', this._up, this);
    inp[m]('wheel', this._wheel, this);
  }

  _down(p) {
    this.drag = { y: p.y, scroll: this.scroll };
    this.dragMoved = 0;
  }

  _move(p) {
    if (!this.drag || !p.isDown) return;
    this.dragMoved = Math.max(this.dragMoved, Math.abs(p.y - this.drag.y));
    if (this.dragMoved > 8 * this.u) this._scrollTo(this.drag.scroll - (p.y - this.drag.y) / this.k);
  }

  _up() {
    this.drag = null;
  }

  _wheel(p, over, dx, dy) {
    this._scrollTo(this.scroll + dy / this.k);
  }

  _scrollTo(v) {
    this.scroll = Phaser.Math.Clamp(v, 0, Math.max(0, this.contentH - this.viewH / this.k));
    this.content.y = this.viewTop - this.scroll * this.k;
    this._qa();
  }

  scrollToSection(id) {
    const y = this.anchors?.[id];
    if (y != null) this._scrollTo(y - 10);
  }

  // a tap (not a drag) inside the visible list area
  _act(fn) {
    return () => {
      const p = this.scene.input.activePointer;
      if (this.dragMoved > 8 * this.u) return;
      if (p && (p.y < this.viewTop || p.y > this.viewTop + this.viewH)) return;
      fn();
    };
  }

  // ---- content ------------------------------------------------------------------------------
  _build() {
    const s = this.scene;
    const store = this.services.store;
    const cfg = store.config;
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];
    this.content.removeAll(true);
    this.anchors = {};
    let y = 0;
    const freeTile = (offer, icon, amount, iconN) => ({
      id: `store-free-${offer}`,
      icon,
      iconN,
      amount,
      sub: `${store.adRemaining(offer)} left today`,
      button: store.isBusy(offer) ? { label: 'Loading…', disabled: true } : store.adRemaining(offer) > 0 ? { label: 'FREE', icon: 'icon-ad-clapper' } : { label: 'Tomorrow', disabled: true },
      onTap: () => this._claim(offer),
    });
    // Diamonds
    this.anchors.gems = y;
    y += this._section(y, 'Diamonds', THEMES.gems, [
      freeTile('gems', 'icon-diamond', cfg.free.gems.gems, 1),
      ...cfg.gemPacks.map((p, i) => ({ id: `store-${p.id}`, icon: 'icon-diamond', iconN: i + 2, amount: p.gems, sub: store.devPurchases ? 'test purchase' : '', button: { label: p.price }, onTap: () => this._buyGems(p) })),
    ]);
    y += 18;
    // Coins
    this.anchors.coins = y;
    y += this._section(y, 'Coins', THEMES.coins, [
      freeTile('coins', 'icon-coin', cfg.free.coins.coins, 1),
      ...cfg.coinPacks.map((p, i) => ({ id: `store-${p.id}`, icon: 'icon-coin', iconN: i + 2, amount: p.coins, sub: '', button: { label: `${p.gems}`, icon: 'icon-diamond' }, onTap: () => this._buyCoins(p) })),
    ]);
    y += 18;
    // Bonus: open the timed chest now (rewarded ad)
    this.anchors.bonus = y;
    y += this._bonus(y);
    y += 24;
    if (store.devPurchases) {
      this.content.add(fitText(makeText(s, 0, y, 'Test mode: diamond packs are free placeholders until payments are connected.', { size: 12, color: '#A1948E', weight: '800', family: FONT_UI, align: 'center' }), PW));
      y += 30;
    }
    this.contentH = y + 20;
  }

  _panel(y, h, theme, title) {
    const s = this.scene;
    const g = s.add.graphics();
    g.fillStyle(0x6b4a33, 0.12).fillRoundedRect(-PW / 2, y + 5, PW, h, 26);
    g.fillStyle(theme.band, 1).fillRoundedRect(-PW / 2, y, PW, h, 26);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-PW / 2 + 5, y + 5, PW - 10, 50, { tl: 22, tr: 22, bl: 0, br: 0 });
    g.lineStyle(5, theme.border, 1).strokeRoundedRect(-PW / 2, y, PW, h, 26);
    const t = makeText(s, 0, y + 31, title, { size: 25, color: theme.title, weight: '900', family: FONT_UI });
    this.content.add([g, t]);
  }

  _section(y, title, theme, tiles) {
    const s = this.scene;
    const h = 64 + TH + 18;
    this._panel(y, h, theme, title);
    tiles.forEach((tile, i) => {
      const x = (i - 1) * (TW + 8);
      const ty = y + 64 + TH / 2;
      const g = s.add.graphics();
      g.fillStyle(0xffffff, 1).fillRoundedRect(x - TW / 2, ty - TH / 2, TW, TH, 16);
      g.fillStyle(0xfff8ef, 1).fillRoundedRect(x - TW / 2 + 5, ty - TH / 2 + 5, TW - 10, TH - 58, 12);
      g.lineStyle(2, 0xf0dccb, 1).strokeRoundedRect(x - TW / 2, ty - TH / 2, TW, TH, 16);
      const items = [g];
      // icon pile: 1–3 icons (a bigger pack shows more)
      const n = tile.iconN ?? 1;
      const size = n === 1 ? 48 : 40;
      const spots = [[[0, 0]], [[-11, 4], [11, -4]], [[-14, 6], [14, 6], [0, -8]]][Math.min(3, n) - 1];
      spots.forEach(([dx, dy]) => items.push(fitImage(s, tile.icon, size, x + dx, ty - 44 + dy)));
      items.push(makeText(s, x, ty - 6, `${tile.amount}`, { size: 20, color: TEXT.navy, weight: '900', family: FONT_UI }));
      if (tile.sub) items.push(fitText(makeText(s, x, ty + 16, tile.sub, { size: 11, color: '#9A8F86', weight: '800', family: FONT_UI }), TW - 12));
      this.content.add(items);
      const b = new Button(s, { id: tile.id, x, y: ty + TH / 2 - 26, w: TW - 14, h: 38, label: tile.button.label, icon: tile.button.icon ?? null, iconSize: 0.6, style: 'green', fontSize: 17, onClick: this._act(() => tile.onTap()) });
      if (tile.button.disabled) b.setEnabled(false);
      this.content.add(b.container);
      this.buttons.push(b);
    });
    return h;
  }

  _bonus(y) {
    const s = this.scene;
    const store = this.services.store;
    const h = 64 + 96 + 16;
    this._panel(y, h, THEMES.bonus, 'Bonus');
    const ty = y + 64 + 48;
    const g = s.add.graphics();
    g.fillStyle(0xffffff, 1).fillRoundedRect(-PW / 2 + 12, ty - 48, PW - 24, 96, 16);
    g.lineStyle(2, 0xf0dccb, 1).strokeRoundedRect(-PW / 2 + 12, ty - 48, PW - 24, 96, 16);
    const chest = fitImage(s, 'ui-chest-timed', 72, -PW / 2 + 58, ty);
    const t1 = makeText(s, -PW / 2 + 102, ty - 16, 'Open the chest now', { size: 16, color: TEXT.navy, weight: '900', family: FONT_UI, originX: 0 });
    const ready = !store.chestSkippable();
    const t2 = makeText(s, -PW / 2 + 102, ty + 8, ready ? 'Your chest is ready in the menu' : `+${store.timedChest.coins} coins · ${store.adRemaining('chest')} left today`, { size: 12, color: '#9A8F86', weight: '800', family: FONT_UI, originX: 0 });
    fitText(t1, 118);
    fitText(t2, 118);
    this.content.add([g, chest, t1, t2]);
    const busy = store.isBusy('chest');
    const can = !ready && store.adRemaining('chest') > 0;
    const b = new Button(s, { id: 'store-free-chest', x: PW / 2 - 64, y: ty, w: 92, h: 40, label: busy ? 'Loading…' : can ? 'FREE' : ready ? 'Ready' : 'Tomorrow', icon: can && !busy ? 'icon-ad-clapper' : null, iconSize: 0.6, style: 'green', fontSize: 17, onClick: this._act(() => this._claim('chest')) });
    if (!can || busy) b.setEnabled(false);
    this.content.add(b.container);
    this.buttons.push(b);
    return h;
  }

  // ---- actions --------------------------------------------------------------------------------
  async _claim(offer) {
    const store = this.services.store;
    if (store.isBusy(offer)) return;
    const p = store.claimAd(offer);
    this._refresh();
    const r = await p;
    if (this.destroyed) return;
    if (r.status === 'granted') this._granted(r, offer === 'gems' ? `+${r.gems}` : `+${r.coins}`);
    else if (r.status === 'not-earned') this.toast('Ad closed early - no reward');
    else if (r.status === 'error' || r.status === 'unavailable') this.toast('Ad not available - try again');
    else if (r.status === 'limit') this.toast('Come back tomorrow');
    this._refresh();
  }

  _buyCoins(pack) {
    const r = this.services.store.buyCoins(pack.id);
    if (r.status === 'insufficient') return this.toast('Not enough diamonds');
    if (r.status === 'purchased') this._granted(r, `+${pack.coins}`);
    this._refresh();
  }

  _buyGems(pack) {
    const r = this.services.store.buyGems(pack.id);
    if (r.status === 'unavailable') return this.toast('Purchases are not available yet');
    if (r.status === 'purchased') this._granted(r, `+${pack.gems}`);
    this._refresh();
  }

  _granted(r, label) {
    this.services.audio?.play('coins');
    this.coins.setValue(r.coinsAfter ?? this.services.save.get('coins'));
    this.gems.setValue(r.diamondsAfter ?? this.services.save.get('diamonds'));
    this.coins.pulse();
    this.gems.pulse();
    this.toast(label, '#1E7A24');
    this.onChanged?.();
  }

  _refresh() {
    const keep = this.scroll;
    this._build();
    this.layout(this.scene.layout);
    this._scrollTo(keep);
    refreshTextResolution(this.scene);
  }

  toast(msg, color = '#D93A2B') {
    this.toastText?.destroy();
    const l = this.scene.layout;
    const t = makeText(this.scene, l.W / 2, this.viewTop + this.viewH - 40 * l.u, msg, { size: 22 * l.u, color, weight: '900', family: FONT_UI, stroke: '#FFFFFF', strokeThickness: 6 * l.u });
    this.root.add(t);
    this.toastText = t;
    this.scene.tweens.add({ targets: t, y: t.y - 20 * l.u, alpha: { from: 1, to: 0 }, delay: 900, duration: 500, onComplete: () => t.destroy() });
  }

  // ---- layout -------------------------------------------------------------------------------
  layout(l) {
    const { W, H, u, margin: m } = l;
    this.u = u;
    this.bg.setSize(W, H);
    // awning header: blue / white stripes with a scalloped lower edge (code-drawn, reference look)
    const hh = 96 * u;
    const sw = 34 * u;
    const g = this.awning.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, W, hh);
    for (let x = 0, i = 0; x < W + sw; x += sw, i++) {
      const col = i % 2 ? 0xffffff : 0x3d8be8;
      g.fillStyle(col, 1).fillRect(x, 0, sw, hh - sw * 0.5);
      g.fillCircle(x + sw / 2, hh - sw * 0.5, sw / 2);
    }
    g.fillStyle(0x000000, 0.06).fillRect(0, hh - sw * 0.5, W, 3 * u);
    this.header.setPosition(0, 0).setScale(u);
    const cw = W / u;
    const compact = cw < 520;
    this.title.setPosition(cw / 2, compact ? 74 : 40);
    this.coins.container.setScale(0.78).setPosition(m / u + 4, 30);
    this.gems.container.setScale(0.78).setPosition(m / u + 4 + this.coins.width * 0.78 + 8, 30);
    this.close.setPlacement(cw - m / u - 26, 32, 1);
    // list area below the header
    this.viewTop = hh + (compact ? 24 : 10) * u;
    this.viewH = H - this.viewTop;
    this.k = Math.min(u * 1.05, (W - 2 * m) / (PW + 8));
    this.content.setPosition(W / 2, this.viewTop - this.scroll * this.k).setScale(this.k);
    this.maskG.clear().fillStyle(0xffffff, 1).fillRect(0, this.viewTop - 6 * u, W, H);
    this._scrollTo(this.scroll);
    refreshTextResolution(this.scene);
  }

  // QA: section rects (world) for the deep-link checks
  _qa() {
    const qa = this.scene.qaTargets;
    if (!qa || !this.anchors) return;
    for (const id of ['gems', 'coins', 'bonus']) {
      const y = this.content.y + this.anchors[id] * this.k;
      qa.set(`store-section-${id}`, { x: this.scene.layout.W / 2, y: y + 30 * this.k, w: PW * this.k, h: 60 * this.k, visible: y >= this.viewTop - 12 * this.u && y < this.viewTop + this.viewH * 0.5 });
    }
  }

  destroy() {
    this.destroyed = true;
    this._input(false);
    const qa = this.scene.qaTargets;
    ['gems', 'coins', 'bonus'].forEach((id) => qa?.delete(`store-section-${id}`));
    this.buttons.forEach((b) => b.destroy());
    this.close.destroy();
    this.root.destroy();
    this.maskG.destroy();
  }
}
