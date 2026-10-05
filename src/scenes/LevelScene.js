import Phaser from 'phaser';
import { getLevel, nextLevelId } from '../content/catalog.js';
import { getTool } from '../content/tools.js';
import { FX_CHUNKS } from '../content/assets.js';
import { createMechanic, gestureFamily } from '../mechanics/index.js';
import { HintController } from './level/HintController.js';
import { ObjectStack } from './level/ObjectStack.js';
import { ToolController } from './level/ToolController.js';
import { attachResponsiveLayout, coverImage, fitObject, refreshTextResolution, UI } from '../ui/layout.js';
import { CurrencyPill, ToolStrip, ProgressBar, addStatusBadges } from '../ui/hud.js';
import { Button } from '../ui/Button.js';
import { ResultCard, PauseModal, SettingsModal } from '../ui/modals.js';
import { ChestOfferModal, TimedChestWidget, ProgressChestMini, TIMED_CHEST_SIZE, flyIcons, worldOf } from '../ui/rewards.js';
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
    this.hint = new HintController(this);
    this.idleMs = 0;
    this.lastContacts = 0;
    this.settingsModal = null;
    this.fitKey = null;
    this.mechanic = null;
    this.stage = null;

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
    // Chests stay visible during play (display only: a touch here never claims mid-stroke;
    // claiming happens in the hub and on the completed screen).
    this.hudTimedChest = new TimedChestWidget(this, { rewards: s.rewards, interactive: false });
    this.hudProgressChest = new ProgressChestMini(this, { rewards: s.rewards, interactive: false });
    this.hud.add([this.topLeft, this.strip.container, this.progressBar.container, this.pauseButton.container, this.hudTimedChest.container, this.hudProgressChest.container]);
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

    this.applyFit(false);
    this.hint.setUnit(u);

    // HUD anchors
    this.coinsPill.container.setPosition(0, 0);
    if (l.compact) this.diamondsPill.container.setPosition(this.coinsPill.width + 14, 0);
    else this.diamondsPill.container.setPosition(0, UI.pillH + 10);
    this.topLeft.setPosition(m + 6 * u, m + (UI.pillH / 2) * u).setScale(u);
    this.strip.container.setPosition(W / 2, l.stripY).setScale(u);
    this.progressBar.container.setPosition(W / 2, l.progressY).setScale(u);
    this.pauseButton.setPlacement(W - m - (UI.pause / 2) * u, m + (UI.pause / 2) * u, u);
    // chest column under the counters, left of the tool strip, above the play area
    {
      const cs = 0.7;
      const cw = TIMED_CHEST_SIZE.w * cs * u;
      const ch = TIMED_CHEST_SIZE.h * cs * u;
      const top = m + (l.compact ? UI.pillH : UI.pillH * 2 + 10) * u + 6 * u;
      const cx = m + 2 * u + cw / 2;
      this.hudTimedChest.container.setPosition(cx, top + ch / 2).setScale(cs * u);
      this.hudProgressChest.container.setPosition(cx, top + ch * 1.5 + 4 * u).setScale(cs * u);
      this.qaTargets.set('hud-timed-chest', { x: cx, y: top + ch / 2, w: cw, h: ch, visible: this.hud.alpha > 0.5 });
      this.qaTargets.set('hud-progress-chest', { x: cx, y: top + ch * 1.5 + 4 * u, w: cw, h: ch, visible: this.hud.alpha > 0.5 });
    }
    this.badges.layoutTo(l);

    // QA geometry of HUD blocks (read-only, used by layout tests)
    const pillsW = (l.compact ? this.coinsPill.width * 2 + 14 : this.coinsPill.width) * u;
    const pillsH = (l.compact ? UI.pillH : UI.pillH * 2 + 10) * u;
    this.qaTargets.set('hud-pills', { x: m + 6 * u + pillsW / 2 - 10 * u, y: m + pillsH / 2, w: pillsW + 10 * u, h: pillsH });
    const stripW = (UI.tileGap * 2 + UI.tileSmall) * u;
    this.qaTargets.set('hud-strip', { x: W / 2, y: (l.stripY + l.progressY) / 2 + 6 * u, w: stripW, h: l.progressY - l.stripY + (UI.tile / 2 + UI.progressH / 2) * u });
    {
      const [x0, y0, x1, y1] = this.stack.bounds;
      const a = this.stack.toWorld({ x: x0, y: y0 });
      const b = this.stack.toWorld({ x: x1, y: y1 });
      this.qaTargets.set('object', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: b.x - a.x, h: b.y - a.y });
    }

    this.buildFx(this.objFit.scale / 0.4);

    this.result?.layout(l);
    this.chestOffer?.layout(l);
    this.pauseModal?.layout(l);
    this.settingsModal?.layout(l);
    if (this.hint.visible) this.showHint();
  }

  // ---- camera framing --------------------------------------------------------------------
  // Each stage frames the whole object or a focus area (chair seat close-up). The reach below the
  // framed area covers the farthest finger position of the stages that share the same framing.
  fitTarget(stage) {
    const obj = this.level.object;
    const key = stage?.focus ?? 'default';
    const bounds = stage?.focus ? obj.focus[stage.focus] : obj.radius ?? this.stack.bounds;
    let reach = this.level.fitReach ?? 0;
    if (!this.level.fitReach) {
      for (const st of this.level.stages) {
        if ((st.focus ?? 'default') !== key) continue;
        const t = getTool(st.tool);
        // finger distance below the work point: offset + vertical part of the jet
        const g = t.scaleOffset ? st.toolScale ?? 1 : 1;
        const jy = t.kind === 'jet' ? Math.sin(((t.jetAngle ?? -90) * Math.PI) / 180) * t.jetLength : 0;
        reach = Math.max(reach, t.kind === 'jet' ? -(t.workOffset.y + jy) * g : t.kind === 'target' ? 0 : 170);
      }
    }
    return { key, bounds, reach };
  }

  applyFit(animated) {
    const l = this.layout;
    if (!l) return;
    const t = this.fitTarget(this.stage ?? this.level.stages[0]);
    // Soccer Ball keeps its approved framing; other objects may fill up to 78 % of the play height
    // (Step 6: the chair and the rug were framed too small), the reach constraint still keeps
    // room below for the finger / jet tools.
    const share = this.level.fitReach ? null : 0.78;
    const fit = fitObject(l, t.bounds, { reach: t.reach, canvasSize: this.level.object.canvasSize, share });
    const changed = this.fitKey !== null && this.fitKey !== t.key;
    this.fitKey = t.key;
    this.objFit = fit;
    if (animated && changed) {
      const from = { cx: this.stack.center.x, cy: this.stack.center.y, scale: this.stack.scale };
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 650,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          const k = tw.getValue();
          this.stack.setLayout(from.cx + (fit.cx - from.cx) * k, from.cy + (fit.cy - from.cy) * k, from.scale + (fit.scale - from.scale) * k);
        },
      });
    } else {
      this.stack.setLayout(fit.cx, fit.cy, fit.scale);
    }
    this.tools.setLayout({ scale: fit.scale, restX: fit.restX, restY: fit.restY });
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
    this.mechanic?.dispose();
    this.mechanic = createMechanic(this.stage, { stack: this.stack, tool: this.tool, scene: this });
    this.lastContacts = 0;
    this.family = gestureFamily(this.stage, this.tool);
    this.applyFit(i > 0);
    this.tools.toolScale = this.stage.toolScale ?? 1;
    this.tools.setTool(this.tool, { animate: i > 0 });
    this.tools.sprayRadius = this.stage.params?.radius ?? 100;
    // Dashed green outline only where the active part would otherwise be unclear (stage
    // `outline: true`: trophy ball / base, chair seat close-ups, sanding spots). Whole-object or
    // obvious targets (whole chair, black scuff marks) rely on the hand hint instead.
    const region = this.stage.region;
    if (region && this.stage.outline === 'circles') this.stack.showCircleTargets(region);
    else if (region && this.stage.outline) this.stack.showRegionOutline(region);
    else this.stack.hideRegionOutline();
    this.idleMs = 0;
    this.hint.hide();
    // First time this gesture is introduced: demonstrate it (the hint never changes progress).
    // `?hints=always` (QA / review) shows the first-time hint on every stage
    const always = typeof location !== 'undefined' && new URLSearchParams(location.search).get('hints') === 'always';
    if (always || !this.services.save.get('tutorial')?.[this.family]) {
      this.time.delayedCall(i > 0 ? 750 : 450, () => {
        if (this.alive && this.state === 'playing' && this.activePointerId === null) this.showHint();
      });
    }
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
    this.hint.hide();
    this.idleMs = 0;
    const w = this.toWorld(pointer);
    if (this.tool.kind === 'target') {
      // Drag-to-target: grab an item under the finger; empty space does nothing.
      if (this.mechanic.grab(w)) this.activePointerId = pointer.id;
      return;
    }
    this.activePointerId = pointer.id;
    this.tools.press(w);
    this.lastWork = this.tools.workPointFor(w);
    if (this.tool.kind === 'contact') this.mechanic.tap(this.lastWork);
  }

  onPointerMove(pointer) {
    if (pointer.id !== this.activePointerId) return;
    // Stage done but the finger is still down: the tool keeps following it (no effect any more).
    if (this.state === 'pendingRelease') {
      if (this.tool.kind !== 'target') this.tools.move(this.toWorld(pointer));
      return;
    }
    if (!this.canInteract()) {
      this.endStroke();
      return;
    }
    const w = this.toWorld(pointer);
    if (this.tool.kind === 'target') {
      this.mechanic.drag(w);
      return;
    }
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
    if (this.tool?.kind === 'target') this.mechanic.release();
    else this.tools.release();
    // pending completion: the player let go → now play the completion feedback and move on
    if (this.state === 'pendingRelease') this.afterRelease();
  }

  // ---- hints -----------------------------------------------------------------------------
  // Area gesture path (object-local) built from the work that is actually left inside the active
  // area: strokes run across the short side of that area (a wide rug → up/down strokes, a tall
  // chair frame → left/right strokes; a squeegee blade always sweeps up/down), stepping along the
  // long side, every point snapped to a remaining-work point so the hand never leaves the target.
  areaHintPath() {
    const st = this.stack;
    const m = this.mechanic;
    let pts;
    let cell;
    if (this.family === 'chisel') {
      pts = [...st.chunks.values()].filter((c) => !c.detaching).map((c) => ({ x: c.img.x + st.size / 2, y: c.img.y + st.size / 2 }));
      cell = 60;
    } else {
      pts = m.grid?.uncoveredCentres() ?? [];
      cell = m.grid?.cellSize ?? 21;
    }
    if (!pts.length) return [];
    // lookup of remaining-work cells, so a stroke can be split into continuous runs
    const key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    const work = new Set(pts.map((p) => key(p.x, p.y)));
    // chisel: a point is work only where a remaining crust chunk lies under it (the line between
    // chunk centres may cross background, e.g. above the sneaker laces — Step 6 pass 2)
    const near = this.family === 'chisel' && m.map
      ? (x, y) => {
          const id = m.map.labelAt(x, y);
          return id >= 0 && !m.removed[id];
        }
      : (x, y) => work.has(key(x, y));
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of pts) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    const w = x1 - x0;
    const h = y1 - y0;
    // longest continuous run of remaining work along one line
    const run = (vertical, at) => {
      const lo = vertical ? y0 : x0;
      const hi = vertical ? y1 : x1;
      const step = cell * 0.5;
      let best = null;
      let cur = null;
      for (let v = lo; v <= hi + 0.1; v += step) {
        const q = vertical ? { x: at, y: v } : { x: v, y: at };
        if (near(q.x, q.y)) {
          if (!cur) cur = { a: q, b: q, len: 0 };
          cur.b = q;
          cur.len += step;
          if (!best || cur.len > best.len) best = { ...cur };
        } else cur = null;
      }
      return best;
    };
    const strokes = (vertical) => {
      const out = [];
      for (let i = 0; i < 3; i++) {
        const t = 0.2 + 0.3 * i;
        // try a few nearby lines and keep the longest run (e.g. along a chair post)
        let best = null;
        for (const d of [0, -0.08, 0.08, -0.16, 0.16]) {
          const at = vertical ? x0 + w * Math.min(1, Math.max(0, t + d)) : y0 + h * Math.min(1, Math.max(0, t + d));
          const r = run(vertical, at);
          if (r && (!best || r.len > best.len)) best = r;
        }
        if (best) out.push(best);
      }
      return out;
    };
    // stroke direction: across the short side of the work (wide rug → up/down); a wide blade
    // (squeegee) always sweeps up/down; if those strokes are broken into short pieces (slats,
    // legs) use the other direction
    let vertical = (this.stage.params?.aspect ?? 1) > 1.5 || w > h * 1.15;
    let list = strokes(vertical);
    const extent = vertical ? h : w;
    const avg = list.reduce((a, r) => a + r.len, 0) / Math.max(1, list.length);
    if ((this.stage.params?.aspect ?? 1) <= 1.5 && avg < extent * 0.35) {
      const other = strokes(!vertical);
      const avg2 = other.reduce((a, r) => a + r.len, 0) / Math.max(1, other.length);
      if (avg2 > avg) {
        list = other;
        vertical = !vertical;
      }
    }
    // separate strokes: the hand lifts between them (never slides across empty background)
    return list.map((r, i) => (i % 2 === 0 ? [r.a, r.b] : [r.b, r.a]));
  }

  showHint() {
    const st = this.stack;
    const k = st.scale;
    const tool = this.tool;
    const m = this.mechanic;
    if (!m) return;
    const finger = (local) => {
      const w = st.toWorld(local);
      if (tool.kind === 'jet') {
        const o = this.tools.offset();
        const v = this.tools.jetVector();
        return { x: w.x - v.x - o.x, y: w.y - v.y - o.y };
      }
      // contact tools: the hand rubs over the target area itself (the tool head follows just
      // above the finger), so the demonstration never leaves the active area
      return w;
    };
    let path;
    if (this.family === 'drag-item') {
      const a = m.nextItemLocal();
      if (!a) return;
      path = [finger(a), finger(m.targetLocal())];
    } else if (this.family === 'spot') {
      const sp = m.nextSpotLocal();
      if (!sp) return;
      path = [];
      // empty knife: dip into the tub first (small circles in the opening), then go to the dent
      if (m.needsLoad?.()) {
        const t = m.tubOpening();
        for (let i = 0; i <= 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          path.push(finger({ x: t.x + Math.cos(a) * t.r * 0.45, y: t.y + Math.sin(a) * t.r * 0.3 }));
        }
      }
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        path.push(finger({ x: sp.x + Math.cos(a) * sp.r * 0.6, y: sp.y + Math.sin(a) * sp.r * 0.6 }));
      }
    } else {
      const strokes = this.areaHintPath().map((st2) => st2.map(finger));
      if (!strokes.length) return;
      this.hint.showStrokes(strokes);
      return;
    }
    this.hint.show(path, { press: true, drag: this.family === 'drag-item' });
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
    // Inactivity hint: no valid action for 5 s while playing (paused time does not count).
    if (this.mechanic.validContacts !== this.lastContacts) {
      this.lastContacts = this.mechanic.validContacts;
      this.idleMs = 0;
    }
    if (this.canInteract() && this.activePointerId === null && !this.hint.visible && !this.settingsModal) {
      this.idleMs += delta;
      if (this.idleMs > 5000) this.showHint();
    }
    if (this.activePointerId !== null && this.tool.kind === 'jet' && this.canInteract() && this.tools.pointerWorld) {
      const nozzle = this.tools.workPointFor(this.tools.pointerWorld);
      const impact = this.tools.impactFor(nozzle);
      const before = this.mechanic.validContacts;
      this.mechanic.spray(impact, Math.min(delta, 50) / 1000);
      if (this.mechanic.validContacts > before && Math.random() < 0.5) {
        (this.tool.jetStyle === 'foam' ? this.fx.foam : this.fx.mist).emitParticleAt(impact.x, impact.y, 1);
      }
    }
    if (this.state === 'playing') {
      this.progressBar.set(this.mechanic.progress);
      this.stack.updateRegionOutline(this.mechanic.grid);
    }
    if (this.mechanic.completed) this.completeStage();
  }

  // Stage lifecycle (Step 6): ACTIVE → work done (manual 100 % or gentle auto-complete) →
  // the remaining fragments fade out and the bar runs smoothly to 100 % → PENDING_RELEASE while
  // the finger / mouse is still down (the tool stays in the hand, no effect) → release →
  // completion feedback → next stage. The tool is never taken away mid-stroke.
  completeStage() {
    if (this.state !== 'playing') return;
    this.state = 'pendingRelease';
    this.tools.inert = true; // the tool stays in the hand but no longer sprays / works
    const stage = this.stage;
    this.stageLog.push({ id: stage.id, seconds: (this.time.now - this.stageStartedAt) / 1000, contacts: this.mechanic.validContacts, autoCompleted: (this.mechanic.grid?.progress ?? 1) < 0.999 });
    this.hint.hide();
    this.stack.hideRegionOutline();
    const from = this.progressBar.value;
    this.tweens.addCounter({ from, to: 1, duration: 450, ease: 'Sine.easeOut', onUpdate: (tw) => this.progressBar.set(tw.getValue()) });
    this.finishing = this.mechanic.finish(500);
    if (this.activePointerId === null) this.afterRelease();
  }

  async afterRelease() {
    if (this.state !== 'pendingRelease') return;
    this.state = 'transition';
    const s = this.services;
    await this.finishing;
    if (!this.alive) return;
    this.progressBar.set(1);
    this.strip.markDone();
    s.audio.play('stage-complete');
    if (s.save.get('settings.vibration')) s.platform.vibrate?.(30);
    if (!s.save.get('tutorial')?.[this.family]) s.save.update((st) => (st.tutorial[this.family] = true)).catch(() => {});
    await this.wait(600);
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
    const rw = this.services.rewards;
    const max = rw.config.progressChest.steps;
    this.result = new ResultCard(this, {
      reward: this.reward,
      picture: this.level.resultPicture,
      x3: rw.x3Offer(this.reward.completionId),
      chest: { from: this.reward.chestStepsBefore / max },
      onX3: () => this.claimX3(),
      onOpenChest: () => this.openChestOffer(),
      onHome: () => this.goMenu(),
      onReplay: () => this.replay(),
      onNext: next ? () => this.goLevel(next) : null,
    });
    // Level chest: the bar runs +20 % for this completion; a full chest is offered right away
    // (and stays offered from the bar if the player chooses "Later").
    const card = this.result;
    const full = rw.progressChestState().full;
    card.chestRow.animate(this.reward.chestStepsBefore / max, this.reward.chestStepsAfter / max, { ready: full, delay: 1150 }).then(() => {
      if (!this.alive || this.result !== card) return;
      card.setChestReady(full);
      if (full) this.time.delayedCall(450, () => this.result === card && this.openChestOffer());
    });
    // Coins fly into the counter; the counter catches up to the already-saved value.
    this.hud.setAlpha(1).setDepth(700);
    [this.strip.container, this.progressBar.container, this.pauseButton.container].forEach((c) => c.setVisible(false));
    const from = this.result.rewardIconWorld();
    const to = this.coinsPill.iconWorld();
    const { coinsBefore, coinsAfter } = this.reward;
    this.coinsPill.setValue(coinsBefore);
    // Each coin starts at the size of the card's reward coin, follows a gentle arc and shrinks
    // to exactly the counter icon's size, so it lands "into" the icon (never larger than it).
    const n = 5;
    const fromSize = this.result.rewardIconWorldSize();
    const toSize = this.coinsPill.iconWorldSize();
    const startSize = Math.min(fromSize, toSize * 1.1);
    for (let i = 0; i < n; i++) {
      const coin = this.add.image(from.x, from.y, 'icon-coin').setDepth(800).setAlpha(0);
      const base = 1 / Math.max(coin.width, coin.height);
      coin.setScale(startSize * base);
      const side = i % 2 === 0 ? 1 : -1;
      const ctrl = { x: (from.x + to.x) / 2 + side * (0.06 + 0.03 * i) * this.layout.W, y: Math.min(from.y, to.y) + (from.y - to.y) * 0.25 };
      const path = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2(ctrl.x, ctrl.y), new Phaser.Math.Vector2(to.x, to.y));
      const pos = new Phaser.Math.Vector2();
      this.tweens.addCounter({
        from: 0,
        to: 1,
        delay: 450 + i * 110,
        duration: 650,
        ease: 'Sine.easeIn',
        onStart: () => coin.setAlpha(1),
        onUpdate: (tw) => {
          const k = tw.getValue();
          path.getPoint(k, pos);
          coin.setPosition(pos.x, pos.y);
          coin.setScale((startSize + (toSize * 0.9 - startSize) * k) * base);
        },
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

  // ---- rewards on the result card ---------------------------------------------------------
  // x3: rewarded ad → RewardService adds 2 × the base reward (once). Navigation is blocked while
  // the ad runs; a cancelled / failed ad grants nothing and the offer stays.
  async claimX3() {
    const card = this.result;
    if (!card || card.x3State !== 'idle' || this.chestOffer) return;
    this.services.audio.play('ui-tap');
    card.setEnabled(false);
    card.setX3State('busy');
    const r = await this.services.rewards.claimX3(this.reward.completionId);
    if (!this.alive || this.result !== card) return;
    card.setEnabled(true);
    if (r.status !== 'granted') {
      card.setX3State('idle');
      card.flashX3(r.status === 'not-earned' ? 'Ad closed early' : 'Ad not available');
      return;
    }
    card.setX3State('granted');
    card.setRewardAmount(r.total);
    this.flyToPill(this.coinsPill, 'icon-coin', worldOf(card.x3.container), r.coinsBefore, r.coinsAfter, 5);
  }

  // Coins / diamonds fly into a HUD counter, which catches up to the already-saved value.
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
      onEach: (i) => {
        pill.setValue(i === n - 1 ? after : before + Math.round(((after - before) * (i + 1)) / n));
        pill.pulse();
        if (i === n - 1) this.services.audio.play('coins');
      },
    });
  }

  openChestOffer() {
    const card = this.result;
    if (!card || this.chestOffer || !this.services.rewards.progressChestState().full) return;
    card.setEnabled(false);
    // one card at a time: the result card steps back while the chest offer is shown
    this.tweens.add({ targets: card.card, alpha: 0, duration: 160 });
    this.chestOffer = new ChestOfferModal(this, {
      rewards: this.services.rewards,
      onLater: () => this.closeChestOffer(),
      onOpened: (r, from) => {
        this.flyToPill(this.coinsPill, 'icon-coin', from, r.coinsBefore, r.coinsAfter, 7);
        this.flyToPill(this.diamondsPill, 'icon-diamond', from, r.diamondsBefore, r.diamondsAfter, 3, 150);
        this.time.delayedCall(1500, () => {
          if (this.result !== card) return;
          this.closeChestOffer();
          card.setChestReady(false);
          card.chestRow.set(0);
        });
      },
    });
  }

  closeChestOffer() {
    this.chestOffer?.destroy();
    this.chestOffer = null;
    if (this.result) {
      this.tweens.add({ targets: this.result.card, alpha: 1, duration: 180 });
      this.result.setEnabled(true);
    }
  }

  // ---- pause -----------------------------------------------------------------------------
  openPause() {
    if (this.state === 'result' || this.state === 'completing' || this.pauseModal) return;
    this.services.audio.play('ui-tap');
    this.services.pause.set('user', true);
    this.hint.hide();
    this.pauseModal = new PauseModal(this, {
      onResume: () => this.closePause(),
      onRestart: () => this.replay(),
      onMenu: () => this.goMenu(),
      onSettings: () => this.openSettings(),
    });
  }

  openSettings() {
    if (this.settingsModal) return;
    this.pauseModal?.setEnabled(false);
    this.settingsModal = new SettingsModal(this, {
      save: this.services.save,
      depth: 700,
      onClose: () => {
        this.settingsModal.destroy();
        this.settingsModal = null;
        this.pauseModal?.setEnabled(true);
      },
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
    this.mechanic = null;
    this.hint.destroy();
    this.settingsModal?.destroy();
    this.hudTimedChest?.destroy();
    this.hudProgressChest?.destroy();
    this.chestOffer?.destroy();
    this.chestOffer = null;
    this.settingsModal = null;
    this.tools.destroy();
    this.stack.destroy();
  }
}
