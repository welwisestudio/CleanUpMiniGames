import { Emitter } from '../core/Emitter.js';

// Wheel of Fortune (systems pass 2026-10-12): the first spin of each local day is FREE; after it
// every spin costs one rewarded ad, with no daily cap. Config segments.
//
// Rules:
// - free spin: available while `wheel.freeDay` is not today; using it records today (re-checked
//   inside the save mutation, so it can never be used twice);
// - ad spin: only an 'earned' ad spins; cancelled / failed / unavailable: no spin, no reward;
// - one spin in flight (a duplicate ad result never grants a second reward);
// - the winning segment is chosen (weighted) and its reward is saved at the same moment, BEFORE the
//   wheel animation — closing the wheel mid-spin can neither lose nor duplicate the reward; the UI
//   then turns the wheel to land exactly on that segment;
// - a tool segment unlocks the tool variant permanently and equips it in its family; if it
//   is already owned the segment's fallback (diamonds) is granted instead.
export class WheelService extends Emitter {
  constructor({ save, rewards, toolShop, config, clock = () => Date.now(), random = Math.random }) {
    super();
    this.save = save;
    this.rewards = rewards;
    this.toolShop = toolShop;
    this.config = config;
    this.clock = clock;
    this.random = random;
    this.busy = false;
  }

  get segments() {
    return this.config.segments;
  }

  today() {
    const d = new Date(this.clock());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // the free spin of today is still available (reset on the next local day)
  freeAvailable() {
    return this.save.get('wheel').freeDay !== this.today();
  }

  pick() {
    const total = this.segments.reduce((a, s) => a + s.weight, 0);
    let x = this.random() * total;
    for (let i = 0; i < this.segments.length; i++) {
      x -= this.segments[i].weight;
      if (x < 0) return i;
    }
    return this.segments.length - 1;
  }

  // What a segment would give right now (a tool already owned → its fallback).
  rewardOf(index) {
    const seg = this.segments[index];
    if (seg.kind === 'tool' && this.toolShop.isOwned(seg.family, seg.tool)) return { ...seg.fallback, fallbackFor: seg.tool };
    return seg;
  }

  async spin() {
    if (this.busy) return { status: 'busy' };
    this.busy = true;
    try {
      await null; // the spin is "in flight" from here on: a same-tick duplicate call gets 'busy'
      const free = this.freeAvailable();
      if (!free) {
        const ad = await this.rewards.rewardedAd(this.config.adPlacement);
        if (ad !== 'earned') return { status: ad };
      }
      const day = this.today();
      const index = this.pick();
      const r = { status: 'busy' };
      r.savePromise = this.save.update((s) => { // applied now; the cloud write runs in the background (2026-10-19)
        if (free && s.wheel.freeDay === day) return; // the free spin was used meanwhile: never twice
        if (free) s.wheel.freeDay = day;
        if (s.wheel.day !== day) Object.assign(s.wheel, { day, spins: 0 });
        s.wheel.spins += 1;
        s.wheel.total += 1;
        const reward = this.rewardOf(index);
        Object.assign(r, { status: 'granted', free, index, reward, coinsBefore: s.coins, diamondsBefore: s.diamonds });
        if (reward.kind === 'coins') s.coins += reward.amount;
        if (reward.kind === 'gems') s.diamonds += reward.amount;
        if (reward.kind === 'tool' && !s.tools.owned.includes(reward.tool)) {
          s.tools.owned.push(reward.tool);
          // 2026-10-17: a won tool is equipped right away in its family (no extra tap needed)
          if (reward.family) s.tools.equipped[reward.family] = reward.tool;
        }
        r.coinsAfter = s.coins;
        r.diamondsAfter = s.diamonds;
      });
      if (r.status === 'granted') this.emit('granted', r);
      return r;
    } finally {
      this.busy = false;
    }
  }
}
