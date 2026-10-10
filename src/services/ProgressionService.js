import { Emitter } from '../core/Emitter.js';

// Level access (2026-10-10): sequential progression, rewarded-ad level jumps and VIP levels.
// Owns every access rule; the menu / result card only ask and show the result.
//
// Save model (separate per-level sets, never one "highest level" number — ad jumps make progress
// non-linear):
//   levels[id].completed          – completion history (RewardService writes it)
//   progression.unlocked          – normal levels opened by completing the previous level
//   progression.adUnlocked        – normal levels opened with a rewarded ad (a jump)
//   progression.vip               – VIP levels bought with diamonds
//
// Rules:
// - the first level is always playable; a normal level is playable when completed, unlocked by
//   progression or unlocked with an ad; completing a normal level unlocks the NEXT normal level
//   (an ad jump starts its own branch: completing level 25 unlocks 26, 11–24 stay locked);
// - VIP levels (economy.levelAccess.vip, last five) are playable only when bought: progression
//   and ads never open them; diamonds are checked and charged exactly once inside the save mutation;
// - ad unlock: only an 'earned' result unlocks; cancelled / failed / unavailable change nothing;
//   one request in flight per level; a duplicate result grants nothing more; never marks completed;
// - dev / test only (dev adapter): `devUnlockAll` makes every level playable WITHOUT writing the save.
export class ProgressionService extends Emitter {
  constructor({ save, rewards, order, config, devUnlockAll = false }) {
    super();
    this.save = save;
    this.rewards = rewards;
    this.order = order; // DISPLAY_ORDER
    this.config = config; // economy.levelAccess
    this.devUnlockAll = devUnlockAll;
    this._busy = new Set();
    // completing a level unlocks the next normal level (same moment as the completion receipt)
    rewards?.on?.('granted', (r) => {
      if (r?.operationId?.startsWith('complete:')) this.onCompleted(r.levelId);
    });
  }

  index(id) {
    return this.order.indexOf(id);
  }

  number(id) {
    return this.index(id) + 1;
  }

  next(id) {
    const i = this.index(id);
    return i >= 0 && i < this.order.length - 1 ? this.order[i + 1] : null;
  }

  isVip(id) {
    return id in (this.config.vip ?? {});
  }

  vipPrice(id) {
    return this.config.vip?.[id] ?? null;
  }

  _p() {
    return this.save.get('progression');
  }

  isCompleted(id) {
    return Boolean(this.save.get('levels')?.[id]?.completed);
  }

  isPlayable(id) {
    if (this.devUnlockAll) return true;
    const p = this._p();
    if (this.isVip(id)) return p.vip.includes(id);
    return this.index(id) === 0 || this.isCompleted(id) || p.unlocked.includes(id) || p.adUnlocked.includes(id);
  }

  // menu card state: completed · open · locked (ad jump available) · vip (diamonds)
  status(id) {
    if (this.isPlayable(id)) return this.isCompleted(id) ? 'completed' : 'open';
    return this.isVip(id) ? 'vip' : 'locked';
  }

  // One-time migration of saves made before level access existed (every level was open then):
  // completion history is kept and stays replayable, and each completed normal level opens its
  // next normal level, exactly as if it had been completed now. Nothing else is opened (an "all
  // levels open" era save does not become permanent progression). A VIP level completed back then
  // stays replayable (recorded as owned). Idempotent.
  migrate() {
    if (this._p().migrated) return null;
    return this.save.update((s) => {
      const p = s.progression;
      for (const [id, e] of Object.entries(s.levels)) {
        if (!e?.completed || this.index(id) < 0) continue;
        if (this.isVip(id)) {
          if (!p.vip.includes(id)) p.vip.push(id);
          continue;
        }
        const n = this.next(id);
        if (n && !this.isVip(n) && !p.unlocked.includes(n)) p.unlocked.push(n);
      }
      p.migrated = true;
    });
  }

  onCompleted(id) {
    const n = this.next(id);
    if (!n || this.isVip(n) || this.isVip(id) || this._p().unlocked.includes(n)) return;
    this.save.update((s) => {
      if (!s.progression.unlocked.includes(n)) s.progression.unlocked.push(n);
    });
    this.emit('unlocked', { levelId: n, via: 'progression' });
  }

  // Rewarded-ad jump to a locked NORMAL level (never VIP). Permanent; does not mark it completed.
  async unlockWithAd(id) {
    if (this.index(id) < 0 || this.isVip(id)) return { status: 'invalid' };
    if (this.isPlayable(id)) return { status: 'open' };
    if (this._busy.has(id)) return { status: 'busy' };
    this._busy.add(id);
    try {
      const ad = await this.rewards.rewardedAd(this.config.adPlacement);
      if (ad !== 'earned') return { status: ad };
      const r = { status: 'open' };
      await this.save.update((s) => {
        if (s.progression.adUnlocked.includes(id)) return; // a duplicate result grants nothing more
        s.progression.adUnlocked.push(id);
        r.status = 'unlocked';
      });
      if (r.status === 'unlocked') this.emit('unlocked', { levelId: id, via: 'ad' });
      return r;
    } finally {
      this._busy.delete(id);
    }
  }

  // VIP purchase with diamonds (owned → nothing charged; insufficient → nothing changes; no ads).
  purchaseVip(id) {
    const price = this.vipPrice(id);
    if (price == null) return { status: 'invalid' };
    if (this._p().vip.includes(id)) return { status: 'owned' };
    const r = { status: 'insufficient', currency: 'diamonds', price };
    r.savePromise = this.save.update((s) => {
      if (s.progression.vip.includes(id)) return void (r.status = 'owned'); // re-checked inside
      if (s.diamonds < price) return;
      r.before = s.diamonds;
      s.diamonds -= price;
      r.after = s.diamonds;
      s.progression.vip.push(id);
      r.status = 'purchased';
    });
    if (r.status === 'purchased') this.emit('unlocked', { levelId: id, via: 'vip', ...r });
    return r;
  }
}
