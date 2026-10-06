import { Emitter } from '../core/Emitter.js';

// Single owner of reward rules (Step 6 reward pass). Every grant is applied to the SaveService
// state first; UI animations only display the already-accepted change ('granted' events).
//
// Safety rules:
// - level completion: one receipt per play run (`runId`), also advancing the progress chest once;
// - boost (x2 / x3 / x5 zones): only for the latest completion receipt, once, with a configured multiplier
//   (stored in the save → reload-safe);
// - timed chest: claimable only when its time has come; claiming moves the timer forward;
// - progress chest: claimable only at 100 %; resets after a successful claim, or when the player
//   explicitly skips it after the "lost forever" warning (forfeit); a cancelled / failed ad keeps it;
// - rewarded ads: one request in flight per offer; anything but 'earned' grants nothing;
//   the game is paused (reason 'adBusy') while an ad runs;
// - every claim re-checks its condition inside the save mutation (double clicks are no-ops).

export class RewardService extends Emitter {
  constructor({ save, economy, platform = null, pause = null, clock = () => Date.now() }) {
    super();
    this.save = save;
    this.economy = economy;
    this.platform = platform;
    this.pause = pause;
    this.clock = clock;
    this._processed = new Map(); // operationId -> result
    this._busy = new Set(); // offers with an ad request in flight
  }

  get config() {
    return this.economy.rewards;
  }

  // ---- level completion ------------------------------------------------------------------
  // `runId` is unique per level start, so a repeated call for the same run never pays twice.
  grantLevelCompletion(levelId, runId) {
    const operationId = `complete:${levelId}:${runId}`;
    if (this._processed.has(operationId)) return this._processed.get(operationId);

    const amount = this.economy.completionReward(levelId);
    const max = this.config.progressChest.steps;
    const r = { operationId, levelId, amount, currency: 'coins' };
    r.savePromise = this.save.update((s) => {
      r.coinsBefore = s.coins;
      s.coins += amount;
      r.coinsAfter = s.coins;
      const entry = (s.levels[levelId] ??= { completed: false, completions: 0 });
      entry.completed = true;
      entry.completions += 1;
      s.completionSeq += 1;
      r.completionId = s.completionSeq;
      s.lastCompletion = { id: r.completionId, levelId, amount, boost: 0 };
      r.chestStepsBefore = s.progressChest.steps;
      s.progressChest.steps = Math.min(max, s.progressChest.steps + 1);
      r.chestStepsAfter = s.progressChest.steps;
    });
    this._processed.set(operationId, r);
    this.emit('granted', r);
    return r;
  }

  // ---- post-level boost (x2…x5 multiplier, rewarded ad) -------------------------------------
  boostOffer(completionId) {
    const lc = this.save.get('lastCompletion');
    const mine = Boolean(lc && lc.id === completionId);
    return { available: mine && !lc.boost, claimed: mine && lc.boost > 0, boost: mine ? lc.boost : 0, base: lc?.amount ?? 0, values: [...this.config.boost.values], zones: [...this.config.boost.zones], sweepMs: this.config.boost.sweepMs, busy: this._busy.has('boost') };
  }

  // `multiplier` is the value the player locked (must be one of the configured values).
  async claimBoost(completionId, multiplier) {
    if (!this.config.boost.values.includes(multiplier)) return { status: 'invalid' };
    if (!this.boostOffer(completionId).available || this._busy.has('boost')) return { status: 'unavailable' };
    this._busy.add('boost');
    try {
      const ad = await this._rewardedAd(this.config.boost.placement);
      if (ad !== 'earned') return { status: ad };
      const r = { status: 'unavailable' };
      await this.save.update((s) => {
        const lc = s.lastCompletion;
        if (!lc || lc.id !== completionId || lc.boost) return; // re-check inside the mutation
        const bonus = lc.amount * (multiplier - 1);
        Object.assign(r, { status: 'granted', multiplier, bonus, total: lc.amount + bonus, coinsBefore: s.coins });
        s.coins += bonus;
        lc.boost = multiplier;
        r.coinsAfter = s.coins;
      });
      if (r.status === 'granted') this.emit('granted', { kind: 'boost', ...r });
      return r;
    } finally {
      this._busy.delete('boost');
    }
  }

