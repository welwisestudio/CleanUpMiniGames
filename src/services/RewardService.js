import { Emitter } from '../core/Emitter.js';

// Single owner of reward rules (Step 6 reward pass). Every grant is applied to the SaveService
// state first; UI animations only display the already-accepted change ('granted' events).
//
// Safety rules:
// - level completion: one receipt per play run (`runId`), also advancing the progress chest once;
// - x3: only for the latest completion receipt, once (flag stored in the save → reload-safe);
// - timed chest: claimable only when its time has come; claiming moves the timer forward;
// - progress chest: claimable only at 100 %, resets to 0 only after a successful claim;
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
      s.lastCompletion = { id: r.completionId, levelId, amount, x3: false };
      r.chestStepsBefore = s.progressChest.steps;
      s.progressChest.steps = Math.min(max, s.progressChest.steps + 1);
      r.chestStepsAfter = s.progressChest.steps;
    });
    this._processed.set(operationId, r);
    this.emit('granted', r);
    return r;
  }

  // ---- x3 ------------------------------------------------------------------------------------
  x3Offer(completionId) {
    const lc = this.save.get('lastCompletion');
    const m = this.config.x3.multiplier;
    const available = Boolean(lc && lc.id === completionId && !lc.x3);
    const amount = lc?.amount ?? 0;
    return { available, claimed: Boolean(lc && lc.id === completionId && lc.x3), base: amount, total: amount * m, bonus: amount * (m - 1), busy: this._busy.has('x3') };
  }

  async claimX3(completionId) {
    if (!this.x3Offer(completionId).available || this._busy.has('x3')) return { status: 'unavailable' };
    this._busy.add('x3');
    try {
      const ad = await this._rewardedAd(this.config.x3.placement);
      if (ad !== 'earned') return { status: ad };
      const r = { status: 'unavailable' };
      await this.save.update((s) => {
        const lc = s.lastCompletion;
        if (!lc || lc.id !== completionId || lc.x3) return; // re-check inside the mutation
        const bonus = lc.amount * (this.config.x3.multiplier - 1);
        Object.assign(r, { status: 'granted', bonus, total: lc.amount + bonus, coinsBefore: s.coins });
        s.coins += bonus;
        lc.x3 = true;
        r.coinsAfter = s.coins;
      });
      if (r.status === 'granted') this.emit('granted', { kind: 'x3', ...r });
      return r;
    } finally {
      this._busy.delete('x3');
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
