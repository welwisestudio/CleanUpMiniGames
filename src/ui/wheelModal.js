import Phaser from 'phaser';
import { TEXT, FONT_UI, FONT_DISPLAY } from './theme.js';
import { makeText, fitText } from './text.js';
import { Button } from './Button.js';
import { fitImage } from './kit.js';
import { refreshTextResolution } from './layout.js';
import { dimLayer } from './modals.js';
import { getTool } from '../content/tools.js';

// Wheel of Fortune (2026-10-10, reference input/Wheel_Of_Fortune.png): its own popup from the main
// menu (not part of the Store). Code-drawn wheel: 8 segments (alternating purple / lavender) with
// the reward icon + amount, a gold rim with bulbs, a pointer at the top and a "LUCKY SPIN!" ribbon;
// a green button: "FREE SPIN" (first spin of the day) or [ad] "SPIN" (every later spin, no cap).
// Systems pass 2026-10-12: vertical stack title → subtitle → ribbon → pointer → wheel → message →
// button → status, each in its own band (no overlaps). WheelService chooses AND saves the reward when
// the spin is granted; the wheel then accelerates, slows down naturally and stops exactly
// on that segment, and a "You won" card shows the reward. Built in UI units, scaled by `u`.

const R = 138; // wheel radius (UI units)

