import { Emitter } from '../core/Emitter.js';

// Single source of truth for persistent progress.
// Rules: load (and validate) before any write; a read error is NOT an empty save;
// writes are serialized through one queue; status is observable.

// v2 (Step 6 reward pass): completion receipts, x3, timed chest, level-progress chest.
// v3 (2026-10-10): level access — progression / ad-unlocked / VIP sets (ProgressionService).
export const SAVE_VERSION = 3;

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
    // Level access (v3): normal levels opened by progression, normal levels opened with a rewarded
    // ad, VIP levels bought with diamonds. `migrated` = derived once from an older save's history.
    progression: { unlocked: [], adUnlocked: [], vip: [], migrated: true },
    // Store / Wheel (2026-10-10): rewarded-ad claims per offer for one local day, purchase log
    // count, wheel spins of the day and in total
    store: { day: '', claims: {}, purchases: 0 },
    wheel: { day: '', spins: 0, total: 0 },
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
  state.progression = { unlocked: ids(pr.unlocked), adUnlocked: ids(pr.adUnlocked), vip: ids(pr.vip), migrated: pr.migrated === true };
  const st = raw.store && typeof raw.store === 'object' ? raw.store : {};
  state.store = { day: typeof st.day === 'string' ? st.day : '', claims: Object.fromEntries(Object.entries(st.claims && typeof st.claims === 'object' ? st.claims : {}).map(([k, v]) => [k, toNonNegativeInt(v)])), purchases: toNonNegativeInt(st.purchases) };
  const wh = raw.wheel && typeof raw.wheel === 'object' ? raw.wheel : {};
  state.wheel = { day: typeof wh.day === 'string' ? wh.day : '', spins: toNonNegativeInt(wh.spins), total: toNonNegativeInt(wh.total) };
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

  _assertLoaded() {
    if (!this.loaded) throw new Error('SaveService: state is not loaded; writes are disabled');
  }
}
