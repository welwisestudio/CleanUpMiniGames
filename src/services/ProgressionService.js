import { Emitter } from '../core/Emitter.js';
import { levelPrice } from '../content/economy.js';

// Level access (systems pass 2026-10-12): normal levels are bought with coins (or unlocked with a
// rewarded ad when the player cannot afford them); three VIP levels are unlocked only with a
// rewarded ad. Owns every access rule; the menu / result card only ask and show the result.
//
// Save model (separate per-level sets, never one "highest level" number — the player chooses where
// to spend coins / ads, so progress is non-linear):
//   levels[id].completed          – completion history (RewardService writes it)
//   progression.purchased         – normal levels bought with coins
//   progression.adUnlocked        – normal levels opened with a rewarded ad
//   progression.unlocked          – normal levels opened by the old sequential progression (kept)
//   progression.vipAds            – VIP levels opened with a rewarded ad
//
// Rules:
// - the first `freeLevels` levels are always playable; any completed level stays replayable;
// - a normal level is playable once bought, ad-unlocked or (legacy) unlocked. Nothing unlocks
//   automatically — completing a level does not open the next one;
// - coin purchase: price from the economy curve; checked and charged exactly once inside the save
//   mutation; insufficient → nothing changes;
// - ad unlock (normal level the player cannot afford, or any VIP level): only an 'earned' result
//   unlocks; cancelled / failed / unavailable change nothing; one request in flight per level; a
//   duplicate result grants nothing more; never marks completed; no coins are charged;
// - VIP levels (economy.levelAccess.vip): rewarded ad only — no coin or diamond purchase exists;
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
    return (this.config.vip ?? []).includes(id);
  }

  // Gem level (2026-10-17): bought with the existing diamond / gem currency only — no coin price, no
  // rewarded unlock.
  isGemLevel(id) {
    return this.config.gems?.[id] != null;
  }

  // 'coins' · 'gems' (gem level, paid with diamonds) · null (VIP: ad only)
  currency(id) {
    if (this.isVip(id)) return null;
    return this.isGemLevel(id) ? 'gems' : 'coins';
  }

  // Price of a normal level in its currency (0 = free; VIP levels have no price).
  price(id) {
    if (this.isVip(id) || this.index(id) < 0) return null;
    if (this.isGemLevel(id)) return this.config.gems[id];
    return levelPrice(this.number(id), this.order.length, this.config);
  }

  canAfford(id) {
    const p = this.price(id);
    return p != null && this.save.get(this.currency(id) === 'gems' ? 'diamonds' : 'coins') >= p;
  }

  _p() {
    return this.save.get('progression');
  }

  isCompleted(id) {
    return Boolean(this.save.get('levels')?.[id]?.completed);
  }

  isPlayable(id) {
    if (this.devUnlockAll) return true;
    if (this.index(id) < 0) return false;
    if (this.isCompleted(id)) return true;
    const p = this._p();
    if (this.isVip(id)) return p.vipAds.includes(id);
    return this.price(id) === 0 || p.purchased.includes(id) || p.adUnlocked.includes(id) || p.unlocked.includes(id);
  }

  // menu card state: completed · open · locked (coins / ad) · vip (locked VIP, ad only)
  status(id) {
    if (this.isPlayable(id)) return this.isCompleted(id) ? 'completed' : 'open';
    return this.isVip(id) ? 'vip' : 'locked';
  }

  // Save migration (idempotent):
  // - v2 saves (made before level access existed): completion history is kept and stays
  //   replayable, and each completed normal level opens its next normal level (as it did then);
  // - access model 2 (2026-10-12): a level bought as VIP with diamonds stays accessible — as an
  //   ad-unlocked VIP level if it is still VIP, otherwise as an unlocked normal level; a level that
  //   is VIP now but was already open as a normal level stays open (as an ad-unlocked VIP level).
  //   The old diamond VIP set is emptied afterwards (nothing depends on it any more).
  // - model 3 (2026-10-17): a level that became VIP (Aquarium) stays open for a player who had
  //   already bought / unlocked it as a normal level (moved to the ad-unlocked VIP set).
  migrate() {
    const p0 = this._p();
    if (p0.migrated && p0.model >= 3) return null;
    return this.save.update((s) => {
      const p = s.progression;
      const add = (list, id) => !list.includes(id) && list.push(id);
      if (!p.migrated) {
        for (const [id, e] of Object.entries(s.levels)) {
          if (!e?.completed || this.index(id) < 0 || this.isVip(id)) continue;
          const n = this.next(id);
          if (n && !this.isVip(n)) add(p.unlocked, n);
        }
        p.migrated = true;
      }
      if (!(p.model >= 2)) {
        for (const id of p.vip) {
          if (this.index(id) < 0) continue;
          add(this.isVip(id) ? p.vipAds : p.unlocked, id);
        }
        for (const id of this.config.vip ?? []) {
          if (p.unlocked.includes(id) || p.adUnlocked.includes(id) || p.purchased.includes(id)) add(p.vipAds, id);
        }
        p.vip = [];
        p.model = 2;
      }
      if (!(p.model >= 3)) {
        for (const id of this.config.vip ?? []) {
          if (p.unlocked.includes(id) || p.adUnlocked.includes(id) || p.purchased.includes(id)) add(p.vipAds, id);
        }
        p.model = 3;
      }
    });
  }

  // Purchase of a locked NORMAL level with its currency — coins, or diamonds for a gem level
  // (owned → nothing charged; insufficient → nothing changes).
  purchase(id) {
    const price = this.price(id);
    if (price == null) return { status: 'invalid' };
    if (this.isPlayable(id)) return { status: 'open' };
    const gems = this.currency(id) === 'gems';
    const key = gems ? 'diamonds' : 'coins';
    const r = { status: 'insufficient', currency: gems ? 'gems' : 'coins', price };
    r.savePromise = this.save.update((s) => {
      if (s.progression.purchased.includes(id)) return void (r.status = 'open'); // re-checked inside
      if (s[key] < price) return;
      r.before = s[key];
      s[key] -= price;
      r.after = s[key];
      s.progression.purchased.push(id);
      r.status = 'purchased';
    });
    if (r.status === 'purchased') this.emit('unlocked', { levelId: id, via: gems ? 'gems' : 'coins', ...r });
    return r;
  }

  // Rewarded-ad unlock of a locked level: a normal level (when the player chooses the ad instead of
  // coins) or a VIP level (the only way to open it). Permanent; never marks it completed.
  async unlockWithAd(id) {
    if (this.index(id) < 0 || this.isGemLevel(id)) return { status: 'invalid' }; // gem levels: diamonds only
    if (this.isPlayable(id)) return { status: 'open' };
    if (this._busy.has(id)) return { status: 'busy' };
    const vip = this.isVip(id);
    this._busy.add(id);
    try {
      const ad = await this.rewards.rewardedAd(vip ? this.config.vipPlacement ?? this.config.adPlacement : this.config.adPlacement);
      if (ad !== 'earned') return { status: ad };
      const r = { status: 'open' };
      r.savePromise = this.save.update((s) => { // applied now; the cloud write runs in the background (2026-10-19)
        const list = vip ? s.progression.vipAds : s.progression.adUnlocked;
        if (list.includes(id)) return; // a duplicate result grants nothing more
        list.push(id);
        r.status = 'unlocked';
      });
      if (r.status === 'unlocked') this.emit('unlocked', { levelId: id, via: vip ? 'vip-ad' : 'ad' });
      return r;
    } finally {
      this._busy.delete(id);
    }
  }
}
