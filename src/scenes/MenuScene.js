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
import { StoreModal } from '../ui/storeModal.js';
import { WheelModal } from '../ui/wheelModal.js';

// Object selection (reference Menu_screen.PNG, video 00:00 / 08:04–08:16): a vertical list of
// shelves that scrolls downward, 2 objects per shelf row. Header: currency counters and settings.
// Level access (systems pass 2026-10-12, ProgressionService): every level stays visible; completed =
// clean preview + check, open = dirty preview, locked = dimmed preview + padlock + an unlock pill on the
// card (2026-10-13, no popup): [coin price] — a tap buys it, or plays the rewarded ad when the player
// cannot afford it (purple ad badge). The three VIP levels sit spread through the list with a purple
// glow / rays / sparkles backdrop and a "VIP" tag; locked VIP = [▶ Unlock] (rewarded ad only).
// Names sit on yellow labels; objects stand on the shelf by their visible bottom.
// Step 6 reward pass: the timed chest and the level-progress chest form one column on the left,
// directly below the counters; the header keeps its approved single-row height. On narrow
// screens the shelves get a left gutter so the column never covers a level while scrolling.

const COMING_SOON_SLOTS = 1; // fills the last row; more objects arrive at Step 8
const CHEST_SCALE = 0.72; // chest widgets relative to their base size (UI units)
const CHEST_GAP = 8;
const WHEEL_ICON = 56; // Wheel CTA icon size (UI units, desktop)
const WHEEL_PHONE = 50; // on phones: close to the chest widgets (74 × 0.72 ≈ 53)
const CHECK_SIZE = 46; // completion check on a level preview (UI units) // UI units: header → first chest, chest → chest, column → shelves

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(data) {
    this.services = this.registry.get('services');
    // "Next" on a result card whose next level is still locked: the menu opens on that level's
    // unlock card (scrolled into view). This is the ONLY automatic unlock popup (fix 2026-10-12):
    // Phaser keeps a scene's start data until new data is passed (`if (data) settings.data = data`),
    // so the request is consumed here and cleared — a later plain menu start (Pause → Menu, exit,
    // reload) can never replay it.
    this.pendingOffer = data?.fromNext && data.offerLevel ? data.offerLevel : null;
    this.restoreScroll = data?.scrollY ?? null; // an in-place refresh after an unlock keeps the scroll
    this.sys.settings.data = {};
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
    this.adBusy = false;
    this.store = null;
    this.wheel = null;

    this.bg = this.add.rectangle(0, 0, 10, 10, COLORS.menuBg).setOrigin(0);
    this.list = this.add.container(0, 0);
    this.header = this.add.container(0, 0).setDepth(50);
    this.headerBg = this.add.rectangle(0, 0, 10, 10, COLORS.menuHeader).setOrigin(0);
    this.headerShade = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.06).setOrigin(0);
    const save = this.services.save;
    this.pills = this.add.container(0, 0);
    this.coins = new CurrencyPill(this, { icon: 'icon-coin', value: save.get('coins'), onPlus: () => this.openStore('coins') });
    this.diamonds = new CurrencyPill(this, { icon: 'icon-diamond', value: save.get('diamonds'), onPlus: () => this.openStore('gems') });
    this.pills.add([this.coins.container, this.diamonds.container]);
    this.gear = new Button(this, { id: 'menu-settings', x: 0, y: 0, w: UI.pause, h: UI.pause, style: 'square', icon: 'icon-gear', iconSize: 0.62, onClick: () => this.openSettings() });
    // right column under Settings (2026-10-10): Wheel of Fortune, then the Store
    // UI polish 2026-10-11: Store sits next to Settings (top-right pair, same square buttons); the
    // Wheel of Fortune is its own larger CTA below the pair — the wheel art, a small green "SPIN"
    // tag and a gentle idle wiggle invite a tap
    this.storeBtn = new Button(this, { id: 'menu-store', x: 0, y: 0, w: UI.pause, h: UI.pause, style: 'square', icon: 'icon-store', iconSize: 0.74, onClick: () => this.openStore(null) });
    // Wheel CTA (polish 2026-10-11): a standalone wheel icon (no white tile) + the green "SPIN" tag,
    // with an invisible hit area around both; a gentle idle wiggle invites a tap
    this.wheelBtn = this.add.container(0, 0);
    this.wheelIcon = this.add.image(0, 0, 'icon-wheel');
    this.wheelIcon.setScale(WHEEL_ICON / Math.max(this.wheelIcon.width, this.wheelIcon.height));
    this.wheelIconBase = this.wheelIcon.scale;
    const tag = this.add.container(0, WHEEL_ICON * 0.52);
    const tg = this.add.graphics();
    tg.fillStyle(0x1f7a2a, 1).fillRoundedRect(-25, -9, 50, 20, 10);
    tg.fillStyle(0x52cc4e, 1).fillRoundedRect(-25, -11, 50, 20, 10);
    tag.add([tg, makeText(this, 0, -1, 'SPIN', { size: 13, color: '#FFFFFF', weight: '900', stroke: '#1F7A2A', strokeThickness: 3 })]);
    this.wheelHit = this.add.zone(0, 6, WHEEL_ICON + 16, WHEEL_ICON + 30).setInteractive({ useHandCursor: true });
    this.wheelHit.on('pointerdown', (p) => {
      this.wheelHit.downId = p.id;
      this.wheelBtn.setScale(this.wheelBtnScale * 0.93);
    });
    this.wheelHit.on('pointerout', () => {
      this.wheelHit.downId = null;
      this.wheelBtn.setScale(this.wheelBtnScale);
    });
    this.wheelHit.on('pointerup', (p) => {
      this.wheelBtn.setScale(this.wheelBtnScale);
      if (this.wheelHit.downId !== p.id) return;
      this.wheelHit.downId = null;
      this.openWheel();
    });
    this.wheelBtn.add([this.wheelIcon, tag, this.wheelHit]);
    this.wheelBtnScale = 1;
    this.wheelIdle = this.tweens.add({ targets: this.wheelIcon, angle: { from: -10, to: 10 }, duration: 260, yoyo: true, repeat: 2, repeatDelay: 0, ease: 'Sine.easeInOut', loop: -1, loopDelay: 2600 });
    this.sideCol = this.add.container(0, 0).setDepth(55);
    this.sideCol.add([this.wheelBtn]);
    this.header.add(this.storeBtn.container);
    const rewards = this.services.rewards;
    this.timedChest = new TimedChestWidget(this, { rewards, onClaimed: (r, from) => this.flyToPill(this.coins, 'icon-coin', from, r.coinsBefore, r.coinsAfter, 5) });
    this.progressChest = new ProgressChestMini(this, { rewards, onOpen: () => this.openChestOffer() });
    this.header.add([this.headerBg, this.headerShade, this.pills, this.gear.container, this.timedChest.container, this.progressChest.container]);
    this.header.bringToTop(this.storeBtn.container); // above the header background

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
      this.store?.destroy();
      this.store = null;
      this.wheel?.destroy();
      this.wheel = null;
      this.timedChest.destroy();
      this.progressChest.destroy();
    });
    attachResponsiveLayout(this, (l) => this.relayout(l));
    registerQaScene(this);
    // the menu is interactive now → gameReady (sent once per session; the adapter ignores repeats)
    this.services.platform.gameReady();
    // dev / QA only: `?minigame=<level id>` opens that post-cleaning minigame directly (once)
    const mg = new URLSearchParams(window.location.search).get('minigame');
    if (__QA__ && this.services.platform.dev && mg && !this.registry.get('qaMinigameOpened')) {
      this.registry.set('qaMinigameOpened', true);
      const game = this.game;
      this.scene.start('MiniGame', { levelId: mg, onDone: () => game.scene.start('Menu', {}) });
    }
    if (this.pendingOffer) {
      const id = this.pendingOffer;
      this.pendingOffer = null;
      this.time.delayedCall(120, () => {
        // a still-locked next level: scroll it into view and pulse its unlock pill (no popup;
        // nothing is ever opened or bought automatically)
        if (this.leaving || this.services.progression.isPlayable(id)) return;
        const e = this.entries.find((x) => x.levelId === id);
        if (e?.geo() && this.viewH) this._scrollTo(e.geo().y - this.viewH / 2);
        if (e?.pill) this.tweens.add({ targets: e.pill, scale: e.pill.scale * 1.18, duration: 220, yoyo: true, repeat: 2 });
      });
    }
    if (this.restoreScroll != null) this._scrollTo(this.restoreScroll);
  }

  relayout(l) {
    const { W, H, u, margin: m } = l;
    this.bg.setSize(W, H);
    // header: counters · settings (approved single row)
    const headerH = m * 2 + UI.pause * u;
    this.headerH = headerH;
    this.headerBg.setSize(W, headerH);
    this.headerShade.setPosition(0, headerH).setSize(W, 3 * u);
    const gap = 8 * u;
    const rowY = m + (UI.pause / 2) * u;
    // top-right pair: Store · Settings
    const gx = W - m - (UI.pause / 2) * u;
    this.gear.setPlacement(gx, rowY, u);
    this.storeBtn.setPlacement(gx - UI.pause * u - gap, rowY, u);
    // counters: as large as the space left of the pair allows (never under the buttons)
    this.coins.container.setPosition(0, 0);
    this.diamonds.container.setPosition(this.coins.width + 12, 0);
    const pillsW = this.coins.width + 12 + this.diamonds.width;
    const avail = gx - (UI.pause / 2) * u - UI.pause * u - gap * 2 - (m + 4 * u);
    const pk = Math.min(u, avail / pillsW);
    this.pills.setPosition(m + 4 * u, rowY).setScale(pk);
    // Wheel CTA below the pair, right-aligned with Settings
    // phones: about the size of the chest widgets on the left; desktop: the wheel keeps its size
    const phone = Math.min(l.cssW, l.cssH) < 600;
    this.wheelBtnScale = u * (phone ? WHEEL_PHONE / WHEEL_ICON : 1);
    const ws = this.wheelBtnScale;
    // same visual Y as the top chest on the left: the wheel icon's centre on the chest image's centre
    const chestImgY = headerH + CHEST_GAP * u + (TIMED_CHEST_SIZE.h * CHEST_SCALE * u) / 2 - TIMED_CHEST_SIZE.h * 0.14 * CHEST_SCALE * u;
    this.wheelBtn.setPosition(W - m - ((WHEEL_ICON + 4) / 2) * ws, chestImgY).setScale(ws);
    this.wheelRect = { x: this.wheelBtn.x, y: this.wheelBtn.y + 6 * ws, w: (WHEEL_ICON + 16) * ws, h: (WHEEL_ICON + 30) * ws };
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
    // 2026-10-11: exactly centred on the screen — the width is symmetric around W / 2 and stops at
    // the chest column on the left (the same clearance on the right)
    const shelfW = Math.min(560 * u, 2 * (W / 2 - gutter));
    const shelfCx = W / 2;
    this.listRect = { x: shelfCx, y: H / 2, w: shelfW, h: H, gutter }; // QA: horizontal extent of the list
    const thumb = shelfW * 0.34;
    const rowH = thumb * 1.62 + 14 * u; // object + shelf (+ its unlock pill), then the next row (no name labels)
    const top = headerH + 18 * u;
    this.shelves.forEach((s, r) => {
      const y = top + rowH * r + thumb * 1.02;
      s.setScale(shelfW / s.width).setPosition(shelfCx, y);
    });
    // one vertical structure per shelf row (2026-10-13): both cards share the row's lower shelf
    // edge, so their pills and their name labels sit on the same lines whatever the state / object
    const cardX = (i) => shelfCx + (i % 2 === 0 ? -1 : 1) * shelfW * 0.24;
    this.entries.forEach((e, i) => {
      const shelf = this.shelves[Math.floor(i / 2)];
      const x = cardX(i);
      const rowBottom = Math.max(shelfBottomAt(this, shelf, cardX(0)), shelfBottomAt(this, shelf, cardX(1)));
      e.layout(x, shelf.y - shelf.displayHeight * 0.12, thumb, u, shelf.y + shelf.displayHeight * 0.5 + 14 * u, rowBottom);
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
    this.store?.layout(l);
    this.wheel?.layout(l);
    this._updateQa();
    refreshTextResolution(this);
  }

  // ---- scrolling ---------------------------------------------------------------------------
  onDown(pointer) {
    if (this.settings || this.chestOffer || this.store || this.wheel || pointer.y < this.headerH) return;
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
    if (this.settings || this.chestOffer || this.store || this.wheel) return;
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
    if (this.wheelRect) this.qaTargets.set('menu-wheel', { ...this.wheelRect, visible: !this.store && !this.wheel });
    for (const [id, pill] of [['menu-plus-coins', this.coins], ['menu-plus-gems', this.diamonds]]) {
      const r = pill.plusRect();
      if (r) this.qaTargets.set(id, { ...r, visible: !this.store && !this.wheel });
    }
    for (const [id, w] of [['menu-timed-chest', this.timedChest], ['menu-progress-chest', this.progressChest]]) {
      const s = w.container.scaleX;
      this.qaTargets.set(id, { x: w.container.x, y: w.container.y, w: TIMED_CHEST_SIZE.w * s, h: TIMED_CHEST_SIZE.h * s, visible: true });
    }
  }

  // ---- entries ------------------------------------------------------------------------------
  _levelEntry(level) {
    // a completed level shows its restored (clean) object; the dirty one until then
    const prog = this.services.progression;
    const state = prog.status(level.id); // completed · open · locked · vip (locked VIP)
    const done = state === 'completed';
    const isVip = prog.isVip(level.id);
    const locked = state === 'locked' || state === 'vip';
    const key = done && level.thumbnailClean ? level.thumbnailClean : level.thumbnail;
    // menu polish 2026-10-13: every object stands on the shelf by its VISIBLE bottom (transparent
    // padding of the thumbnail ignored) and is sized by its visible box → even, level placement
    const vb = visibleBox(this, key);
    const img = this.add.image(0, 0, key).setOrigin(vb.ox, vb.oy);
    if (locked) img.setTint(isVip ? 0xc9b6ea : 0x9a9a9a).setAlpha(0.86);
    // VIP premium look: soft purple glow, slowly turning light rays and twinkling sparkles behind
    const vip = isVip ? this._vipFx() : null;
    vip?.decorate(img);
    // yellow name label with a dark outline
    const badge = done ? this.add.image(0, 0, 'icon-check') : null;
    const lock = locked ? this.add.graphics() : null;
    // VIP tag on every VIP level (locked or not): purple pill on the preview's upper left
    const chip = isVip ? this.add.container(0, 0) : null;
    if (chip) {
      const cg = this.add.graphics();
      const items = [makeText(this, 0, 0, 'VIP', { size: 15, color: '#FFFFFF', weight: '900', stroke: '#5B2A9A', strokeThickness: 3 })];
      chip.add([cg, ...items]);
      chip.setData({ g: cg, items });
    }
    // unlock pill ON the card (no popup, 2026-10-13): normal locked level = [coin price] (a purple ad
    // badge when the player cannot afford it — a tap then plays the rewarded ad); locked VIP = [▶ Unlock]
    const pill = locked ? this.add.container(0, 0) : null; // open / completed levels: no pill (their label keeps the row line)
    const zone = this.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: true });
    let base = 1;
    let geo = null;
    const entry = { levelId: level.id, busy: false, pill, geo: () => geo };
    // Pill layout (2026-10-13 polish): one capsule centred under the object. The price part has a
    // fixed width (2- and 3-digit prices look the same) with the coin + number centred as a group
    // on one middle line. Not enough coins: a purple ad cap is joined to the capsule's right end
    // (one shape, not a floating badge). VIP: one purple [▶ Unlock] capsule.
    const drawPill = () => {
      if (!pill) return;
      pill.removeAll(true);
      const g = this.add.graphics();
      const H = 30;
      const R = H / 2;
      const afford = !isVip && prog.canAfford(level.id);
      const cap = !isVip && !afford && !entry.busy ? 34 : 0; // ad cap width
      const main = 96; // price part width (same for every price)
      const items = [];
      let fill;
      let rim;
      if (entry.busy) {
        items.push(makeText(this, 0, 0, 'Loading…', { size: 15, color: '#FFFFFF', weight: '900', stroke: '#4B1D7A', strokeThickness: 3 }));
        fill = 0x8a4fe0;
        rim = 0x5b2a9a;
      } else if (isVip) {
        items.push(fitImageMenu(this, 'icon-ad-clapper', 20), makeText(this, 0, 0, 'Unlock', { size: 16, color: '#FFFFFF', weight: '900', stroke: '#4B1D7A', strokeThickness: 3 }));
        fill = 0x8a4fe0;
        rim = 0x5b2a9a;
      } else {
        items.push(fitImageMenu(this, 'icon-coin', 21), makeText(this, 0, 0, `${prog.price(level.id)}`, { size: 17, color: '#FFFFFF', weight: '900', stroke: afford ? '#1F7A2A' : '#4F5763', strokeThickness: 3 }));
        fill = afford ? 0x4fc84b : 0x98a1ab;
        rim = afford ? 0x1f7a2a : 0x5e6670;
      }
      const textW = items.reduce((a, o) => a + o.displayWidth, 0) + 5 * (items.length - 1);
      const mainW = Math.max(main, textW + 26);
      const W = mainW + cap;
      const x0 = -W / 2;
      // shadow, body, top gloss, rim
      // one seamless capsule: the whole shape in the cap colour, the price part laid over it with
      // exactly the same top / bottom edges (square right end at the divider), then ONE shared
      // border around everything and a straight divider spanning the full inner height
      g.fillStyle(0x000000, 0.2).fillRoundedRect(x0, -R + 3, W, H, R);
      if (cap) {
        g.fillStyle(0x8a4fe0, 1).fillRoundedRect(x0, -R, W, H, R);
        g.fillStyle(fill, 1).fillRoundedRect(x0, -R, mainW, H, { tl: R, bl: R, tr: 0, br: 0 });
      } else {
        g.fillStyle(fill, 1).fillRoundedRect(x0, -R, W, H, R);
      }
      g.fillStyle(0xffffff, 0.2).fillRoundedRect(x0 + R * 0.5, -R + 3, W - R, H * 0.34, H * 0.17);
      if (cap) g.fillStyle(0xffffff, 0.9).fillRect(x0 + mainW - 1, -R + 2.5, 2, H - 5);
      g.lineStyle(2.5, 0xffffff, 1).strokeRoundedRect(x0, -R, W, H, R);
      g.lineStyle(1.5, rim, 0.55).strokeRoundedRect(x0 - 2, -R - 2, W + 4, H + 4, R + 2);
      pill.add([g, ...items]);
      // the text glyphs sit a touch high in their box: centre on the visual middle
      items.forEach((o) => o.type === 'Text' && o.setOrigin(0.5, 0.54));
      centerRowMenu(items, x0 + mainW / 2, 0, 5);
      if (cap) pill.add(fitImageMenu(this, 'icon-ad-clapper', 18).setPosition(x0 + mainW + cap / 2, 0));
    };
    drawPill();
    zone.on('pointerdown', () => img.setScale(base * 0.95));
    zone.on('pointerout', () => img.setScale(base));
    zone.on('pointerup', (pointer) => {
      img.setScale(base);
      if (pointer.y < this.headerH) return; // item scrolled under the header
      // a scroll gesture that started on the item must not open it
      if (this.lastDragMoved > 12 * (this.layout?.u ?? 1)) return;
      this._tapLevel(level, entry, drawPill);
    });
    const objects = [...(vip ? [vip.root] : []), img, ...(lock ? [lock] : []), ...(pill ? [pill] : []), zone, ...(badge ? [badge] : []), ...(chip ? [chip] : [])];
    entry.objects = objects;
    entry.layout = (x, shelfY, size, u, labelY, shelfBottom = labelY - 14 * u) => {
      // optional per-level preview scale (level.menuPreview.scale, share of the slot)
      const mp = level.menuPreview ?? {};
      // balanced size: normalised between the longest side and the area (flat / wide objects are
      // not dwarfed by tall ones), the longest side capped so nothing overhangs the slot
      const longest = Math.max(vb.bw, vb.bh);
      const norm = Math.sqrt(longest * Math.sqrt(vb.bw * vb.bh));
      base = Math.min((size * 0.9 * (mp.scale ?? 1)) / norm, (size * 1.1) / longest);
      // card furniture (label, unlock pill) scales with the card on large screens too
      const ku = Math.max(u, size / 150);
      let pillY = 0;
      // the visible bottom sits on the shelf's top surface (same line for every object)
      img.setScale(base).setPosition(x, shelfY + size * 0.06);
      const cy = shelfY + size * 0.06 - vb.bh * base * 0.5; // visible centre
      if (vip) vip.layout(x, cy, size, u);
      // 2026-10-15: no name labels in the menu. The unlock pill sits right under the object's base
      // on the shelf (centred under its own object), on one line per shelf row: shelfY is shared
      // by both cards of a row, so coin / ad / VIP pills line up whatever the object or state
      const half = 12.6 * ku;
      pillY = shelfY + size * 0.06 + half + 2 * ku;
      // completion check: large and readable, on the preview's upper right
      if (badge) badge.setScale((CHECK_SIZE * u) / badge.width).setPosition(x + size * 0.38, shelfY - size * 0.8);
      if (lock) drawPadlock(lock, x, cy - size * 0.04, size * 0.13);
      if (pill) pill.setScale(ku * 0.74).setPosition(x, pillY);
      if (chip) {
        const { g, items } = chip.data.values;
        items.forEach((o) => o.setScale(1));
        // polished VIP badge: deep violet capsule, lighter top, gold rim, small gold crown + VIP
        const w = 82;
        g.clear().fillStyle(0x2a1150, 0.28).fillRoundedRect(-w / 2, -11, w, 28, 14);
        g.fillStyle(0x6a2fc0, 1).fillRoundedRect(-w / 2, -14, w, 28, 14);
        g.fillStyle(0x9a5cf0, 1).fillRoundedRect(-w / 2 + 3, -12, w - 6, 13, { tl: 11, tr: 11, bl: 4, br: 4 });
        g.lineStyle(2.5, 0xf5c542, 1).strokeRoundedRect(-w / 2, -14, w, 28, 14);
        const cx = -w / 2 + 17;
        g.fillStyle(0xf5c542, 1).fillPoints([{ x: cx - 9, y: 6 }, { x: cx - 9, y: -4 }, { x: cx - 4.5, y: 0 }, { x: cx, y: -7 }, { x: cx + 4.5, y: 0 }, { x: cx + 9, y: -4 }, { x: cx + 9, y: 6 }], true);
        g.fillStyle(0xfff2b8, 1).fillCircle(cx, -7, 1.8).fillCircle(cx - 9, -4, 1.5).fillCircle(cx + 9, -4, 1.5);
        items[0].setPosition(cx + 31, 0);
        chip.setScale(Math.max(u, size / 150)).setPosition(x - size * 0.3, shelfY - size * 0.82);
      }
      const hit = Math.max(size, UI.minTouch * u);
      zone.setPosition(x, shelfY - size * 0.42).setSize(hit, hit);
      geo = { x, y: shelfY - size * 0.42, w: hit, h: hit };
    };
    entry.qa = () => {
      if (!geo) return;
      const y = geo.y - this.scrollY;
      this.qaTargets.set(`menu-level-${level.id}`, { x: geo.x, y, w: geo.w, h: geo.h, visible: y - geo.h / 2 > this.headerH && y + geo.h / 2 < this.viewH, thumb: img.texture.key, check: badge ? badge.displayWidth : 0, state, vip: isVip, contentY: geo.y });
    };
    return entry;
  }

  // VIP premium treatment (2026-10-13 rework, cheap and code-drawn): a soft violet bloom (many faint
  // rings, smooth falloff), a few slim tapered light beams that drift slowly (layered for a soft
  // gradient, kept inside the bloom), a thin glowing halo ring, a gentle shine sweep + soft outline
  // glow on the object itself (WebGL preFX) and a few small twinkles. The object stays the focus.
  // Returns { root, layout, decorate(img) }.
  _vipFx() {
    const root = this.add.container(0, 0);
    const bloom = this.add.graphics();
    const beams = this.add.graphics();
    const halo = this.add.graphics();
    const sparks = [0, 1, 2].map(() => this.add.graphics());
    root.add([bloom, beams, halo, ...sparks]);
    this.tweens.add({ targets: beams, angle: 360, duration: 60000, repeat: -1 });
    this.tweens.add({ targets: halo, alpha: { from: 0.65, to: 1 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sparks.forEach((s, i) => {
      s.setAlpha(0).setScale(0.4);
      this.tweens.add({ targets: s, alpha: { from: 0, to: 0.95 }, scale: { from: 0.4, to: 1 }, angle: { from: 0, to: 45 }, duration: 650, yoyo: true, repeat: -1, delay: 300 + i * 900, repeatDelay: 1500 });
    });
    const spots = [[-0.34, -0.36], [0.36, -0.2], [0.26, 0.16]];
    return {
      root,
      decorate: (img) => {
        img.preFX?.addGlow(0xc8a2ff, 3, 0, false, 0.1, 10);
        img.preFX?.addShine(0.45, 0.35, 3.5);
      },
      layout: (x, y, size, u) => {
        root.setPosition(x, y);
        const R = size * 0.56;
        bloom.clear();
        for (let i = 16; i >= 1; i--) {
          const t = i / 16;
          bloom.fillStyle(t > 0.6 ? 0xc9a7ff : 0xa874ff, 0.035 * (1.15 - t * 0.6)).fillCircle(0, 0, R * t);
        }
        beams.clear();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + (i % 2 ? 0.18 : 0);
          const len = R * (i % 2 ? 0.86 : 1);
          [[0.075, 0.05], [0.045, 0.07], [0.02, 0.1]].forEach(([wd, al]) => {
            beams.fillStyle(0xe9dcff, al);
            beams.fillTriangle(0, 0, Math.cos(a - wd) * len, Math.sin(a - wd) * len, Math.cos(a + wd) * len, Math.sin(a + wd) * len);
          });
        }
        halo.clear();
        halo.lineStyle(7 * u, 0xb98bff, 0.14).strokeCircle(0, 0, R * 0.8);
        halo.lineStyle(2 * u, 0xf1e6ff, 0.75).strokeCircle(0, 0, R * 0.8);
        sparks.forEach((s, i) => {
          const k = u * (i === 0 ? 1.1 : 0.8);
          s.clear().fillStyle(0xffffff, 1);
          s.fillTriangle(0, -9 * k, 2 * k, 0, -2 * k, 0).fillTriangle(0, 9 * k, 2 * k, 0, -2 * k, 0);
          s.fillTriangle(-9 * k, 0, 0, 2 * k, 0, -2 * k).fillTriangle(9 * k, 0, 0, 2 * k, 0, -2 * k);
          s.fillStyle(0xf3e6ff, 1).fillCircle(0, 0, 2 * k);
          s.setPosition(spots[i][0] * size, spots[i][1] * size);
        });
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
    this.services.audio.play('chest-open');
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

  _syncPills() {
    this.coins.setValue(this.services.save.get('coins'));
    this.diamonds.setValue(this.services.save.get('diamonds'));
    this.progressChest.refresh?.();
  }

  // Store (2026-10-10): from the "+" next to a counter (opens at that currency) or the Store button.
  openStore(focus) {
    if (this.store || this.wheel || this.settings || this.chestOffer || this.leaving) return;
    this.services.audio.play('ui-tap');
    this.store = new StoreModal(this, {
      services: this.services,
      focus,
      onChanged: () => this._syncPills(),
      onClose: () => {
        this.store?.destroy();
        this.store = null;
        this._syncPills();
        this._updateQa();
      },
    });
  }

  // Wheel of Fortune (2026-10-10): its own popup (not inside the Store).
  openWheel() {
    if (this.store || this.wheel || this.settings || this.chestOffer || this.leaving) return;
    this.services.audio.play('ui-pop');
    this.wheel = new WheelModal(this, {
      services: this.services,
      onChanged: () => this._syncPills(),
      onClose: () => {
        this.wheel?.destroy();
        this.wheel = null;
        this._syncPills();
        this._updateQa();
      },
    });
  }

  openSettings() {
    if (this.settings || this.chestOffer || this.store || this.wheel) return;
    this.services.audio.play('ui-tap');
    this.settings = new SettingsModal(this, {
      save: this.services.save,
      onClose: () => {
        this.settings.destroy();
        this.settings = null;
      },
    });
  }

  // A tap on a level card (2026-10-13: no popup): open it when playable; a locked normal level is
  // bought right away when the player has enough coins, otherwise the rewarded ad plays straight from
  // the card; a locked VIP level plays the rewarded ad (the only way to open it). A successful unlock
  // refreshes the menu in place (same scroll) — the level is then open; nothing starts by itself.
  async _tapLevel(level, entry, redraw) {
    if (this.leaving || this.settings || this.chestOffer || this.store || this.wheel) return;
    const prog = this.services.progression;
    if (prog.isPlayable(level.id)) return this._openLevel(level.id);
    if (!entry || entry.busy || this.adBusy) return;
    this.services.audio.play('ui-tap');
    if (!prog.isVip(level.id) && prog.canAfford(level.id)) {
      const r = prog.purchase(level.id);
      if (r.status === 'purchased') this._unlocked(r.savePromise);
      return;
    }
    entry.busy = true;
    this.adBusy = true;
    redraw();
    const r = await prog.unlockWithAd(level.id);
    this.adBusy = false;
    if (this.leaving || !this.sys.isActive()) return;
    entry.busy = false;
    if (r.status === 'unlocked' || r.status === 'open') return this._unlocked();
    redraw();
    this._toast(r.status === 'not-earned' ? 'Ad closed early - still locked' : 'Ad not available - try again', entry.geo());
  }

  _unlocked(savePromise) {
    this.services.audio.play('unlock');
    const go = () => !this.leaving && this.scene.restart({ scrollY: this.scrollY });
    (savePromise ?? Promise.resolve()).then(go, go);
  }

  // short message floating above a card (in the scrolling list)
  _toast(msg, geo) {
    if (!geo) return;
    this.services.audio.play('error');
    const u = this.layout?.u ?? 1;
    const t = makeText(this, geo.x, geo.y - geo.h * 0.2, msg, { size: 15, color: '#FFFFFF', weight: '900', stroke: '#B0302A', strokeThickness: 4 }).setScale(u).setDepth(60);
    this.list.add(t);
    this.tweens.add({ targets: t, y: t.y - 26 * u, alpha: { from: 1, to: 0 }, delay: 1100, duration: 500, onComplete: () => t.destroy() });
  }

  _openLevel(levelId) {
    if (this.leaving || this.settings || this.chestOffer) return;
    this.leaving = true;
    this.services.audio.play('ui-tap');
    this.services.pause.set('navigationBusy', true);
    this.scene.start('Level', { levelId });
  }
}

// The shelf art's visible bottom edge (lowest opaque pixel) per column, as a fraction of its height;
// gives the edge under any x of a placed shelf (the shelf is drawn in perspective). Cached.
let SHELF_PROFILE = null;
function shelfBottomAt(scene, shelf, x) {
  if (!SHELF_PROFILE) {
    const f = scene.textures.getFrame(shelf.texture.key);
    const w = f.cutWidth;
    const h = f.cutHeight;
    const cols = 64;
    SHELF_PROFILE = new Array(cols).fill(0.5);
    try {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(f.source.image, f.cutX, f.cutY, w, h, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      for (let k = 0; k < cols; k++) {
        const cx = Math.min(w - 1, Math.round(((k + 0.5) / cols) * w));
        let y = h - 1;
        while (y > 0 && d[(y * w + cx) * 4 + 3] < 128) y--;
        SHELF_PROFILE[k] = (y + 1) / h;
      }
    } catch {
      /* keep the defaults */
    }
  }
  const fx = (x - (shelf.x - shelf.displayWidth / 2)) / shelf.displayWidth;
  const k = Math.max(0, Math.min(SHELF_PROFILE.length - 1, Math.floor(fx * SHELF_PROFILE.length)));
  return shelf.y - shelf.displayHeight / 2 + SHELF_PROFILE[k] * shelf.displayHeight;
}

// Visible (non-transparent) box of a texture, as origin fractions + size in texture px; cached.
const VISIBLE = new Map();
function visibleBox(scene, key) {
  if (VISIBLE.has(key)) return VISIBLE.get(key);
  const f = scene.textures.getFrame(key);
  const w = f.cutWidth;
  const h = f.cutHeight;
  let r = { ox: 0.5, oy: 0.92, bw: w, bh: h };
  try {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(f.source.image, f.cutX, f.cutY, w, h, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 >= 0) r = { ox: (x0 + x1 + 1) / 2 / w, oy: (y1 + 1) / h, bw: x1 - x0 + 1, bh: y1 - y0 + 1 };
  } catch {
    /* keep the defaults */
  }
  VISIBLE.set(key, r);
  return r;
}

function fitImageMenu(scene, key, size) {
  const img = scene.add.image(0, 0, key);
  img.setScale(size / Math.max(img.width, img.height));
  return img;
}

// small helper for the card decorations (UI units)
function centerRowMenu(items, cx, cy, gap) {
  const total = items.reduce((a, o) => a + o.displayWidth, 0) + gap * (items.length - 1);
  let x = cx - total / 2;
  for (const o of items) {
    o.setPosition(x + o.displayWidth / 2, cy);
    x += o.displayWidth + gap;
  }
}

// A soft white padlock (code-drawn): shackle arc over a rounded body with a keyhole.
function drawPadlock(g, x, y, s) {
  g.clear();
  const bw = s * 1.15;
  const bh = s * 0.95;
  g.fillStyle(0x000000, 0.18).fillRoundedRect(x - bw / 2, y - bh * 0.1 + s * 0.06, bw, bh, s * 0.18);
  g.lineStyle(s * 0.2, 0xffffff, 1);
  g.beginPath();
  g.arc(x, y - bh * 0.1, s * 0.36, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(0xffffff, 1).fillRoundedRect(x - bw / 2, y - bh * 0.1, bw, bh, s * 0.18);
  g.fillStyle(0x6b6f80, 1).fillCircle(x, y + bh * 0.3, s * 0.12).fillRect(x - s * 0.05, y + bh * 0.3, s * 0.1, s * 0.26);
}
