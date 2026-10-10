import { Emitter } from '../core/Emitter.js';

// Store (2026-10-10): rewarded-ad offers, coin packs for diamonds and diamond packs. Owns every rule;
// the Store UI only asks and shows the result.
//
// Rules:
// - rewarded-ad offers ('gems', 'coins', 'chest'): only an 'earned' result grants; cancelled /
//   failed / unavailable change nothing; one request in flight per offer; a daily cap per offer
//   (local day, re-checked inside the save mutation, so a duplicate result never grants twice);
// - 'chest' opens the timed chest now (its configured coins) and restarts its timer — only while the
//   chest is still counting down (a ready chest is opened in the menu as usual);
// - coin packs cost diamonds: checked and charged exactly once inside the save mutation;
// - diamond packs are real-money products: until the platform payments step only the dev adapter
//   grants them (a clearly marked test purchase); elsewhere they report 'unavailable'.
export class StoreService extends Emitter {
  constructor({ save, rewards, platform, config, timedChest, clock = () => Date.now() }) {
    super();
    this.save = save;
    this.rewards = rewards;
    this.platform = platform;
    this.config = config;
    this.timedChest = timedChest;
    this.clock = clock;
    this._busy = new Set();
  }

  today() {
    const d = new Date(this.clock());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  get devPurchases() {
    return Boolean(this.platform?.dev);
  }

  claimedToday(offerId) {
    const st = this.save.get('store');
    return st.day === this.today() ? st.claims[offerId] ?? 0 : 0;
  }

  adRemaining(offerId) {
    const o = this.config.free[offerId];
    return o ? Math.max(0, o.dailyLimit - this.claimedToday(offerId)) : 0;
  }

  isBusy(offerId) {
    return this._busy.has(offerId);
  }

  chestSkippable() {
    return !this.rewards.timedChestState().ready;
  }

  async claimAd(offerId) {
    const o = this.config.free[offerId];
    if (!o) return { status: 'invalid' };
    if (this.adRemaining(offerId) <= 0) return { status: 'limit' };
    if (offerId === 'chest' && !this.chestSkippable()) return { status: 'chest-ready' };
    if (this._busy.has(offerId)) return { status: 'busy' };
    this._busy.add(offerId);
    try {
      const ad = await this.rewards.rewardedAd(this.config.adPlacement);
      if (ad !== 'earned') return { status: ad };
      const day = this.today();
      const now = this.clock();
      const r = { status: 'limit', offerId };
      await this.save.update((s) => {
        if (s.store.day !== day) Object.assign(s.store, { day, claims: {} });
        if ((s.store.claims[offerId] ?? 0) >= o.dailyLimit) return; // re-checked: never twice
        s.store.claims[offerId] = (s.store.claims[offerId] ?? 0) + 1;
        Object.assign(r, { status: 'granted', coinsBefore: s.coins, diamondsBefore: s.diamonds, coins: 0, gems: 0 });
        if (offerId === 'gems') r.gems = o.gems;
        if (offerId === 'coins') r.coins = o.coins;
        if (offerId === 'chest') {
          r.coins = this.timedChest.coins;
          s.timedChest.readyAt = now + this.timedChest.intervalSec * 1000;
        }
        s.coins += r.coins;
        s.diamonds += r.gems;
        r.coinsAfter = s.coins;
        r.diamondsAfter = s.diamonds;
      });
      if (r.status === 'granted') this.emit('granted', r);
      return r;
    } finally {
      this._busy.delete(offerId);
    }
  }

  // Coin pack for diamonds (insufficient → nothing changes).
  buyCoins(packId) {
    const pack = this.config.coinPacks.find((p) => p.id === packId);
    if (!pack) return { status: 'invalid' };
    const r = { status: 'insufficient', currency: 'diamonds', price: pack.gems };
    r.savePromise = this.save.update((s) => {
      if (s.diamonds < pack.gems) return;
      Object.assign(r, { status: 'purchased', coinsBefore: s.coins, diamondsBefore: s.diamonds });
      s.diamonds -= pack.gems;
      s.coins += pack.coins;
      s.store.purchases += 1;
      r.coinsAfter = s.coins;
      r.diamondsAfter = s.diamonds;
    });
    if (r.status === 'purchased') this.emit('purchased', { packId, ...r });
    return r;
  }

  // Diamond pack: a real-money product — the dev adapter grants it as a test purchase for now.
  buyGems(packId) {
    const pack = this.config.gemPacks.find((p) => p.id === packId);
    if (!pack) return { status: 'invalid' };
    if (!this.devPurchases) return { status: 'unavailable' };
    const r = { status: 'purchased', test: true };
    r.savePromise = this.save.update((s) => {
      r.diamondsBefore = s.diamonds;
      s.diamonds += pack.gems;
      s.store.purchases += 1;
      r.diamondsAfter = s.diamonds;
      r.coinsAfter = s.coins;
    });
    this.emit('purchased', { packId, ...r });
    return r;
  }
}
