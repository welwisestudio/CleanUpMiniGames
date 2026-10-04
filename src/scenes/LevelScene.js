import Phaser from 'phaser';
import { getLevel, nextLevelId } from '../content/catalog.js';
import { getTool } from '../content/tools.js';
import { FX_CHUNKS } from '../content/assets.js';
import { createMechanic } from '../mechanics/index.js';
import { ObjectStack } from './level/ObjectStack.js';
import { ToolController } from './level/ToolController.js';
import { attachResponsiveLayout, coverImage, fitObject, refreshTextResolution, UI } from '../ui/layout.js';
import { CurrencyPill, ToolStrip, ProgressBar, addStatusBadges } from '../ui/hud.js';
import { Button } from '../ui/Button.js';
import { ResultCard, PauseModal } from '../ui/modals.js';
import { registerQaScene } from '../app/qa.js';

// One play run of a level: sequential stages → completion → result.
// States: playing → transition → … → completing → result.
// The scene wires input, mechanics, HUD and services; it holds no economy rules itself.
// Everything is laid out from the live screen size (relayout) — no fixed canvas.

const CONFETTI_COLORS = [0xff4d6d, 0xffd60a, 0x4cc9f0, 0x80ed99, 0xc77dff, 0xff9f1c];

export class LevelScene extends Phaser.Scene {
  constructor() {
    super('Level');
  }

  init(data) {
    this.levelId = data.levelId;
  }

  create() {
    const s = (this.services = this.registry.get('services'));
    this.level = getLevel(this.levelId);
    this.runId = s.nextRunId();
    this.qaButtons = new Map();
    this.qaTargets = new Map();
    this.alive = true;
    this.leaving = false; // scene objects are reused between runs
    this.pauseModal = null;
    this.result = null;
    this.reward = null;
    this.levelSeconds = null;
    this.state = 'loading';
    this.stageIndex = 0;
    this.activePointerId = null;
    this.stageLog = [];
    this.levelStartedAt = this.time.now;

    // Background (portrait or landscape art, "cover" fitted — never stretched).
    this.bgPortrait = this.add.image(0, 0, this.level.backgrounds.portrait);
    this.bgLandscape = this.add.image(0, 0, this.level.backgrounds.landscape);

    this.stack = new ObjectStack(this, this.levelId, this.level.object);
    this.tools = new ToolController(this);

    this.fx = null; // particle emitters, rebuilt for the object scale in relayout

    // HUD (built in UI units, anchored and scaled in relayout)
    const save = s.save;
    this.hud = this.add.container(0, 0).setDepth(100);
    this.topLeft = this.add.container(0, 0);
    this.coinsPill = new CurrencyPill(this, { icon: 'icon-coin', value: save.get('coins') });
    this.diamondsPill = new CurrencyPill(this, { icon: 'icon-diamond', value: save.get('diamonds') });
    this.topLeft.add([this.coinsPill.container, this.diamondsPill.container]);
    this.strip = new ToolStrip(this, { stages: this.level.stages, getTool });
    this.progressBar = new ProgressBar(this);
    this.pauseButton = new Button(this, { id: 'hud-pause', x: 0, y: 0, w: UI.pause, h: UI.pause, style: 'square', icon: 'icon-pause', iconSize: 0.5, onClick: () => this.openPause() });
    this.hud.add([this.topLeft, this.strip.container, this.progressBar.container, this.pauseButton.container]);
    this.badges = addStatusBadges(this, { build: s.build, testMode: s.platform.testMode });

    // Input (single active pointer; mouse and touch go through the same Phaser pointer API).
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.onGameOut = () => this.endStroke();
    this.input.on('gameout', this.onGameOut);
    this.game.events.on('blur', this.endStroke, this);

    this.onPauseChange = (snap) => this.applyPause(snap.paused);
    s.pause.on('change', this.onPauseChange);

    this.events.once('shutdown', () => this.cleanup());
    s.pause.set('navigationBusy', false);
    attachResponsiveLayout(this, (l) => this.relayout(l));
    this.applyPause(s.pause.isPaused);
    this.startStage(0);
    registerQaScene(this);
  }

