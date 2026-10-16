import { Emitter } from '../core/Emitter.js';

// Single source of truth for persistent progress.
// Rules: load (and validate) before any write; a read error is NOT an empty save;
// writes are serialized through one queue; status is observable.

// v2 (Step 6 reward pass): completion receipts, x3, timed chest, level-progress chest.
// v3 (2026-10-10): level access — progression / ad-unlocked / VIP sets (ProgressionService).
// v4 (2026-10-12): coin-bought levels, ad-unlocked VIP levels, Store ad-bundle progress, the
// Wheel's free spin of the day. Older saves load unchanged (missing parts start empty).
export const SAVE_VERSION = 4;

export function createDefaultState() {
  return {
    version: SAVE_VERSION,
    coins: 0,
    diamonds: 0,
    levels: {}, // levelId -> { completed: boolean, completions: number }
    settings: { sound: true, music: true }, // vibration removed 2026-10-11
    tutorial: {}, // gesture families whose hint has been introduced (Step 4)
    // Reward receipts (one per accepted level completion). `lastCompletion` lets the x3 offer of
    // that completion be paid exactly once, even after a reload.
    completionSeq: 0,
    lastCompletion: null, // { id, levelId, amount, boost: 0 | locked multiplier once claimed }
    timedChest: { readyAt: 0 }, // epoch ms when the next timed chest opens (0 = not started)
    progressChest: { steps: 0, opened: 0, forfeited: 0 }, // steps 0..max; chests claimed / skipped
    // Step 7 alternative tools: permanently owned tool ids (base tools are implicit), the equipped
    // tool per family, and a purchase / unlock counter (audit)
    tools: { owned: [], equipped: {}, purchases: 0, skins: { owned: [], equipped: {} } },
    // Level access: `unlocked` – normal levels opened by the old sequential progression (kept
    // playable), `purchased` – normal levels bought with coins (v4), `adUnlocked` – normal levels
    // opened with a rewarded ad, `vipAds` – VIP levels opened with a rewarded ad (v4), `vip` – legacy
    // diamond VIP purchases (v3; migrated once, then empty). `migrated` = v2 history derived once;
    // `model` = access model the sets were migrated to (2 = coins + ad-only VIP).
    progression: { unlocked: [], purchased: [], adUnlocked: [], vipAds: [], vip: [], migrated: true, model: 2 },
    // Store / Wheel: rewarded-ad claims per offer for one local day, purchase log count, ad-bundle
    // progress (v4: { progress, claims, day, dayClaims, lastClaimAt } per bundle id); wheel spins of
    // the day and in total, and the local day whose free spin was used (v4)
    store: { day: '', claims: {}, purchases: 0, bundles: {} },
    wheel: { day: '', spins: 0, total: 0, freeDay: '' },
  };
}

export class SaveCorruptError extends Error {}