export class WheelModal {
  constructor(scene, { services, onClose, onChanged }) {
    this.scene = scene;
    this.services = services;
    this.wheelSvc = services.wheel;
    this.onClose = onClose;
    this.onChanged = onChanged;
    this.root = scene.add.container(0, 0).setDepth(900);
    this.dim = dimLayer(scene).setAlpha(0.82).setInteractive();
    this.panel = scene.add.container(0, 0);
    this.root.add([this.dim, this.panel]);
    const segs = this.wheelSvc.segments;
    this.seg = 360 / segs.length;
    this.rotation = 0; // degrees, clockwise
    this.state = 'idle'; // idle · ad · spinning · result

    this.title = fitText(makeText(scene, 0, -R - 156, 'Spin the Wheel!', { size: 34, color: TEXT.white, family: FONT_DISPLAY, weight: '900', stroke: '#3B1F66', strokeThickness: 8 }), 2 * R + 10);
    this.sub = makeText(scene, 0, -R - 118, '', { size: 16, color: '#E8DCFF', weight: '800', family: FONT_UI });
    // wheel (rotates)
    this.wheel = scene.add.container(0, 0);
    const g = scene.add.graphics();
    segs.forEach((s, i) => {
      const a0 = Phaser.Math.DegToRad(-90 + i * this.seg);
      const a1 = Phaser.Math.DegToRad(-90 + (i + 1) * this.seg);
      g.fillStyle(i % 2 ? 0xf2eaff : 0x9a63dc, 1).slice(0, 0, R, a0, a1, false).fillPath();
      g.lineStyle(3, 0xffffff, 0.9).beginPath().moveTo(0, 0).lineTo(Math.cos(a0) * R, Math.sin(a0) * R).strokePath();
    });
    this.wheel.add(g);
    segs.forEach((s, i) => this.wheel.add(this._label(s, i)));
    // rim, bulbs, hub, pointer (static)
    const rim = scene.add.graphics();
    rim.lineStyle(16, 0x6a3bb0, 1).strokeCircle(0, 0, R + 8);
    rim.lineStyle(6, 0xf5c542, 1).strokeCircle(0, 0, R + 15);
    this.bulbs = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const b = scene.add.circle(Math.cos(a) * (R + 8), Math.sin(a) * (R + 8), 6, 0xfff3b0).setStrokeStyle(2, 0xd99a1e);
      this.bulbs.push(b);
    }
    const hub = scene.add.graphics();
    hub.fillStyle(0xf5c542, 1).fillCircle(0, 0, 22).lineStyle(4, 0xd99a1e, 1).strokeCircle(0, 0, 22);
    hub.fillStyle(0xffffff, 0.8).fillCircle(-6, -7, 6);
    // pointer: a gold arrow on the rim whose tip reaches into the top segment (the winning one)
    const ptr = scene.add.graphics();
    ptr.fillStyle(0x000000, 0.2).fillTriangle(-17, -R - 32, 17, -R - 32, 0, -R + 14);
    ptr.fillStyle(0xf5c542, 1).fillTriangle(-16, -R - 36, 16, -R - 36, 0, -R + 10);
    ptr.lineStyle(3, 0xd99a1e, 1).strokeTriangle(-16, -R - 36, 16, -R - 36, 0, -R + 10);
    ptr.fillStyle(0xfff3b0, 1).fillCircle(0, -R - 28, 5);
    // ribbon: its own band above the pointer (gap of ~20 units)
    const rb = scene.add.graphics();
    rb.fillStyle(0xd94a86, 1).fillRoundedRect(-104, -R - 98, 208, 36, 14);
    rb.fillStyle(0xb2306a, 1).fillTriangle(-104, -R - 88, -122, -R - 74, -104, -R - 66).fillTriangle(104, -R - 88, 122, -R - 74, 104, -R - 66);
    const rbt = makeText(scene, 0, -R - 80, 'LUCKY SPIN!', { size: 21, color: TEXT.white, family: FONT_DISPLAY, weight: '900', stroke: '#8A1F4F', strokeThickness: 5 });
    // controls
    this.msg = makeText(scene, 0, R + 42, '', { size: 18, color: '#FFD3D3', weight: '900', family: FONT_UI, stroke: '#3B1F66', strokeThickness: 5 });
    this.spinBtn = new Button(scene, { id: 'wheel-spin', x: 0, y: R + 100, w: 236, h: 66, label: 'SPIN', style: 'green', icon: 'icon-ad-clapper', iconSize: 0.6, fontSize: 28, onClick: () => this.spin() });
    this.left = makeText(scene, 0, R + 152, '', { size: 15, color: '#E8DCFF', weight: '800', family: FONT_UI });
    this.closeBtn = new Button(scene, { id: 'wheel-close', x: R + 40, y: -R - 156, w: 48, h: 48, style: 'square', icon: 'icon-close', iconSize: 0.5, onClick: () => this.state !== 'spinning' && this.state !== 'ad' && this.onClose?.() });
    this.panel.add([this.title, this.sub, this.wheel, rim, ...this.bulbs, hub, ptr, rb, rbt, this.msg, this.spinBtn.container, this.left, this.closeBtn.container]);
    this.blink = scene.time.addEvent({ delay: 380, loop: true, callback: () => this._blink() });
    this._update();
    this.layout(scene.layout);
    refreshTextResolution(scene);
  }

  // icon + amount of a segment, rotated to its centre (reads from the rim inward)
  _label(s, i) {
    const sc = this.scene;
    const c = sc.add.container(0, 0).setAngle(i * this.seg + this.seg / 2);
    const dark = i % 2 === 0;
    let icon;
    let text;
    if (s.kind === 'tool') {
      const t = getTool(s.tool);
      icon = fitImage(sc, t.texture, 50, 0, -R * 0.52);
      text = fitText(makeText(sc, 0, -R * 0.82, 'Gold laser', { size: 15, color: dark ? '#FFFFFF' : '#5B2A9A', weight: '900', family: FONT_UI }), R * 0.62);
    } else {
      icon = fitImage(sc, s.kind === 'coins' ? 'icon-coin' : 'icon-diamond', 34, 0, -R * 0.5);
      text = makeText(sc, 0, -R * 0.8, `${s.amount}`, { size: 22, color: dark ? '#FFFFFF' : '#5B2A9A', weight: '900', family: FONT_UI, stroke: dark ? '#5B2A9A' : null, strokeThickness: dark ? 4 : 0 });
    }
    c.add([icon, text]);
    return c;
  }

  _blink() {
    this.blinkOn = !this.blinkOn;
    const fast = this.state === 'spinning';
    this.bulbs.forEach((b, i) => b.setFillStyle((i + (this.blinkOn ? 0 : 1)) % 2 || fast ? 0xfff3b0 : 0xffc94a));
  }

  // FREE SPIN (no ad) while today's free spin is unused; afterwards [ad] SPIN, unlimited
  _update() {
    const free = this.wheelSvc.freeAvailable();
    this.sub.setText(free ? 'Your first spin today is free!' : 'Watch an ad for another spin');
    this.left.setText(free ? '' : 'Free spin again tomorrow');
    this.spinBtn.setEnabled(this.state === 'idle');
    this.spinBtn.setLabel(this.state === 'ad' ? (free ? 'Spinning…' : 'Loading…') : free ? 'FREE SPIN' : 'SPIN');
    this.spinBtn.setIcon(!free);
    refreshTextResolution(this.scene);
  }

  async spin() {
    if (this.state !== 'idle') return;
    this.msg.setText('');
    this.state = 'ad';
    this._update();
    const r = await this.wheelSvc.spin();
    if (this.destroyed) return;
    if (r.status !== 'granted') {
      this.state = 'idle';
      this.msg.setText(r.status === 'not-earned' ? 'Ad closed early - no spin' : r.status === 'busy' ? '' : 'Ad not available - try again');
      this._update();
      return;
    }
    this.state = 'spinning';
    this.result = r;
    this._update();
    this.onChanged?.(r);
    this._animateTo(r.index);
  }

  // accelerate one turn, then several turns that slow down naturally and stop on the segment centre
  // (± 28 % of the segment, never on a border)
  _animateTo(index) {
    const target = -(index + 0.5) * this.seg + Phaser.Math.FloatBetween(-0.28, 0.28) * this.seg;
    const base = this.rotation;
    const delta = (((target - base) % 360) + 360) % 360;
    const total = 360 * 5 + delta;
    const accel = 360;
    let lastSeg = Math.floor(this.rotation / this.seg);
    const tick = () => {
      this.wheel.setAngle(this.rotation);
      const sg = Math.floor(this.rotation / this.seg);
      if (sg !== lastSeg) {
        lastSeg = sg;
        this.services.audio?.play('wheel-tick');
      }
    };
    const o = { v: base };
    this.spinTween = this.scene.tweens.add({
      targets: o,
      v: base + accel,
      duration: 520,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        this.rotation = o.v;
        tick();
      },
      onComplete: () => {
        if (this.destroyed) return;
        this.spinTween = this.scene.tweens.add({
          targets: o,
          v: base + total,
          duration: 4200,
          ease: 'Cubic.easeOut',
          onUpdate: () => {
            this.rotation = o.v;
            tick();
          },
          onComplete: () => {
            this.rotation = ((base + total) % 360 + 360) % 360;
            this.wheel.setAngle(this.rotation);
            this._showWin();
          },
        });
      },
    });
  }

  // the segment under the pointer for the current rotation (QA: must equal the chosen one)
  landedIndex() {
    const s = (((-this.rotation) % 360) + 360) % 360;
    return Math.floor(s / this.seg) % this.wheelSvc.segments.length;
  }

  _showWin() {
    if (this.destroyed) return;
    this.state = 'result';
    const sc = this.scene;
    const rw = this.result.reward;
    const c = sc.add.container(0, 0);
    const g = sc.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-150, -112, 300, 236, 26);
    g.fillStyle(0xfffaf3, 1).fillRoundedRect(-150, -118, 300, 236, 26).lineStyle(5, 0xb07ae8, 1).strokeRoundedRect(-150, -118, 300, 236, 26);
    const head = makeText(sc, 0, -88, 'You won!', { size: 28, color: '#6B2FA8', family: FONT_DISPLAY, weight: '900' });
    let icon;
    let line;
    if (rw.kind === 'tool') {
      const t = getTool(rw.tool);
      icon = fitImage(sc, t.texture, 86, 0, -14);
      line = `${t.name} - new tool variant!`;
    } else {
      icon = fitImage(sc, rw.kind === 'coins' ? 'icon-coin' : 'icon-diamond', 64, 0, -18);
      line = `+${rw.amount} ${rw.kind === 'coins' ? 'coins' : 'diamonds'}${rw.fallbackFor ? ' (tool already owned)' : ''}`;
    }
    const tl = fitText(makeText(sc, 0, 40, line, { size: 18, color: TEXT.navy, weight: '900', family: FONT_UI }), 270);
    this.collect = new Button(sc, { id: 'wheel-collect', x: 0, y: 86, w: 180, h: 52, label: 'Collect', style: 'green', fontSize: 22, onClick: () => this._collect() });
    c.add([g, head, icon, tl, this.collect.container]);
    c.setScale(0.6).setAlpha(0);
    this.panel.add(c);
    this.winCard = c;
    sc.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    this.services.audio?.rewardFor(rw); // jackpot / tool → win jingle; ordinary prizes → soft pop
    refreshTextResolution(sc);
  }

  _collect() {
    this.collect?.destroy();
    this.winCard?.destroy();
    this.winCard = null;
    this.state = 'idle';
    this._update();
  }

  layout(l) {
    this.dim.setSize(l.W, l.H);
    // desktop / large screens: the close button sits in the screen's top-right corner, clear of the
    // wheel and the title; phones keep it beside the title inside the panel
    const phone = Math.min(l.cssW, l.cssH) < 600;
    const c = this.closeBtn.container;
    if (!phone) {
      if (c.parentContainer !== this.root) {
        this.panel.remove(c);
        this.root.add(c);
      }
      this.closeBtn.setPlacement(l.W - l.margin - 30 * l.u, l.margin + 30 * l.u, l.u * 1.1);
    } else if (c.parentContainer !== this.panel) {
      this.root.remove(c);
      this.panel.add(c);
      this.closeBtn.setPlacement(R + 40, -R - 156, 1);
    }
    // content spans -R-176 (title top) … R+162 (status line) → centred on its middle
    const need = { w: 2 * (R + 64), h: 2 * R + 356 };
    const k = Math.min(l.u * 1.1, (l.W * 0.94) / need.w, (l.H * 0.94) / need.h);
    this.panel.setPosition(l.W / 2, l.H / 2 + 7 * k).setScale(k);
    this._qa();
  }

  // QA (read-only): the vertical bands of the layout in world px (title … status), for overlap checks
  _qa() {
    const qa = this.scene.qaTargets;
    if (!qa) return;
    const k = this.panel.scaleX;
    const band = (id, y0, y1, w) => qa.set(`wheel-band-${id}`, { x: this.panel.x, y: this.panel.y + ((y0 + y1) / 2) * k, w: w * k, h: (y1 - y0) * k, visible: true });
    const th = (t) => t.displayHeight * 0.8; // glyph box (the text frame includes padding / stroke)
    band('title', this.title.y - th(this.title) / 2, this.title.y + th(this.title) / 2, this.title.displayWidth);
    band('sub', this.sub.y - th(this.sub) / 2, this.sub.y + th(this.sub) / 2, this.sub.displayWidth);
    band('ribbon', -R - 98, -R - 62, 244);
    band('pointer', -R - 36, -R + 10, 32);
    band('wheel', -R - 15, R + 15, 2 * R + 30);
    band('button', R + 100 - 33, R + 100 + 33, 236);
    band('status', this.left.y - th(this.left) / 2, this.left.y + th(this.left) / 2, Math.max(1, this.left.displayWidth));
  }

  destroy() {
    this.destroyed = true;
    for (const id of ['title', 'sub', 'ribbon', 'pointer', 'wheel', 'button', 'status']) this.scene.qaTargets?.delete(`wheel-band-${id}`);
    this.blink?.remove();
    this.spinTween?.stop();
    this.collect?.destroy();
    this.spinBtn.destroy();
    this.closeBtn.destroy();
    this.root.destroy();
  }
}
