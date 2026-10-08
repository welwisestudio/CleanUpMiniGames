import Phaser from 'phaser';
import { getLevel, nextLevelId } from '../content/catalog.js';
import { getTool } from '../content/tools.js';
import { FX_CHUNKS, levelAssets, lazyAssetKeys } from '../content/assets.js';
import { createMechanic, gestureFamily } from '../mechanics/index.js';
import { HintController } from './level/HintController.js';
import { ObjectStack } from './level/ObjectStack.js';
import { ToolController } from './level/ToolController.js';
import { attachResponsiveLayout, coverImage, fitObject, refreshTextResolution, UI } from '../ui/layout.js';
import { CurrencyPill, ToolStrip, ProgressBar, addStatusBadges } from '../ui/hud.js';
import { Button } from '../ui/Button.js';
import { ResultCard, PauseModal, SettingsModal } from '../ui/modals.js';
import { ChestOfferModal, TimedChestWidget, ProgressChestMini, TIMED_CHEST_SIZE, flyIcons, worldOf } from '../ui/rewards.js';
import { ToolSelector } from '../ui/toolSelector.js';
import { familyOption, TOOL_FAMILIES } from '../content/toolFamilies.js';
import { TOOL_SKINS } from '../content/toolSkins.js';
import { SkinModal } from '../ui/skinModal.js';
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

  // Step 8: level-specific art (levels 6+) is loaded when the level opens, not at boot; art of
  // other lazily loaded levels is released so memory stays flat while playing through the list.
  preload() {
    const own = levelAssets(this.levelId);
    const need = Object.entries(own).filter(([k]) => !this.textures.exists(k));
    for (const k of lazyAssetKeys()) if (!(k in own) && this.textures.exists(k)) this.textures.remove(k);
    if (!need.length) return;
    const pause = this.registry.get('services').pause;
    pause.set('assetsLoading', true);
    const { width: w, height: h } = this.scale;
    this.loadingBg = this.add.rectangle(0, 0, w, h, 0xfdf3ec).setOrigin(0);
    this.loadingBar = this.add.graphics();
    this.load.on('progress', (v) => {
      const bw = Math.min(w * 0.6, 520);
      this.loadingBar.clear().fillStyle(0x0d233e, 0.2).fillRoundedRect(w / 2 - bw / 2, h / 2, bw, 20, 10).fillStyle(0x31b6f5, 1).fillRoundedRect(w / 2 - bw / 2, h / 2, Math.max(20, bw * v), 20, 10);
    });
    this.load.once('complete', () => {
      this.load.off('progress');
      pause.set('assetsLoading', false);
    });
    for (const [k, url] of need) this.load.image(k, url);
  }

  create() {
    this.loadingBg?.destroy();
    this.loadingBar?.destroy();
    this.loadingBg = this.loadingBar = null;
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
    this.strip = new ToolStrip(this, { stages: this.level.stages, getTool: (id, st) => (st ? this.toolFor(st) : getTool(id)) });
    // Step 7: alternative-tool cards (only levels with tool families)
    this.hasFamilies = this.level.stages.some((st) => st.family);
    this.selector = this.hasFamilies ? new ToolSelector(this, { onTap: (id) => this.onToolCard(id), onSkin: () => this.openSkins() }) : null;
    this.selector?.container.setVisible(false);
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
    // tool cards: bottom row on portrait screens, right column on landscape / desktop
    if (this.selector) {
      const vertical = this.selectorVertical(l);
      const ext = ToolSelector.extent(vertical);
      if (vertical) this.selector.place(W - m - (ext.w / 2) * u, (l.hudBottom + H) / 2, u, true);
      else this.selector.place(W / 2, H - m - 22 * u - (ext.h / 2) * u, u, false);
    }

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
    this.skinModal?.layout(l);
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
    // finger room below the framed area: object units (tool offsets) + screen px (screen-scale jets)
    let reach = this.level.fitReach ?? 0;
    let jetReach = 0;
    let jetPx = 0;
    const u = this.layout?.u ?? 1;
    for (const st of this.level.stages) {
      if ((st.focus ?? 'default') !== key) continue;
      const t = getTool(st.tool);
      const g = t.scaleOffset ? st.toolScale ?? 1 : 1;
      if (t.kind === 'jet' && t.jetUi) {
        jetReach = Math.max(jetReach, -t.workOffset.y * g);
        jetPx = Math.max(jetPx, t.jetUi * u);
      } else if (!this.level.fitReach) {
        const jy = t.kind === 'jet' ? Math.sin(((t.jetAngle ?? -90) * Math.PI) / 180) * t.jetLength : 0;
        reach = Math.max(reach, t.kind === 'jet' ? -(t.workOffset.y + jy) * g : t.kind === 'target' ? 0 : 170);
      }
    }
    return { key, bounds, reach, jetReach, jetPx };
  }

  applyFit(animated) {
    const l = this.layout;
    if (!l) return;
    const t = this.fitTarget(this.stage ?? this.level.stages[0]);
    // Soccer Ball keeps its approved framing; other objects may fill up to 78 % of the play height
    // (Step 6: the chair and the rug were framed too small), the reach constraint still keeps
    // room below for the finger / jet tools.
    const share = 0.78; // same height share for every object (Soccer Ball included since the Step 6 UI pass)
    const fit = fitObject(l, t.bounds, { reach: t.reach, jetReach: t.jetReach, jetPx: t.jetPx, canvasSize: this.level.object.canvasSize, share, bottomReserve: this.selectorReserve(l) });
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
    this.tools.setLayout({ scale: fit.scale, restX: fit.restX, restY: fit.restY, ui: l.u, jetCap: fit.jetCap });
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
      // Step 8 power-tool effects (tool.fx): grinder / wire-wheel sparks, polish shine, sawdust
      sparks: mk('fx-dot', { speed: { min: 260 * k, max: 720 * k }, angle: { min: 200, max: 340 }, gravityY: 1600 * k, lifespan: { min: 220, max: 420 }, scale: { start: 0.55 * k, end: 0.08 * k }, tint: [0xfff3b0, 0xffd166, 0xff9f1c], blendMode: 'ADD' }),
      shine: mk('fx-sparkle', { speed: { min: 10 * k, max: 50 * k }, lifespan: 520, scale: { start: 0.05 * k, end: 0.16 * k }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 90 } }),
      sawdust: mk('fx-dot', { speed: { min: 40 * k, max: 180 * k }, gravityY: 500 * k, lifespan: 600, scale: { start: 0.9 * k, end: 0.3 * k }, alpha: { start: 0.85, end: 0 }, tint: 0xe9d3a6 }),
      impact: mk('fx-dot', { speed: { min: 80 * k, max: 260 * k }, lifespan: 380, scale: { start: 1.2 * k, end: 0.2 * k }, alpha: { start: 0.9, end: 0 }, tint: 0xd8d2c8 }),
      smoke: mk('fx-dot', { speed: { min: 20 * k, max: 70 * k }, angle: { min: 240, max: 300 }, lifespan: 700, scale: { start: 0.8 * k, end: 2.6 * k }, alpha: { start: 0.45, end: 0 }, tint: 0x6b6b6b }),
      steam: mk('fx-dot', { speed: { min: 30 * k, max: 120 * k }, angle: { min: 230, max: 310 }, lifespan: 800, scale: { start: 1.2 * k, end: 3.6 * k }, alpha: { start: 0.5, end: 0 } }),
    };
  }

  // ---- stages ----------------------------------------------------------------------------
  // ---- alternative tools (Step 7) ---------------------------------------------------------
  // The stage's tool: the equipped option of its family, else the stage tool.
  toolFor(stage) {
    return this.skinned(getTool(stage.family ? this.services.toolShop.equipped(stage.family) : stage.tool), stage.family);
  }

  // Step 8 cosmetic skins: the family's BASE tool is drawn with the equipped skin texture; nothing
  // else of the tool (working point, offsets, footprint) changes.
  skinned(tool, familyId) {
    if (!familyId || !TOOL_SKINS[familyId] || TOOL_FAMILIES[familyId]?.base !== tool.id) return tool;
    const tex = this.services.skins.textureFor(familyId);
    return tex ? { ...tool, texture: tex } : tool;
  }

  openSkins() {
    const fam = this.stage?.family;
    if (!fam || !TOOL_SKINS[fam] || this.skinModal || !this.canInteract() || this.activePointerId !== null) return;
    this.services.audio.play('ui-tap');
    this.hint.hide();
    this.services.pause.set('skinMenu', true);
    const skins = this.services.skins;
    const m = new SkinModal(this, { skins, familyId: fam, onClose: () => this.closeSkins() });
    m.onTap = async (id) => {
      const o = skins.options(fam).find((x) => x.id === id);
      if (!o || o.busy) return;
      this.services.audio.play('ui-tap');
      let r;
      if (o.owned) r = skins.equip(fam, id);
      else if (o.unlock.type === 'coins' || o.unlock.type === 'diamonds') {
        r = skins.purchase(fam, id);
        if (r.status === 'insufficient') {
          m.shake(id);
          m.toast(`Not enough ${r.currency}`);
          return;
        }
        if (r.status === 'purchased') (r.currency === 'coins' ? this.coinsPill : this.diamondsPill).setValue(r.after);
      } else {
        m.setEnabled(false);
        m.refresh();
        r = await skins.unlockWithAd(fam, id);
        if (!this.alive || this.skinModal !== m) return;
        m.setEnabled(true);
        if (r.status !== 'unlocked' && r.status !== 'equipped') m.toast(r.status === 'not-earned' ? 'Ad closed early' : 'Ad not available');
        else m.clearToast(); // an older failure message must not linger after the unlock
      }
      m.refresh();
      const eq = this.services.toolShop.equipped(fam);
      if (TOOL_FAMILIES[fam]?.base === eq) this.applyTool(eq);
    };
    this.skinModal = m;
  }

  closeSkins() {
    this.skinModal?.destroy();
    this.skinModal = null;
    this.services.pause.set('skinMenu', false);
    this.refreshSelector();
  }

  toolMods(stage, toolId) {
    const o = stage.family ? familyOption(stage.family, toolId) : null;
    return { radius: o?.radius ?? 1, toolScale: o?.toolScale ?? 1, work: o?.work ?? 1 };
  }

  // Phones (shorter side < 600 CSS px, any orientation): bottom row, as in the reference. Large
  // landscape screens (desktop, landscape tablet): a right-hand column beside the object.
  selectorVertical(l) {
    const phone = Math.min(l.cssW, l.cssH) < 600;
    return !phone && l.W / l.H > 1.05;
  }

  // Height kept free at the bottom for the card row (portrait; landscape uses a side column).
  selectorReserve(l) {
    if (!this.selector || this.selectorVertical(l)) return 0;
    return (ToolSelector.extent(false).h + 6) * l.u;
  }

  refreshSelector(rebuild = false) {
    if (!this.selector) return;
    const fam = this.stage?.family;
    if (!fam || this.state !== 'playing') {
      if (this.selector.container.visible) this.selector.hide();
      return;
    }
    const shop = this.services.toolShop;
    const skinTex = this.services.skins.textureFor(fam);
    const opts = shop.options(fam).map((o) => ({
      ...o,
      affordable: shop.canAfford(o),
      busy: o.busy || (this.cardBusy && this.cardBusy === o.tool),
      // the base tool card shows the equipped skin; its equipped card gets the skin button
      texture: o.tool === TOOL_FAMILIES[fam].base ? skinTex : null,
      skinnable: Boolean(TOOL_SKINS[fam]) && o.tool === TOOL_FAMILIES[fam].base && o.equipped,
    }));
    if (rebuild || this.selector.familyId !== fam || !this.selector.container.visible) this.selector.setOptions(fam, opts);
    else this.selector.update(opts);
  }

  async onToolCard(toolId) {
    const fam = this.stage?.family;
    if (!fam || this.state !== 'playing' || !this.canInteract() || this.cardBusy || this.activePointerId !== null) return;
    const shop = this.services.toolShop;
    const opt = shop.options(fam).find((o) => o.tool === toolId);
    if (!opt) return;
    if (opt.equipped) {
      this.selector.pop(toolId);
      return;
    }
    this.services.audio.play('ui-tap');
    if (opt.owned) {
      if (shop.equip(fam, toolId).status === 'equipped') this.applyTool(toolId);
      return;
    }
    if (opt.unlock.type === 'coins' || opt.unlock.type === 'diamonds') {
      const r = shop.purchase(fam, toolId);
      if (r.status === 'insufficient') {
        this.selector.shake(toolId);
        this.selector.toast(`Not enough ${r.currency}`);
        return;
      }
      if (r.status === 'purchased') {
        (r.currency === 'coins' ? this.coinsPill : this.diamondsPill).setValue(r.after);
        (r.currency === 'coins' ? this.coinsPill : this.diamondsPill).pulse();
      }
      if (r.status === 'purchased' || r.status === 'equipped') {
        this.applyTool(toolId);
        this.selector.pop(toolId);
      }
      return;
    }
    // rewarded ad: unlock permanently + equip on a watched ad; anything else changes nothing
    const idx = this.stageIndex;
    this.cardBusy = toolId;
    this.refreshSelector();
    const r = await shop.unlockWithAd(fam, toolId);
    this.cardBusy = null;
    if (!this.alive) return;
    if (r.status === 'unlocked' || r.status === 'equipped') {
      if (this.stageIndex === idx && this.state === 'playing') {
        this.applyTool(toolId);
        this.selector.pop(toolId);
      }
    } else {
      this.refreshSelector();
      this.selector?.toast(r.status === 'not-earned' ? 'Ad closed early' : 'Ad not available');
    }
  }

  // Mid-stage switch: same job, same progress; only the active tool (sprite, footprint) changes.
  applyTool(toolId) {
    this.endStroke();
    this.selector?.clearToast(); // an older "Ad closed early" must not linger after success
    const tool = this.skinned(getTool(toolId), this.stage.family);
    const mods = this.toolMods(this.stage, toolId);
    this.tool = tool;
    this.tools.toolScale = (this.stage.toolScale ?? 1) * mods.toolScale;
    this.tools.setTool(tool, { animate: true });
    const r = (this.stage.params?.radius ?? 100) * mods.radius;
    this.tools.sprayRadius = r;
    this.mechanic.setTool?.(tool, r, mods);
    this.strip.setIndex(this.stageIndex);
    this.hint.hide();
    this.idleMs = 0;
    this.refreshSelector();
    refreshTextResolution(this);
  }

  startStage(i) {
    this.stageIndex = i;
    this.stage = this.level.stages[i];
    this.tool = this.toolFor(this.stage);
    const mods = this.toolMods(this.stage, this.tool.id);
    this.mechanic?.dispose();
    this.mechanic = createMechanic(this.stage, { stack: this.stack, tool: this.tool, scene: this, radiusMul: mods.radius });
    if (this.stage.mechanic === 'points') this.mechanic.setTool(this.tool, 0, mods);
    this.lastContacts = 0;
    this.family = gestureFamily(this.stage, this.tool);
    this.applyFit(i > 0);
    this.tools.toolScale = (this.stage.toolScale ?? 1) * mods.toolScale;
    this.tools.setTool(this.tool, { animate: i > 0 });
    this.tools.sprayRadius = (this.stage.params?.radius ?? 100) * mods.radius;
    this.tools.paintTint = this.stage.params?.paintTint; // spray-gun paint colour (Step 8)
    // Step 8 large objects: dim the zones this stage does not work on
    if (this.stage.dim && this.stage.region) this.stack.showZoneDim(this.stage.region);
    else this.stack.hideZoneDim();
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
    this.refreshSelector(true); // tool cards for this stage's family (hidden otherwise)
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
    if (this.tool.kind === 'contact') {
      if (this.mechanic.mode === 'tap' && this.stage.mechanic === 'points') this.tools.strike();
      this.mechanic.tap(this.lastWork);
    }
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
    } else if (this.family.startsWith('point-')) {
      // point targets: press (and hold) on the next target
      const t = m.nextTargetLocal();
      if (!t) return;
      const p = finger(t);
      const up = { x: p.x, y: p.y - 30 * this.layout.u };
      path = this.family === 'point-tap' ? [p, up, p, up, p] : [p, { x: p.x + 2, y: p.y }];
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
      // a tool that needs paint first: dip into the source, then paint (Step 8)
      if (m.needsLoad?.()) {
        const t = m.sourceOpening();
        const dip = [];
        for (let i = 0; i <= 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          dip.push(finger({ x: t.x + Math.cos(a) * t.r * 0.5, y: t.y + Math.sin(a) * t.r * 0.3 }));
        }
        strokes.unshift(dip);
      }
      this.hint.showStrokes(strokes);
      return;
    }
    this.hint.show(path, { press: true, drag: this.family === 'drag-item' });
  }

  emitContactFx(p) {
    const id = this.stage.id;
    const fx = this.stage.fx ?? this.tool.fx; // Step 8: stage override (scraper chips, sanding dust)
    if (id === 'chisel' && Math.random() < 0.35) {
      this.fx.chips.setTexture(FX_CHUNKS[Math.floor(Math.random() * FX_CHUNKS.length)]);
      this.fx.chips.emitParticleAt(p.x, p.y, 1);
    } else if (id === 'dry-brush' && Math.random() < 0.5) this.fx.dust.emitParticleAt(p.x, p.y, 1);
    else if (id === 'scrub' && Math.random() < 0.3) this.fx.foam.emitParticleAt(p.x, p.y, 1);
    else if (fx === 'sparks') this.fx.sparks.emitParticleAt(p.x, p.y, 3);
    else if (fx === 'laser') {
      this.fx.sparks.emitParticleAt(p.x, p.y, 1);
      if (Math.random() < 0.5) this.fx.smoke.emitParticleAt(p.x, p.y, 1);
    } else if (fx === 'steam' && Math.random() < 0.6) this.fx.steam.emitParticleAt(p.x, p.y, 1);
    else if (fx === 'shine' && Math.random() < 0.25) this.fx.shine.emitParticleAt(p.x, p.y, 1);
    else if (fx === 'sawdust' && Math.random() < 0.5) this.fx.sawdust.emitParticleAt(p.x, p.y, 1);
    else if (fx === 'dust' && Math.random() < 0.5) this.fx.dust.emitParticleAt(p.x, p.y, 1);
    else if (fx === 'chips' && Math.random() < 0.35) {
      this.fx.chips.setTexture(FX_CHUNKS[Math.floor(Math.random() * FX_CHUNKS.length)]);
      this.fx.chips.emitParticleAt(p.x, p.y, 1);
    }
  }

  // Hammer blow on a point target (Step 8): a small burst at the hit point.
  emitImpactFx(world) {
    this.fx?.impact.emitParticleAt(world.x, world.y, 6);
    this.services.audio.play('ui-tap');
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
      // a jet on a hold-based stage (the hose filling a basin) works where its water lands
      if (this.mechanic.spray) this.mechanic.spray(impact, Math.min(delta, 50) / 1000);
      else this.mechanic.hold?.(impact, Math.min(delta, 50) / 1000);
      if (this.mechanic.validContacts > before && Math.random() < 0.5) {
        if (['paint', 'air', 'laser', 'steam'].includes(this.tool.jetStyle)) this.emitContactFx(impact);
        else (this.tool.jetStyle === 'foam' ? this.fx.foam : this.fx.mist).emitParticleAt(impact.x, impact.y, 1);
      }
    }
    // Step 8 point targets: holding the tool on a screw / keycap works over time
    if (this.activePointerId !== null && this.tool.kind === 'contact' && this.mechanic.hold && this.canInteract() && this.tools.pointerWorld) {
      this.mechanic.hold(this.tools.workPointFor(this.tools.pointerWorld), Math.min(delta, 50) / 1000);
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
    this.refreshSelector(); // stage done: the tool cards go away
    const stage = this.stage;
    this.stageLog.push({ id: stage.id, seconds: (this.time.now - this.stageStartedAt) / 1000, contacts: this.mechanic.validContacts, autoCompleted: (this.mechanic.grid?.progress ?? 1) < 0.999 });
    this.hint.hide();
    this.stack.hideRegionOutline();
    this.stack.hideZoneDim();
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
      boost: rw.boostOffer(this.reward.completionId),
      chest: { from: this.reward.chestStepsBefore / max },
      onBoost: () => this.claimBoost(),
      onOpenChest: () => this.openChestOffer(),
      onHome: () => this.goMenu(),
      onReplay: () => this.replay(),
      // the last object for now: Next returns to the object list (Step 8, until more batches)
      onNext: next ? () => this.goLevel(next) : () => this.goMenu(),
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
  // Boost: the tap locks the multiplier shown on the meter (x2…x5), then the rewarded ad plays;
  // RewardService adds base × (multiplier − 1) once. Navigation is blocked while the ad runs; a
  // cancelled / failed ad grants nothing and the meter runs again.
  async claimBoost() {
    const card = this.result;
    if (!card || card.boostState !== 'idle' || this.chestOffer) return;
    this.services.audio.play('ui-tap');
    const multiplier = card.lockBoost();
    card.setEnabled(false);
    card.setBoostState('locked');
    await this.wait(550);
    if (!this.alive || this.result !== card) return;
    card.setBoostState('busy');
    const r = await this.services.rewards.claimBoost(this.reward.completionId, multiplier);
    if (!this.alive || this.result !== card) return;
    card.setEnabled(true);
    if (r.status !== 'granted') {
      card.setBoostState('idle');
      card.flashBoost(r.status === 'not-earned' ? 'Ad closed early' : 'Ad not available');
      return;
    }
    card.setBoostState('granted', r.multiplier);
    card.setRewardAmount(r.total);
    this.flyToPill(this.coinsPill, 'icon-coin', worldOf(card.boostBtn.container), r.coinsBefore, r.coinsAfter, 5);
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
      // skipping after the "lost forever" warning forfeits the chest
      onSkip: () => {
        this.services.rewards.forfeitProgressChest();
        this.closeChestOffer();
        card.setChestReady(false);
        card.chestRow.set(0);
      },
      onOpened: (r, from) => {
        this.flyToPill(this.coinsPill, 'icon-coin', from, r.coinsBefore, r.coinsAfter, 7);
        this.flyToPill(this.diamondsPill, 'icon-diamond', from, r.diamondsBefore, r.diamondsAfter, 3, 150);
        this.time.delayedCall(1700, () => {
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
    this.selector?.destroy();
    this.selector = null;
    this.skinModal?.destroy();
    this.skinModal = null;
    this.services.pause.set('skinMenu', false);
    this.chestOffer?.destroy();
    this.chestOffer = null;
    this.settingsModal = null;
    this.tools.destroy();
    this.stack.destroy();
  }
}