  // ---- responsive layout -------------------------------------------------------------------
  relayout(l) {
    const { W, H, u, margin: m } = l;
    // A resize in the middle of a stroke ends the stroke (no jump of the working point).
    this.endStroke();
    const landscape = W / H > 1.05;
    this.bgPortrait.setVisible(!landscape);
    this.bgLandscape.setVisible(landscape);
    coverImage(landscape ? this.bgLandscape : this.bgPortrait, W, H);

    this.objFit = fitObject(l, this.level.object.radius);
    this.stack.setLayout(this.objFit.cx, this.objFit.cy, this.objFit.scale);
    this.tools.setLayout({ scale: this.objFit.scale, restX: this.objFit.cx, restY: this.objFit.restY });

    // HUD anchors
    this.coinsPill.container.setPosition(0, 0);
    if (l.compact) this.diamondsPill.container.setPosition(this.coinsPill.width + 14, 0);
    else this.diamondsPill.container.setPosition(0, UI.pillH + 10);
    this.topLeft.setPosition(m + 6 * u, m + (UI.pillH / 2) * u).setScale(u);
    this.strip.container.setPosition(W / 2, l.stripY).setScale(u);
    this.progressBar.container.setPosition(W / 2, l.progressY).setScale(u);
    this.pauseButton.setPlacement(W - m - (UI.pause / 2) * u, m + (UI.pause / 2) * u, u);
    this.badges.layoutTo(l);

    // QA geometry of HUD blocks (read-only, used by layout tests)
    const pillsW = (l.compact ? this.coinsPill.width * 2 + 14 : this.coinsPill.width) * u;
    const pillsH = (l.compact ? UI.pillH : UI.pillH * 2 + 10) * u;
    this.qaTargets.set('hud-pills', { x: m + 6 * u + pillsW / 2 - 10 * u, y: m + pillsH / 2, w: pillsW + 10 * u, h: pillsH });
    const stripW = (UI.tileGap * 2 + UI.tileSmall) * u;
    this.qaTargets.set('hud-strip', { x: W / 2, y: (l.stripY + l.progressY) / 2 + 6 * u, w: stripW, h: l.progressY - l.stripY + (UI.tile / 2 + UI.progressH / 2) * u });
    this.qaTargets.set('object', { x: this.objFit.cx, y: this.objFit.cy, w: this.objFit.R * 2, h: this.objFit.R * 2 });

    this.buildFx(this.objFit.scale / 0.4);

    this.result?.layout(l);
    this.pauseModal?.layout(l);
  }

  // FX emitters (generated sprites + soft code-drawn dots), sized and sped up with the object.
  buildFx(k) {
    if (this.fx) Object.values(this.fx).forEach((e) => e.destroy());
    const mk = (key, cfg) => this.add.particles(0, 0, key, { emitting: false, ...cfg }).setDepth(45);
    this.fx = {
      chips: mk(FX_CHUNKS[0], { speed: { min: 140 * k, max: 420 * k }, angle: { min: 200, max: 340 }, gravityY: 1800 * k, lifespan: 750, scale: { start: 0.35 * k, end: 0.2 * k }, rotate: { min: 0, max: 360 } }),
      dust: mk('fx-dot', { speed: { min: 30 * k, max: 140 * k }, lifespan: 650, scale: { start: 1.4 * k, end: 3.4 * k }, alpha: { start: 0.45, end: 0 }, tint: 0xc9bfae }),
      mist: mk('fx-drop-1', { speed: { min: 80 * k, max: 320 * k }, angle: { min: 180, max: 360 }, gravityY: 1200 * k, lifespan: 500, scale: { start: 0.35 * k, end: 0.15 * k }, alpha: { start: 0.9, end: 0 } }),
      foam: mk('fx-dot', { speed: { min: 40 * k, max: 160 * k }, lifespan: 500, scale: { start: 1.0 * k, end: 1.8 * k }, alpha: { start: 0.9, end: 0 } }),
    };
  }

  // ---- stages ----------------------------------------------------------------------------
  startStage(i) {
    this.stageIndex = i;
    this.stage = this.level.stages[i];
    this.tool = getTool(this.stage.tool);
    this.mechanic = createMechanic(this.stage, { stack: this.stack, tool: this.tool });
    this.tools.setTool(this.tool, { animate: i > 0 });
    this.strip.setIndex(i);
    refreshTextResolution(this);
    this.progressBar.set(0);
    this.stageStartedAt = this.time.now;
    this.state = 'playing';
  }

  canInteract() {
    return this.state === 'playing' && !this.services.pause.isPaused;
  }

  toWorld(pointer) {
    return { x: pointer.x, y: pointer.y };
  }