  // ---- timed chest -------------------------------------------------------------------------
  // Starts the timer on the first launch; repairs a timer that is impossibly far in the future
  // (device clock moved back), so the chest can never get stuck.
  ensureTimedChest() {
    const now = this.clock();
    const c = this.config.timedChest;
    const readyAt = this.save.get('timedChest.readyAt');
    const maxAhead = Math.max(c.firstDelaySec, c.intervalSec) * 1000;
    if (readyAt === 0) return this.save.update((s) => (s.timedChest.readyAt = now + c.firstDelaySec * 1000));
    if (readyAt - now > maxAhead) return this.save.update((s) => (s.timedChest.readyAt = now + c.intervalSec * 1000));
    return Promise.resolve();
  }

  timedChestState() {
    const now = this.clock();
    const readyAt = this.save.get('timedChest.readyAt');
    const remainingMs = readyAt ? Math.max(0, readyAt - now) : this.config.timedChest.firstDelaySec * 1000;
    return { ready: readyAt > 0 && remainingMs === 0, remainingMs, coins: this.config.timedChest.coins };
  }

  claimTimedChest() {
    const c = this.config.timedChest;
    const r = { status: 'not-ready' };
    const now = this.clock();
    if (!this.timedChestState().ready) return r;
    r.savePromise = this.save.update((s) => {
      if (!(s.timedChest.readyAt > 0 && now >= s.timedChest.readyAt)) return; // re-check
      Object.assign(r, { status: 'granted', coins: c.coins, coinsBefore: s.coins });
      s.coins += c.coins;
      r.coinsAfter = s.coins;
      s.timedChest.readyAt = now + c.intervalSec * 1000;
    });
    if (r.status === 'granted') this.emit('granted', { kind: 'timedChest', ...r });
    return r;
  }

  // ---- level-progress chest ----------------------------------------------------------------
  progressChestState() {
    const max = this.config.progressChest.steps;
    const steps = Math.min(max, this.save.get('progressChest.steps'));
    return { steps, max, progress: steps / max, full: steps >= max, coins: this.config.progressChest.coins, diamonds: this.config.progressChest.diamonds, busy: this._busy.has('progressChest') };
  }

  async claimProgressChest() {
    if (!this.progressChestState().full || this._busy.has('progressChest')) return { status: 'unavailable' };
    this._busy.add('progressChest');
    try {
      const c = this.config.progressChest;
      const ad = await this._rewardedAd(c.placement);
      if (ad !== 'earned') return { status: ad }; // progress stays at 100 %: never silently reset
      const r = { status: 'unavailable' };
      await this.save.update((s) => {
        if (s.progressChest.steps < c.steps) return; // re-check
        Object.assign(r, { status: 'granted', coins: c.coins, diamonds: c.diamonds, coinsBefore: s.coins, diamondsBefore: s.diamonds });
        s.coins += c.coins;
        s.diamonds += c.diamonds;
        s.progressChest.steps = 0;
        s.progressChest.opened += 1;
        r.coinsAfter = s.coins;
        r.diamondsAfter = s.diamonds;
      });
      if (r.status === 'granted') this.emit('granted', { kind: 'progressChest', ...r });
      return r;
    } finally {
      this._busy.delete('progressChest');
    }
  }

  // The player skipped a full chest after the warning: it is lost (no reward), progress restarts.
  forfeitProgressChest() {
    if (!this.progressChestState().full || this._busy.has('progressChest')) return { status: 'unavailable' };
    const r = { status: 'unavailable' };
    r.savePromise = this.save.update((s) => {
      if (s.progressChest.steps < this.config.progressChest.steps) return;
      s.progressChest.steps = 0;
      s.progressChest.forfeited += 1;
      r.status = 'forfeited';
    });
    return r;
  }

  // ---- rewarded ad -------------------------------------------------------------------------
  async _rewardedAd(placement) {
    if (!this.platform) return 'unavailable';
    this.pause?.set('adBusy', true);
    try {
      const res = await this.platform.requestRewarded(placement);
      return res?.result ?? 'error';
    } catch {
      return 'error';
    } finally {
      this.pause?.set('adBusy', false);
    }
  }
}
