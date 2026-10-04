import Phaser from 'phaser';
import { DISPLAY_ORDER, getLevel } from '../content/catalog.js';
import { attachResponsiveLayout, UI } from '../ui/layout.js';
import { makeText } from '../ui/text.js';
import { COLORS, FONT_DISPLAY, TEXT } from '../ui/theme.js';
import { CurrencyPill, addStatusBadges } from '../ui/hud.js';
import { fitImage } from '../ui/kit.js';
import { registerQaScene } from '../app/qa.js';

// Object selection on shelves (2 per shelf, reference Menu_screen.PNG). All objects are open
// from the start (decision 2026-10-04). Layout adapts to the window; nothing is stretched.

const SLOTS = 6; // 3 shelves × 2: Soccer Ball + "coming soon" slots

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

    this.bg = this.add.rectangle(0, 0, 10, 10, COLORS.menuBg).setOrigin(0);
    this.header = this.add.rectangle(0, 0, 10, 10, COLORS.menuHeader).setOrigin(0);
    const save = this.services.save;
    this.topLeft = this.add.container(0, 0);
    this.coins = new CurrencyPill(this, { icon: 'icon-coin', value: save.get('coins') });
    this.diamonds = new CurrencyPill(this, { icon: 'icon-diamond', value: save.get('diamonds') });
    this.topLeft.add([this.coins.container, this.diamonds.container]);
    this.title = makeText(this, 0, 0, 'CleanUp Mini Games', { size: 30, color: TEXT.title, family: FONT_DISPLAY, weight: '900' });
    this.subtitle = makeText(this, 0, 0, 'working title', { size: 14, color: TEXT.neutral, weight: '800' });

    this.shelves = [];
    for (let i = 0; i < SLOTS / 2; i++) this.shelves.push(this.add.image(0, 0, 'ui-shelf'));
    this.slots = [];
    for (let i = 0; i < SLOTS; i++) {
      const levelId = DISPLAY_ORDER[i];
      this.slots.push(levelId ? this._levelSlot(getLevel(levelId)) : this._comingSoon());
    }
    this.badges = addStatusBadges(this, { build: this.services.build, testMode: this.services.platform.testMode });
    attachResponsiveLayout(this, (l) => this.relayout(l));
    registerQaScene(this);
  }

  relayout(l) {
    const { W, H, u, margin: m } = l;
    this.bg.setSize(W, H);
    // header: pills left; title centred (below the pills on narrow screens)
    const pillsRow = m + (UI.pillH / 2) * u;
    this.coins.container.setPosition(0, 0);
    if (l.compact) {
      this.diamonds.container.setPosition(this.coins.width + 14, 0);
      this.topLeft.setPosition(m + 6 * u, pillsRow).setScale(u);
      this.title.setPosition(W / 2, pillsRow + (UI.pillH / 2 + 34) * u);
    } else {
      this.diamonds.container.setPosition(0, UI.pillH + 10);
      this.topLeft.setPosition(m + 6 * u, pillsRow).setScale(u);
      this.title.setPosition(W / 2, pillsRow + 6 * u);
    }
    this.title.setScale(u);
    this.subtitle.setPosition(W / 2, this.title.y + 28 * u).setScale(u);
    const headerBottom = this.subtitle.y + 26 * u;
    this.header.setSize(W, headerBottom);

    // shelves: one column on portrait screens, side by side on landscape screens
    const top = headerBottom + 10 * u;
    const bottom = H - m - 26 * u;
    const nShelves = this.shelves.length;
    const cols = W / H > 1.15 ? nShelves : 1;
    const rows = Math.ceil(nShelves / cols);
    const cellW = (W - 2 * m) / cols;
    const cellH = (bottom - top) / rows;
    const shelfW = Math.min(cellW * 0.92, 580 * u, cellH * 2.4);
    const thumb = Math.min(shelfW * 0.36, cellH * 0.48);
    this.shelves.forEach((shelf, i) => {
      const cx = m + cellW * ((i % cols) + 0.5);
      const cellTop = top + cellH * Math.floor(i / cols);
      shelf.setScale(shelfW / shelf.width);
      const labelSpace = 34 * u;
      const y = Math.min(cellTop + cellH * 0.6, cellTop + cellH - labelSpace - shelf.displayHeight * 0.5);
      shelf.setPosition(cx, y);
      const shelfTopY = y - shelf.displayHeight * 0.12; // top surface of the plank
      const labelY = y + shelf.displayHeight * 0.5 + 14 * u; // under the plank, on the wall
      for (let c = 0; c < 2; c++) {
        const slot = this.slots[i * 2 + c];
        slot?.layout(cx + (c === 0 ? -1 : 1) * shelfW * 0.24, shelfTopY, thumb, u, labelY);
      }
    });
    this.badges.layoutTo(l);
  }

  _levelSlot(level) {
    const img = this.add.image(0, 0, level.thumbnail).setOrigin(0.5, 0.92);
    const name = makeText(this, 0, 0, level.title, { size: 18, color: TEXT.navy, weight: '900' });
    const entry = this.services.save.get(`levels.${level.id}`);
    const badge = entry?.completed ? this.add.image(0, 0, 'icon-check') : null;
    const zone = this.add.zone(0, 0, 10, 10).setInteractive({ useHandCursor: true });
    let base = 1;
    zone.on('pointerdown', () => img.setScale(base * 0.95));
    zone.on('pointerout', () => img.setScale(base));
    zone.on('pointerup', () => {
      img.setScale(base);
      this._openLevel(level.id);
    });
    return {
      layout: (x, shelfY, size, u, labelY) => {
        base = size / Math.max(img.width, img.height);
        img.setScale(base).setPosition(x, shelfY + size * 0.08);
        name.setPosition(x, labelY).setScale(u);
        if (badge) badge.setScale((30 * u) / badge.width).setPosition(x + size * 0.38, shelfY - size * 0.82);
        const hit = Math.max(size, UI.minTouch * u);
        zone.setPosition(x, shelfY - size * 0.42).setSize(hit, hit);
        zone.input.hitArea.setSize(hit, hit);
        this.qaTargets.set(`menu-level-${level.id}`, { x, y: shelfY - size * 0.42, w: hit, h: hit });
      },
    };
  }

  _comingSoon() {
    const g = this.add.graphics();
    const q = makeText(this, 0, 0, '?', { size: 40, color: '#CDBFB9', weight: '900' });
    const label = makeText(this, 0, 0, 'Coming soon', { size: 15, color: '#9E918B', weight: '800' });
    return {
      layout: (x, shelfY, size, u, labelY) => {
        g.clear();
        g.fillStyle(0xeee4df, 1).fillCircle(x, shelfY - size * 0.38, size * 0.34);
        q.setPosition(x, shelfY - size * 0.38).setScale(size / 130);
        label.setPosition(x, labelY).setScale(u);
      },
    };
  }

  _openLevel(levelId) {
    if (this.leaving) return;
    this.leaving = true;
    this.services.audio.play('ui-tap');
    this.services.pause.set('navigationBusy', true);
    this.scene.start('Level', { levelId });
  }
}
