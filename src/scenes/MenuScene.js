import Phaser from 'phaser';
import { DISPLAY_ORDER, getLevel } from '../content/catalog.js';
import { attachResponsiveLayout, refreshTextResolution, UI } from '../ui/layout.js';
import { makeText, fitText } from '../ui/text.js';
import { COLORS, TEXT } from '../ui/theme.js';
import { CurrencyPill, addStatusBadges } from '../ui/hud.js';
import { Button } from '../ui/Button.js';
import { SettingsModal } from '../ui/modals.js';
import { TimedChestWidget, ProgressChestMini, ChestOfferModal, TIMED_CHEST_SIZE, flyIcons } from '../ui/rewards.js';
import { registerQaScene } from '../app/qa.js';

// Object selection (reference Menu_screen.PNG, video 00:00 / 08:04–08:16): a vertical list of
// shelves that scrolls downward, 2 objects per shelf row. All objects are open from the start
// (decision 2026-10-04). Header: currency counters and settings. No game-name text (logo later).
// Step 6 reward pass: the timed chest and the level-progress chest form one column on the left,
// directly below the counters; the header keeps its approved single-row height. On narrow
// screens the shelves get a left gutter so the column never covers a level while scrolling.

const COMING_SOON_SLOTS = 1; // fills the last row; more objects arrive at Step 8
const CHEST_SCALE = 0.72; // chest widgets relative to their base size (UI units)
const CHEST_GAP = 8;
const CHECK_SIZE = 46; // completion check on a level preview (UI units) // UI units: header → first chest, chest → chest, column → shelves

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.services = this.registry.get('services');
    this.leaving = false; // scene objects are reused between visits
    this.services.pause.set('navigationBusy', false);
    this.qaButtons = new Map();
    this.qaTargets = new Map();
    this.scrollY = 0;
    this.velocity = 0;
    this.drag = null;
    this.settings = null;
    this.lastDragMoved = 0;
    this.chestOffer = null;

    this.bg = this.add.rectangle(0, 0, 10, 10, COLORS.menuBg).setOrigin(0);
    this.list = this.add.container(0, 0);
    this.header = this.add.container(0, 0).setDepth(50);
    this.headerBg = this.add.rectangle(0, 0, 10, 10, COLORS.menuHeader).setOrigin(0);
    this.headerShade = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.06).setOrigin(0);
    const save = this.services.save;
    this.pills = this.add.container(0, 0);
    this.coins = new CurrencyPill(this, { icon: 'icon-coin', value: save.get('coins') });
    this.diamonds = new CurrencyPill(this, { icon: 'icon-diamond', value: save.get('diamonds') });
    this.pills.add([this.coins.container, this.diamonds.container]);
    this.gear = new Button(this, { id: 'menu-settings', x: 0, y: 0, w: UI.pause, h: UI.pause, style: 'square', icon: 'icon-gear', iconSize: 0.62, onClick: () => this.openSettings() });
    const rewards = this.services.rewards;
    this.timedChest = new TimedChestWidget(this, { rewards, onClaimed: (r, from) => this.flyToPill(this.coins, 'icon-coin', from, r.coinsBefore, r.coinsAfter, 5) });
    this.progressChest = new ProgressChestMini(this, { rewards, onOpen: () => this.openChestOffer() });
    this.header.add([this.headerBg, this.headerShade, this.pills, this.gear.container, this.timedChest.container, this.progressChest.container]);

    this.entries = DISPLAY_ORDER.map((id) => this._levelEntry(getLevel(id)));
    for (let i = 0; i < COMING_SOON_SLOTS; i++) this.entries.push(this._comingSoon());
    this.rows = Math.ceil(this.entries.length / 2);
    this.shelves = Array.from({ length: this.rows }, () => this.add.image(0, 0, 'ui-shelf'));
    this.list.add(this.shelves);
    this.entries.forEach((e) => this.list.add(e.objects));
    this.footer = makeText(this, 0, 0, 'More objects coming soon', { size: 16, color: '#A1948E', weight: '800' });
    this.list.add(this.footer);

    this.badges = addStatusBadges(this, { build: this.services.build, testMode: this.services.platform.testMode });

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.input.on('wheel', this.onWheel, this);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', this.onDown, this);
      this.input.off('pointermove', this.onMove, this);
      this.input.off('pointerup', this.onUp, this);
      this.input.off('pointerupoutside', this.onUp, this);
      this.input.off('wheel', this.onWheel, this);
      this.settings?.destroy();
      this.settings = null;
      this.chestOffer?.destroy();
      this.chestOffer = null;
      this.timedChest.destroy();
      this.progressChest.destroy();
    });
    attachResponsiveLayout(this, (l) => this.relayout(l));
    registerQaScene(this);
  }

  relayout(l) {
    const { W, H, u, margin: m } = l;
    this.bg.setSize(W, H);
    // header: counters · settings (approved single row)
    const headerH = m * 2 + UI.pause * u;
    this.headerH = headerH;
    this.headerBg.setSize(W, headerH);
    this.headerShade.setPosition(0, headerH).setSize(W, 3 * u);
    this.coins.container.setPosition(0, 0);
    this.diamonds.container.setPosition(this.coins.width + 14, 0);
    this.pills.setPosition(m + 6 * u, m + (UI.pause / 2) * u).setScale(u);
    this.gear.setPlacement(W - m - (UI.pause / 2) * u, m + (UI.pause / 2) * u, u);
    // chest column under the counters, left-aligned with the coin counter
    const chestW = TIMED_CHEST_SIZE.w * CHEST_SCALE * u;
    const chestH = TIMED_CHEST_SIZE.h * CHEST_SCALE * u;
    const colX = this.pills.x + 10 * u + chestW / 2;
    const y1 = headerH + CHEST_GAP * u + chestH / 2;
    this.timedChest.container.setPosition(colX, y1).setScale(CHEST_SCALE * u);
    this.progressChest.container.setPosition(colX, y1 + chestH + CHEST_GAP * u).setScale(CHEST_SCALE * u);
    const gutter = colX + chestW / 2 + CHEST_GAP * u; // shelves start right of the column

    // list: one shelf per row with 2 objects; row height follows the width (the list scrolls).
    // The list is centred on the SCREEN (not on the strip right of the chest column): its width is
    // what fits around W / 2 without reaching the column. On narrow phones a fully symmetric list
    // would be too small, so its centre may sit at most 3.5 % of the screen width right of the
    // screen centre (reads as centred); it never touches the column or the right margin.
    const maxW = Math.min(W - m - gutter, 560 * u); // widest list that fits right of the column
    const shift = W * 0.035;
    const shelfW = Math.min(maxW, 2 * (W / 2 + shift - gutter));
    const shelfCx = Math.max(W / 2, gutter + shelfW / 2);
    this.listRect = { x: shelfCx, y: H / 2, w: shelfW, h: H, gutter }; // QA: horizontal extent of the list
    const thumb = shelfW * 0.34;
    const rowH = thumb * 1.62 + 46 * u; // object + shelf + its label, then the next row
    const top = headerH + 18 * u;
    this.shelves.forEach((s, r) => {
      const y = top + rowH * r + thumb * 1.02;
      s.setScale(shelfW / s.width).setPosition(shelfCx, y);
    });
    this.entries.forEach((e, i) => {
      const shelf = this.shelves[Math.floor(i / 2)];
      const x = shelfCx + (i % 2 === 0 ? -1 : 1) * shelfW * 0.24;
      e.layout(x, shelf.y - shelf.displayHeight * 0.12, thumb, u, shelf.y + shelf.displayHeight * 0.5 + 14 * u);
    });
    this.footer.setPosition(shelfCx, top + rowH * this.rows + 4 * u).setScale(u);
    this.contentH = top + rowH * this.rows + 40 * u;
    this.viewH = H - 30 * u;
    this.maxScroll = Math.max(0, this.contentH - this.viewH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    this.list.y = -this.scrollY;
    this.badges.layoutTo(l);
    this.settings?.layout(l);
    this.chestOffer?.layout(l);
    this._updateQa();
    refreshTextResolution(this);
  }

  // ---- scrolling ---------------------------------------------------------------------------
  onDown(pointer) {
    if (this.settings || this.chestOffer || pointer.y < this.headerH) return;
    this.drag = { startY: pointer.y, lastY: pointer.y, startScroll: this.scrollY, moved: 0, lastT: this.time.now };
    this.lastDragMoved = 0;
    this.velocity = 0;
  }

  onMove(pointer) {
    if (!this.drag || !pointer.isDown) return;
    const dy = pointer.y - this.drag.lastY;
    const now = this.time.now;
    this.drag.moved = Math.max(this.drag.moved, Math.abs(pointer.y - this.drag.startY));
    this.lastDragMoved = this.drag.moved;
    this.velocity = -dy / Math.max(1, now - this.drag.lastT);
    this.drag.lastY = pointer.y;
    this.drag.lastT = now;
    this._scrollTo(this.drag.startScroll - (pointer.y - this.drag.startY));
  }

  onUp() {
    if (!this.drag) return;
    this.drag = null;
  }

  onWheel(pointer, over, dx, dy) {
    if (this.settings || this.chestOffer) return;
    this._scrollTo(this.scrollY + dy);
  }

  _scrollTo(y) {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll ?? 0);
    this.list.y = -this.scrollY;
    this._updateQa();
  }

  update(time, delta) {
    if (!this.drag && Math.abs(this.velocity) > 0.02) {
      this._scrollTo(this.scrollY + this.velocity * delta);
      this.velocity *= Math.pow(0.92, delta / 16);
    }
  }

  _updateQa() {
    for (const e of this.entries) e.qa?.();
    // counters (read-only QA geometry for the chest-placement check)
    for (const [id, pill] of [['menu-coins', this.coins], ['menu-diamonds', this.diamonds]]) {
      const m = pill.bg.getWorldTransformMatrix();
      this.qaTargets.set(id, { x: m.tx, y: m.ty, w: Math.abs(pill.bg.displayWidth * this.pills.scaleX), h: Math.abs(pill.bg.displayHeight * this.pills.scaleY), visible: true });
    }
    if (this.listRect) this.qaTargets.set('menu-list', { ...this.listRect, visible: true });
    for (const [id, w] of [['menu-timed-chest', this.timedChest], ['menu-progress-chest', this.progressChest]]) {
      const s = w.container.scaleX;
      this.qaTargets.set(id, { x: w.container.x, y: w.container.y, w: TIMED_CHEST_SIZE.w * s, h: TIMED_CHEST_SIZE.h * s, visible: true });
    }
  }

  // ---- entries ------------------------------------------------------------------------------
  _levelEntry(level) {
    // a completed level shows its restored (clean) object; the dirty one until then
    const done = Boolean(this.services.save.get(`levels.${level.id}`)?.completed);
    const img = this.add.image(0, 0, done && level.thumbnailClean ? level.thumbnailClean : level.thumbnail).setOrigin(0.5, 0.92);
    const name = makeText(this, 0, 0, level.title, { size: 17, color: TEXT.navy, weight: '900' });
    const entry = this.services.save.get(`levels.${level.id}`);
    const badge = entry?.completed ? this.add.image(0, 0, 'icon-check') : null;
    const zone = this.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: true });
    let base = 1;
    let geo = null;
    zone.on('pointerdown', () => img.setScale(base * 0.95));
    zone.on('pointerout', () => img.setScale(base));
    zone.on('pointerup', (pointer) => {
      img.setScale(base);
      if (pointer.y < this.headerH) return; // item scrolled under the header
      // a scroll gesture that started on the item must not open it
      if (this.lastDragMoved > 12 * (this.layout?.u ?? 1)) return;
      this._openLevel(level.id);
    });
    const objects = [img, name, zone, ...(badge ? [badge] : [])];
    return {
      objects,
      layout: (x, shelfY, size, u, labelY) => {
        // optional per-level preview tweak (level.menuPreview: { scale, dy } as a share of the slot)
        const mp = level.menuPreview ?? {};
        base = (size * (mp.scale ?? 1)) / Math.max(img.width, img.height);
        img.setScale(base).setPosition(x, shelfY + size * (0.08 + (mp.dy ?? 0)));
        name.setPosition(x, labelY);
        // long names never overlap the neighbour: a name much wider than its column breaks into two
        // lines at the space nearest its middle ("Golden Ball / Trophy"), then shrinks only if needed
        const maxW = size * 1.36;
        name.setText(level.title).setScale(u);
        if (name.displayWidth > maxW * 1.2 && level.title.includes(' ')) {
          const mid = level.title.length / 2;
          const cut = [...level.title].reduce((best, ch, i) => (ch === ' ' && Math.abs(i - mid) < Math.abs(best - mid) ? i : best), -1);
          name.setText(`${level.title.slice(0, cut)}\n${level.title.slice(cut + 1)}`).setLineSpacing(-4);
        }
        fitText(name, maxW, u);
        // completion check: large and readable, on the preview's upper right
        if (badge) badge.setScale((CHECK_SIZE * u) / badge.width).setPosition(x + size * 0.38, shelfY - size * 0.8);
        const hit = Math.max(size, UI.minTouch * u);
        zone.setPosition(x, shelfY - size * 0.42).setSize(hit, hit);
        geo = { x, y: shelfY - size * 0.42, w: hit, h: hit };
      },
      qa: () => {
        if (!geo) return;
        const y = geo.y - this.scrollY;
        this.qaTargets.set(`menu-level-${level.id}`, { x: geo.x, y, w: geo.w, h: geo.h, visible: y - geo.h / 2 > this.headerH && y + geo.h / 2 < this.viewH, thumb: img.texture.key, check: badge ? badge.displayWidth : 0 });
      },
    };
  }

  _comingSoon() {
    const g = this.add.graphics();
    const q = makeText(this, 0, 0, '?', { size: 40, color: '#CDBFB9', weight: '900' });
    const label = makeText(this, 0, 0, 'Coming soon', { size: 15, color: '#9E918B', weight: '800' });
    return {
      objects: [g, q, label],
      layout: (x, shelfY, size, u, labelY) => {
        g.clear();
        g.fillStyle(0xeee4df, 1).fillCircle(x, shelfY - size * 0.38, size * 0.34);
        q.setPosition(x, shelfY - size * 0.38).setScale(size / 130);
        label.setPosition(x, labelY).setScale(u);
      },
    };
  }

  // Coins / diamonds fly from a chest into the counter, which catches up to the saved value.
  flyToPill(pill, icon, from, before, after, n, delay = 0) {
    pill.setValue(before);
    flyIcons(this, {
      icon,
      from,
      to: pill.iconWorld(),
      fromSize: Math.min(from.size || pill.iconWorldSize(), pill.iconWorldSize() * 1.6),
      toSize: pill.iconWorldSize(),
      n,
      delay,
      depth: 900,
      onEach: (i) => {
        pill.setValue(i === n - 1 ? after : before + Math.round(((after - before) * (i + 1)) / n));
        pill.pulse();
        if (i === n - 1) this.services.audio.play('coins');
      },
    });
  }

  openChestOffer() {
    if (this.chestOffer || this.settings || !this.services.rewards.progressChestState().full) return;
    this.chestOffer = new ChestOfferModal(this, {
      rewards: this.services.rewards,
      // skipping after the "lost forever" warning forfeits the chest
      onSkip: () => {
        this.services.rewards.forfeitProgressChest();
        this.closeChestOffer();
      },
      onOpened: (r, from) => {
        this.flyToPill(this.coins, 'icon-coin', from, r.coinsBefore, r.coinsAfter, 7);
        this.flyToPill(this.diamonds, 'icon-diamond', from, r.diamondsBefore, r.diamondsAfter, 3, 150);
        this.time.delayedCall(1700, () => this.closeChestOffer());
      },
    });
  }

  closeChestOffer() {
    this.chestOffer?.destroy();
    this.chestOffer = null;
    this.progressChest.refresh();
  }

  openSettings() {
    if (this.settings || this.chestOffer) return;
    this.services.audio.play('ui-tap');
    this.settings = new SettingsModal(this, {
      save: this.services.save,
      onClose: () => {
        this.settings.destroy();
        this.settings = null;
      },
    });
  }

  _openLevel(levelId) {
    if (this.leaving || this.settings || this.chestOffer) return;
    this.leaving = true;
    this.services.audio.play('ui-tap');
    this.services.pause.set('navigationBusy', true);
    this.scene.start('Level', { levelId });
  }
}
