import { Emitter } from '../core/Emitter.js';

// Wheel of Fortune (2026-10-10): one rewarded ad = one spin, a daily limit, config segments.
//
// Rules:
// - only an 'earned' ad spins; cancelled / failed / unavailable: no spin, no reward;
// - one spin in flight; the daily limit is re-checked inside the save mutation, so a duplicate ad
//   result never grants a second reward;
// - the winning segment is chosen (weighted) and its reward is saved at the same moment, BEFORE the
//   wheel animation — closing the wheel mid-spin can neither lose nor duplicate the reward; the UI
//   then turns the wheel to land exactly on that segment;
// - a tool segment unlocks the tool variant permanently (ToolService ownership, not equipped); if it
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

  spinsLeft() {
    const w = this.save.get('wheel');
    return Math.max(0, this.config.dailyLimit - (w.day === this.today() ? w.spins : 0));
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
    if (this.spinsLeft() <= 0) return { status: 'limit' };
    this.busy = true;
    try {
      const ad = await this.rewards.rewardedAd(this.config.adPlacement);
      if (ad !== 'earned') return { status: ad };
      const day = this.today();
      const index = this.pick();
      const r = { status: 'limit' };
      await this.save.update((s) => {
        if (s.wheel.day !== day) Object.assign(s.wheel, { day, spins: 0 });
        if (s.wheel.spins >= this.config.dailyLimit) return; // re-checked: never twice
        s.wheel.spins += 1;
        s.wheel.total += 1;
        const reward = this.rewardOf(index);
        Object.assign(r, { status: 'granted', index, reward, coinsBefore: s.coins, diamondsBefore: s.diamonds });
        if (reward.kind === 'coins') s.coins += reward.amount;
        if (reward.kind === 'gems') s.diamonds += reward.amount;
        if (reward.kind === 'tool' && !s.tools.owned.includes(reward.tool)) s.tools.owned.push(reward.tool);
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