  onPointerDown(pointer, over) {
    if (!this.canInteract() || this.activePointerId !== null) return;
    if (over && over.length) return; // pressed a UI control
    this.activePointerId = pointer.id;
    const w = this.toWorld(pointer);
    this.tools.press(w);
    this.lastWork = this.tools.workPointFor(w);
    if (this.tool.kind === 'contact') this.mechanic.tap(this.lastWork);
  }

  onPointerMove(pointer) {
    if (pointer.id !== this.activePointerId) return;
    if (!this.canInteract()) {
      this.endStroke();
      return;
    }
    const w = this.toWorld(pointer);
    this.tools.move(w);
    if (this.tool.kind === 'contact') {
      const wp = this.tools.workPointFor(w);
      const before = this.mechanic.validContacts;
      this.mechanic.stroke(this.lastWork, wp);
      if (this.mechanic.validContacts > before) this.emitContactFx(wp);
      this.lastWork = wp;
    }
  }

  onPointerUp(pointer) {
    if (pointer.id === this.activePointerId) this.endStroke();
  }

  endStroke() {
    if (this.activePointerId === null) return;
    this.activePointerId = null;
    this.tools.release();
  }

  emitContactFx(p) {
    const id = this.stage.id;
    if (id === 'chisel' && Math.random() < 0.35) {
      this.fx.chips.setTexture(FX_CHUNKS[Math.floor(Math.random() * FX_CHUNKS.length)]);
      this.fx.chips.emitParticleAt(p.x, p.y, 1);
    } else if (id === 'dry-brush' && Math.random() < 0.5) this.fx.dust.emitParticleAt(p.x, p.y, 1);
    else if (id === 'scrub' && Math.random() < 0.3) this.fx.foam.emitParticleAt(p.x, p.y, 1);
  }

  update(time, delta) {
    if (!this.alive) return;
    this.tools.update();
    if (this.state !== 'playing') return;
    if (this.activePointerId !== null && this.tool.kind === 'jet' && this.canInteract() && this.tools.pointerWorld) {
      const nozzle = this.tools.workPointFor(this.tools.pointerWorld);
      const impact = this.tools.impactFor(nozzle);
      const before = this.mechanic.validContacts;
      this.mechanic.spray(impact, Math.min(delta, 50) / 1000);
      if (this.mechanic.validContacts > before && Math.random() < 0.5) {
        (this.tool.jetStyle === 'foam' ? this.fx.foam : this.fx.mist).emitParticleAt(impact.x, impact.y, 1);
      }
    }
    this.progressBar.set(this.mechanic.progress);
    if (this.mechanic.completed) this.completeStage();
  }

  async completeStage() {
    if (this.state !== 'playing') return;
    this.state = 'transition';
    this.endStroke();
    const s = this.services;
    const stage = this.stage;
    this.stageLog.push({ id: stage.id, seconds: (this.time.now - this.stageStartedAt) / 1000, contacts: this.mechanic.validContacts });
    this.progressBar.set(1);
    this.strip.markDone();
    s.audio.play('stage-complete');
    await this.mechanic.finish(300);
    await this.wait(700);
    if (!this.alive) return;
    await this.tools.exit();
    if (!this.alive) return;
    if (this.stageIndex >= this.level.stages.length - 1) {
      this.completeLevel();
      return;
    }
    await this.strip.slideNext();
    if (!this.alive) return;
    this.startStage(this.stageIndex + 1);
  }

  completeLevel() {
    const s = this.services;
    this.state = 'completing';
    this.levelSeconds = (this.time.now - this.levelStartedAt) / 1000;
    // Reward is accepted first; every animation below only displays it.
    this.reward = s.rewards.grantLevelCompletion(this.levelId, this.runId);
    s.audio.play('level-complete');
    this.tweens.add({ targets: [this.hud, this.badges], alpha: 0, duration: 250 });
    this.sparkles();
    this.confetti();
    this.wait(1750).then(() => {
      if (!this.alive) return;
      this.showResult();
    });
  }

