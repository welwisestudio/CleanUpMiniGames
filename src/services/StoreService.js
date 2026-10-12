import { Emitter } from '../core/Emitter.js';

// Store (systems pass 2026-10-12): rewarded-ad offers, coin packs for diamonds and multi-ad bundles.
// No real-money products (the YouTube version has no purchases). Owns every rule; the Store UI only
// asks and shows the result.
//
// Rules:
// - single rewarded-ad offers ('gems', 'coins', 'chest'): only an 'earned' result grants; cancelled /
//   failed / unavailable change nothing; one request in flight per offer; an optional daily cap per
//   offer (`dailyLimit`, null = none; local day, re-checked inside the save mutation);
// - 'chest' opens the timed chest now (its configured coins) and restarts its timer — only while the
//   chest is still counting down (a ready chest is opened in the menu as usual);
// - coin packs cost diamonds: checked and charged exactly once inside the save mutation;
// - ad bundles: each 'earned' ad adds one step of progress (saved, so the ads can be watched in any
//   number of sessions); a failed / cancelled ad adds nothing; at `ads` steps the bundle can be
//   claimed — the whole pack is granted once and the progress starts again from 0 (optional
//   `dailyLimit` claims per day and `cooldownMin` after a claim). One ad in flight per bundle.
export class StoreService extends Emitter {
  constructor({ save, rewards, config, timedChest, clock = () => Date.now() }) {
    super();
    this.save = save;
    this.rewards = rewards;
    this.config = config;
    this.timedChest = timedChest;
    this.clock = clock;
    this._busy = new Set();
  }

  today() {
    const d = new Date(this.clock());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  claimedToday(offerId) {
    const st = this.save.get('store');
    return st.day === this.today() ? st.claims[offerId] ?? 0 : 0;
  }

  // ads left today for a single offer (Infinity = no cap)
  adRemaining(offerId) {
    const o = this.config.free[offerId];
    if (!o) return 0;
    return o.dailyLimit == null ? Infinity : Math.max(0, o.dailyLimit - this.claimedToday(offerId));
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
        if (o.dailyLimit != null && (s.store.claims[offerId] ?? 0) >= o.dailyLimit) return; // re-checked
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

  // ---- multi-ad bundles -----------------------------------------------------------------------
  bundle(id) {
    return this.config.bundles.find((b) => b.id === id) ?? null;
  }

  // The full contents of a bundle (a reward chest counts as its coins / diamonds).
  bundleTotals(b) {
    const chest = b.reward.chest ?? 0;
    return { coins: (b.reward.coins ?? 0) + chest * (this.config.chest?.coins ?? 0), gems: (b.reward.gems ?? 0) + chest * (this.config.chest?.gems ?? 0), chest };
  }

  // { progress, ads, ready (claimable), blocked: null | 'limit' | 'cooldown', cooldownLeftMs }
  bundleState(id) {
    const b = this.bundle(id);
    if (!b) return null;
    const st = this.save.get('store').bundles?.[id] ?? { progress: 0, claims: 0, day: '', dayClaims: 0, lastClaimAt: 0 };
    const progress = Math.min(st.progress, b.ads);
    const dayClaims = st.day === this.today() ? st.dayClaims : 0;
    const cooldownLeftMs = b.cooldownMin && st.lastClaimAt ? Math.max(0, st.lastClaimAt + b.cooldownMin * 60000 - this.clock()) : 0;
    let blocked = null;
    if (progress < b.ads && b.dailyLimit != null && dayClaims >= b.dailyLimit) blocked = 'limit';
    else if (progress < b.ads && cooldownLeftMs > 0) blocked = 'cooldown';
    return { progress, ads: b.ads, ready: progress >= b.ads, blocked, cooldownLeftMs, claims: st.claims, busy: this._busy.has(id) };
  }

  // One rewarded ad towards a bundle (+1 progress on 'earned').
  async watchBundleAd(id) {
    const b = this.bundle(id);
    if (!b) return { status: 'invalid' };
    const st = this.bundleState(id);
    if (st.ready) return { status: 'ready' };
    if (st.blocked) return { status: st.blocked };
    if (this._busy.has(id)) return { status: 'busy' };
    this._busy.add(id);
    try {
      const ad = await this.rewards.rewardedAd(this.config.adPlacement);
      if (ad !== 'earned') return { status: ad };
      const r = { status: 'ready', id };
      await this.save.update((s) => {
        const e = (s.store.bundles[id] ??= { progress: 0, claims: 0, day: '', dayClaims: 0, lastClaimAt: 0 });
        if (e.progress >= b.ads) return; // already complete: a duplicate result adds nothing
        e.progress += 1;
        Object.assign(r, { status: 'progress', progress: e.progress, ads: b.ads });
      });
      if (r.status === 'progress') this.emit('bundle-progress', r);
      return r;
    } finally {
      this._busy.delete(id);
    }
  }

  // Claims a completed bundle: the whole pack, exactly once (progress back to 0).
  claimBundle(id) {
    const b = this.bundle(id);
    if (!b) return { status: 'invalid' };
    const t = this.bundleTotals(b);
    const day = this.today();
    const now = this.clock();
    const r = { status: 'not-ready', id };
    r.savePromise = this.save.update((s) => {
      const e = s.store.bundles[id];
      if (!e || e.progress < b.ads) return; // re-checked inside: never twice
      if (e.day !== day) Object.assign(e, { day, dayClaims: 0 });
      e.progress = 0;
      e.claims += 1;
      e.dayClaims += 1;
      e.lastClaimAt = now;
      Object.assign(r, { status: 'granted', coins: t.coins, gems: t.gems, chest: t.chest, coinsBefore: s.coins, diamondsBefore: s.diamonds });
      s.coins += t.coins;
      s.diamonds += t.gems;
      r.coinsAfter = s.coins;
      r.diamondsAfter = s.diamonds;
    });
    if (r.status === 'granted') this.emit('granted', r);
    return r;
  }
}
