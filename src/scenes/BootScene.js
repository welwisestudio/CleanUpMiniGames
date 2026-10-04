import Phaser from 'phaser';
import { IMAGE_ASSETS } from '../content/assets.js';
import { generateProceduralTextures } from '../services/ProceduralTextures.js';
import { attachResponsiveLayout } from '../ui/layout.js';
import { makeText } from '../ui/text.js';
import { COLORS, FONT_DISPLAY, FONT_UI } from '../ui/theme.js';

// Loads local fonts and images, waits until the platform is initialised and the save is loaded
// (load-before-write), then opens the menu.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const services = this.registry.get('services');
    services.pause.set('assetsLoading', true);
    this.bg = this.add.rectangle(0, 0, 10, 10, COLORS.menuBg).setOrigin(0);
    this.bar = this.add.graphics();
    this.label = makeText(this, 0, 0, 'Loading…', { size: 22 });
    this.progress = 0;
    const draw = () => {
      const l = this.layout;
      if (!l) return;
      this.bg.setSize(l.W, l.H);
      this.label.setPosition(l.W / 2, l.H * 0.5 - 30 * l.u).setScale(l.u);
      const w = Math.min(l.W * 0.6, 260 * l.u);
      const h = 18 * l.u;
      this.bar.clear();
      this.bar.fillStyle(0x0d233e, 0.25).fillRoundedRect(l.W / 2 - w / 2, l.H / 2, w, h, h / 2);
      this.bar.fillStyle(0x31b6f5, 1).fillRoundedRect(l.W / 2 - w / 2, l.H / 2, Math.max(h, w * this.progress), h, h / 2);
    };
    attachResponsiveLayout(this, draw);
    this.load.on('progress', (p) => {
      this.progress = p;
      draw();
    });
    for (const [key, url] of Object.entries(IMAGE_ASSETS)) this.load.image(key, url);
  }

  async create() {
    const services = this.registry.get('services');
    generateProceduralTextures(this);
    // Fonts are bundled locally; wait so the first text is rendered with the right face.
    try {
      await Promise.all([
        document.fonts.load(`900 40px ${FONT_DISPLAY}`),
        document.fonts.load(`800 40px ${FONT_UI}`),
        document.fonts.load(`900 40px ${FONT_UI}`),
      ]);
    } catch {
      /* fall back to system fonts */
    }
    services.pause.set('assetsLoading', false);
    services.ready.then(
      () => {
        services.platform.gameReady();
        this.scene.start('Menu');
      },
      (e) => this.label.setText(`Startup failed: ${e.message}`),
    );
  }
}
