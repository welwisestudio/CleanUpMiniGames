import Phaser from 'phaser';
import { assertPlatform } from '../platform/contract.js';
import { PauseState } from '../core/PauseState.js';
import { SaveService } from '../services/SaveService.js';
import { RewardService } from '../services/RewardService.js';
import { ToolService } from '../services/ToolService.js';
import { ProgressionService } from '../services/ProgressionService.js';
import { StoreService } from '../services/StoreService.js';
import { WheelService } from '../services/WheelService.js';
import { TOOL_FAMILIES, TOOL_AD_PLACEMENT } from '../content/toolFamilies.js';
import { AudioService } from '../services/AudioService.js';
import { economy } from '../content/economy.js';
import { validateCatalog, DISPLAY_ORDER } from '../content/catalog.js';
import { BootScene } from '../scenes/BootScene.js';
import { MenuScene } from '../scenes/MenuScene.js';
import { LevelScene } from '../scenes/LevelScene.js';
import { installQa } from './qa.js';

// Composition root: builds services around the injected platform adapter and starts Phaser.
export function createApp({ platform, parent }) {
  assertPlatform(platform);

  const contentErrors = validateCatalog();
  if (contentErrors.length) throw new Error(`Content errors:\n${contentErrors.join('\n')}`);

  const pause = new PauseState();
  const save = new SaveService(platform);
  const rewards = new RewardService({ save, economy, platform, pause });
  const toolShop = new ToolService({ save, rewards, families: TOOL_FAMILIES, placement: TOOL_AD_PLACEMENT });
  // dev / test only (the dev adapter): every level selectable for QA, never written to the save —
  // `?unlockAll=1`, or automatically for the QA harness (`?qa=1`) unless it tests access (`locks=1`)
  const q = new URLSearchParams(window.location.search);
  const devUnlockAll = Boolean(platform.dev) && (q.get('unlockAll') === '1' || (q.get('qa') === '1' && q.get('locks') !== '1'));
  const progression = new ProgressionService({ save, rewards, order: DISPLAY_ORDER, config: economy.levelAccess, devUnlockAll });
  const store = new StoreService({ save, rewards, platform, config: economy.store, timedChest: economy.rewards.timedChest });
  // dev / test only: `?wheelSeg=N` forces the wheel's chosen segment (QA of each reward)
  const forced = platform.dev && q.get('wheelSeg') != null ? Number(q.get('wheelSeg')) : null;
  const segW = economy.wheel.segments.map((x) => x.weight);
  const forcedRandom = forced != null && segW[forced] != null ? () => (segW.slice(0, forced).reduce((a2, v) => a2 + v, 0) + segW[forced] / 2) / segW.reduce((a2, v) => a2 + v, 0) : undefined;
  const wheel = new WheelService({ save, rewards, toolShop, config: economy.wheel, ...(forcedRandom ? { random: forcedRandom } : {}) });
  const audio = new AudioService({ save, pause });
  let runCounter = 0;

  const services = {
    platform,
    pause,
    save,
    rewards,
    toolShop,
    progression,
    store,
    wheel,
    audio,
    economy,
    build: { number: __BUILD_NUMBER__, time: __BUILD_TIME__ },
    nextRunId: () => ++runCounter,
    ready: null,
    display: { dpr: currentDpr() },
  };
  installQa(services);

  // Responsive canvas at native resolution: the game size is the window size × DPR (≤ 2) and the
  // canvas is displayed at the window size (zoom = 1 / DPR). Input mapping is handled by Phaser.
  const dpr = services.display.dpr;
  const game = new Phaser.Game({
    type: Phaser.WEBGL, // nine-slice UI surfaces require WebGL
    parent,
    backgroundColor: '#FFF7F7',
    scale: { mode: Phaser.Scale.NONE, width: viewW() * dpr, height: viewH() * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, roundPixels: false },
    input: { activePointers: 2 },
    disableContextMenu: true,
    scene: [BootScene, MenuScene, LevelScene],
  });
  game.registry.set('services', services);

  let pending = false;
  const applySize = () => {
    pending = false;
    const d = currentDpr();
    const w = viewW();
    const h = viewH();
    if (!(w > 0 && h > 0)) return;
    services.display.dpr = d;
    if (game.scale.zoom !== 1 / d) game.scale.setZoom(1 / d);
    if (game.scale.width !== w * d || game.scale.height !== h * d) game.scale.resize(w * d, h * d);
  };
  const onResize = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(applySize);
  };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  game.events.once(Phaser.Core.Events.POST_RENDER, () => platform.firstFrameReady());

  services.ready = (async () => {
    const info = await platform.init();
    audio.setPlatformAudio(info.audioEnabled);
    pause.set('host', Boolean(info.paused));
    platform.subscribe(({ paused, audioEnabled }) => {
      pause.set('host', Boolean(paused));
      audio.setPlatformAudio(audioEnabled);
    });
    await loadSaveWithRetry(save, platform);
    // level access: derive the sets once from an older save's completion history
    await (progression.migrate() ?? Promise.resolve()).catch((e) => platform.reportWarning('progression migrate', e));
    // timed chest: start its first cycle (or repair a clock jump) once the save is loaded
    await rewards.ensureTimedChest().catch((e) => platform.reportWarning('timed chest init', e));
  })();

  return { game, services };
}

function currentDpr() {
  return Math.min(2, Math.max(1, window.devicePixelRatio || 1));
}

function viewW() {
  return Math.max(1, Math.floor(document.documentElement.clientWidth || window.innerWidth));
}

function viewH() {
  return Math.max(1, Math.floor(document.documentElement.clientHeight || window.innerHeight));
}

// A failed read is shown to the player with a retry; it is never treated as an empty save.
async function loadSaveWithRetry(save, platform) {
  for (;;) {
    try {
      await save.load();
      hideFatal();
      return;
    } catch (e) {
      platform.reportError('save load failed', e);
      await showFatalAndWaitRetry('Could not load your progress. Check the connection and try again.');
    }
  }
}

function showFatalAndWaitRetry(message) {
  const el = document.getElementById('fatal');
  el.style.display = 'flex';
  el.innerHTML = '';
  const box = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = message;
  const btn = document.createElement('button');
  btn.textContent = 'Retry';
  btn.style.cssText = 'font: 800 20px system-ui; padding: 12px 32px; border-radius: 16px; border: 0; background: #31C339; color: #fff;';
  box.append(p, btn);
  el.append(box);
  return new Promise((resolve) => btn.addEventListener('click', resolve, { once: true }));
}

function hideFatal() {
  const el = document.getElementById('fatal');
  if (el) el.style.display = 'none';
}