// Parses and migrates a serialized save. Unknown future versions are rejected rather than
// overwritten, so a newer client's progress is never destroyed.
export function parseSave(serialized) {
  if (serialized === '' || serialized == null) return createDefaultState();
  let raw;
  try {
    raw = JSON.parse(serialized);
  } catch (e) {
    throw new SaveCorruptError(`Save data is not valid JSON: ${e.message}`);
  }
  if (!raw || typeof raw !== 'object') throw new SaveCorruptError('Save data is not an object');
  const version = Number(raw.version ?? 0);
  if (version > SAVE_VERSION) throw new SaveCorruptError(`Save version ${version} is newer than supported ${SAVE_VERSION}`);

  const base = createDefaultState();
  const state = {
    ...base,
    coins: toNonNegativeInt(raw.coins),
    diamonds: toNonNegativeInt(raw.diamonds),
    levels: {},
    // only known settings are kept (an old save's `vibration` is dropped — the game never vibrates)
    settings: { sound: raw.settings?.sound ?? base.settings.sound, music: raw.settings?.music ?? base.settings.music },
    tutorial: {},
  };
  for (const [k, v] of Object.entries(raw.tutorial ?? {})) if (v) state.tutorial[k] = true;
  state.completionSeq = toNonNegativeInt(raw.completionSeq);
  const lc = raw.lastCompletion;
  // `boost` = multiplier claimed for that completion (0 = not yet); older saves stored `x3: true`
  state.lastCompletion = lc && typeof lc === 'object' && typeof lc.levelId === 'string' ? { id: toNonNegativeInt(lc.id), levelId: lc.levelId, amount: toNonNegativeInt(lc.amount), boost: toNonNegativeInt(lc.boost ?? (lc.x3 ? 3 : 0)) } : null;
  state.timedChest = { readyAt: toNonNegativeInt(raw.timedChest?.readyAt) };
  const tl = raw.tools && typeof raw.tools === 'object' ? raw.tools : {};
  state.tools = {
    owned: [...new Set((Array.isArray(tl.owned) ? tl.owned : []).filter((x) => typeof x === 'string'))],
    equipped: Object.fromEntries(Object.entries(tl.equipped && typeof tl.equipped === 'object' ? tl.equipped : {}).filter(([, v]) => typeof v === 'string')),
    purchases: toNonNegativeInt(tl.purchases),
    // legacy (removed cosmetic skins, 2026-10-10): kept and sanitised so old saves load unchanged;
    // the game no longer reads it
    skins: {
      owned: [...new Set((Array.isArray(tl.skins?.owned) ? tl.skins.owned : []).filter((x) => typeof x === 'string'))],
      equipped: Object.fromEntries(Object.entries(tl.skins?.equipped && typeof tl.skins.equipped === 'object' ? tl.skins.equipped : {}).filter(([, v]) => typeof v === 'string')),
    },
  };
  state.progressChest = { steps: toNonNegativeInt(raw.progressChest?.steps), opened: toNonNegativeInt(raw.progressChest?.opened), forfeited: toNonNegativeInt(raw.progressChest?.forfeited) };
  // level access: a v2 save has none → empty sets, migrated once from its completion history
  const pr = raw.progression && typeof raw.progression === 'object' ? raw.progression : {};
  const ids = (a) => [...new Set((Array.isArray(a) ? a : []).filter((x) => typeof x === 'string'))];
  // a v3 save has no `model` → ProgressionService.migrate() moves it to the coin / ad-only VIP model
  state.progression = { unlocked: ids(pr.unlocked), purchased: ids(pr.purchased), adUnlocked: ids(pr.adUnlocked), vipAds: ids(pr.vipAds), vip: ids(pr.vip), migrated: pr.migrated === true, model: toNonNegativeInt(pr.model) };
  const st = raw.store && typeof raw.store === 'object' ? raw.store : {};
  const str = (v) => (typeof v === 'string' ? v : '');
  const bundles = {};
  for (const [k, b] of Object.entries(st.bundles && typeof st.bundles === 'object' ? st.bundles : {})) {
    if (b && typeof b === 'object') bundles[k] = { progress: toNonNegativeInt(b.progress), claims: toNonNegativeInt(b.claims), day: str(b.day), dayClaims: toNonNegativeInt(b.dayClaims), lastClaimAt: toNonNegativeInt(b.lastClaimAt) };
  }
  state.store = { day: str(st.day), claims: Object.fromEntries(Object.entries(st.claims && typeof st.claims === 'object' ? st.claims : {}).map(([k, v]) => [k, toNonNegativeInt(v)])), purchases: toNonNegativeInt(st.purchases), bundles };
  const wh = raw.wheel && typeof raw.wheel === 'object' ? raw.wheel : {};
  state.wheel = { day: str(wh.day), spins: toNonNegativeInt(wh.spins), total: toNonNegativeInt(wh.total), freeDay: str(wh.freeDay) };
  for (const [id, entry] of Object.entries(raw.levels ?? {})) {
    state.levels[id] = {
      completed: Boolean(entry?.completed),
      completions: toNonNegativeInt(entry?.completions),
    };
  }
  return state;
}

function toNonNegativeInt(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export class SaveService extends Emitter {
  constructor(platform) {
    super();
    this.platform = platform;
    this.state = null;
    this.loaded = false;
    this.status = 'not-loaded'; // not-loaded | loading | ready | saving | error
    this.lastError = null;
    this._queue = Promise.resolve();
    this._dirty = false;
  }

  async load() {
    this.status = 'loading';
    try {
      const serialized = await this.platform.loadData();
      this.state = parseSave(serialized);
      this.loaded = true;
      this.status = 'ready';
      this.emit('loaded', this.state);
      return this.state;
    } catch (e) {
      // Keep writes disabled: an unreadable save must not be replaced by an empty one.
      this.loaded = false;
      this.status = 'error';
      this.lastError = e;
      throw e;
    }
  }

  get(path) {
    this._assertLoaded();
    return path.split('.').reduce((o, k) => o?.[k], this.state);
  }

  // Applies a mutation to the state and queues a save. Returns the save promise.
  update(mutator) {
    this._assertLoaded();
    mutator(this.state);
    this.emit('changed', this.state);
    return this._enqueueSave();
  }

  _enqueueSave() {
    this._dirty = true;
    const run = async () => {
      if (!this._dirty) return;
      this._dirty = false;
      this.status = 'saving';
      try {
        await this.platform.saveData(JSON.stringify(this.state));
        this.status = 'ready';
        this.emit('saved');
      } catch (e) {
        this._dirty = true; // retried on the next save request
        this.status = 'error';
        this.lastError = e;
        this.emit('save-error', e);
        throw e;
      }
    };
    const p = this._queue.then(run, run);
    this._queue = p.catch(() => {});
    return p;
  }

  // Host pause / important moment: push the current state now (no-op until the save is loaded).
  flush() {
    if (!this.loaded) return Promise.resolve();
    return this._enqueueSave();
  }

  _assertLoaded() {
    if (!this.loaded) throw new Error('SaveService: state is not loaded; writes are disabled');
  }
}