  sparkles() {
    const { cx, cy, R } = this.objFit;
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = R * (0.3 + Math.random() * 0.6);
      const sp = this.add.image(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 'fx-sparkle').setDepth(60).setScale(0).setAlpha(0.95);
      const s = (R * (0.18 + Math.random() * 0.12)) / sp.width;
      this.tweens.add({ targets: sp, scale: s, angle: 45, duration: 260, delay: i * 140, yoyo: true, hold: 120, ease: 'Sine.easeOut', onComplete: () => sp.destroy() });
    }
  }

  confetti() {
    const { W, H, u } = this.layout;
    for (const [x, angle] of [[0, { min: -80, max: -45 }], [W, { min: -135, max: -100 }]]) {
      const e = this.add.particles(x, H, 'fx-rect', {
        speed: { min: 0.95 * H, max: 1.5 * H },
        angle,
        gravityY: 1.3 * H,
        lifespan: 2200,
        rotate: { start: 0, end: 540 },
        scaleX: { min: 1 * u, max: 1.6 * u },
        scaleY: { min: 1 * u, max: 2 * u },
        tint: CONFETTI_COLORS,
        emitting: false,
      }).setDepth(450);
      e.explode(70);
      const puff = this.add.particles(x, H - 20 * u, 'fx-dot', { speed: { min: 40 * u, max: 160 * u }, lifespan: 600, scale: { start: 1.5 * u, end: 3 * u }, alpha: { start: 0.8, end: 0 }, emitting: false }).setDepth(449);
      puff.explode(10);
    }
  }

  showResult() {
    this.state = 'result';
    const next = nextLevelId(this.levelId);
    this.result = new ResultCard(this, {
      reward: this.reward,
      picture: this.level.resultPicture,
      onHome: () => this.goMenu(),
      onReplay: () => this.replay(),
      onNext: next ? () => this.goLevel(next) : null,
    });
    // Coins fly into the counter; the counter catches up to the already-saved value.
    this.hud.setAlpha(1).setDepth(700);
    [this.strip.container, this.progressBar.container, this.pauseButton.container].forEach((c) => c.setVisible(false));
    const from = this.result.rewardIconWorld();
    const to = this.coinsPill.iconWorld();
    const { coinsBefore, coinsAfter } = this.reward;
    this.coinsPill.setValue(coinsBefore);
    const n = 5;
    const coinSize = 40 * this.layout.u;
    for (let i = 0; i < n; i++) {
      const coin = this.add.image(from.x, from.y, 'icon-coin').setDepth(800);
      coin.setScale(coinSize / coin.width);
      this.tweens.add({
        targets: coin,
        x: to.x,
        y: to.y,
        delay: 450 + i * 90,
        duration: 600,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          coin.destroy();
          const shown = i === n - 1 ? coinsAfter : coinsBefore + Math.round(((coinsAfter - coinsBefore) * (i + 1)) / n);
          this.coinsPill.setValue(shown);
          this.coinsPill.pulse();
          if (i === n - 1) this.services.audio.play('coins');
        },
      });
    }
  }

  // ---- pause -----------------------------------------------------------------------------
  openPause() {
    if (this.state === 'result' || this.state === 'completing' || this.pauseModal) return;
    this.services.audio.play('ui-tap');
    this.services.pause.set('user', true);
    this.pauseModal = new PauseModal(this, {
      onResume: () => this.closePause(),
      onRestart: () => this.replay(),
      onMenu: () => this.goMenu(),
    });
  }

  closePause() {
    this.pauseModal?.destroy();
    this.pauseModal = null;
    this.services.pause.set('user', false);
  }

  applyPause(paused) {
    if (paused) {
      this.endStroke();
      this.tweens.pauseAll();
      this.time.paused = true;
    } else {
      this.tweens.resumeAll();
      this.time.paused = false;
    }
  }

  // ---- navigation ------------------------------------------------------------------------
  leave(fn) {
    if (this.leaving) return;
    this.leaving = true;
    this.result?.setEnabled(false);
    this.pauseModal?.setEnabled(false);
    const s = this.services;
    s.pause.set('user', false);
    s.pause.set('navigationBusy', true);
    fn();
  }

  goMenu() {
    this.leave(() => this.scene.start('Menu'));
  }

  replay() {
    this.leave(() => this.scene.start('Level', { levelId: this.levelId }));
  }

  goLevel(id) {
    this.leave(() => this.scene.start('Level', { levelId: id }));
  }

  wait(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  cleanup() {
    this.alive = false;
    this.services.pause.off('change', this.onPauseChange);
    this.game.events.off('blur', this.endStroke, this);
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.input.off('pointerupoutside', this.onPointerUp, this);
    this.input.off('gameout', this.onGameOut);
    this.tweens.killAll();
    this.time.paused = false;
    this.mechanic?.dispose();
    this.tools.destroy();
    this.stack.destroy();
  }
}
