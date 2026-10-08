import { Emitter } from '../core/Emitter.js';

// Alternative tools (Step 7): ownership, purchases, rewarded-ad unlocks and the equipped tool per
// family. Owns every rule; the UI only asks and then shows the result.
//
// Rules:
// - the base tool of a family is always owned and is equipped when nothing else is;
// - coins / diamonds purchase: the balance is checked and charged exactly once, inside the save
//   mutation (re-checked there); a second tap / call for an owned tool charges nothing;
// - rewarded-ad unlock: only an 'earned' result unlocks; cancelled / failed / unavailable changes
//   nothing (no unlock, no equip, no currency); one request in flight per tool; a late duplicate
//   result for an already owned tool grants nothing more;
// - a purchased / unlocked tool is equipped right away and stays owned permanently;
// - equipping requires ownership.

export class ToolService extends Emitter {
  constructor({ save, rewards, families, placement = 'tool-unlock' }) {
    super();
    this.save = save;
    this.rewards = rewards;
    this.families = families;
    this.placement = placement;
    this._busy = new Set();
  }

  _family(id) {
    const f = this.families[id];
    if (!f) throw new Error(`Unknown tool family: ${id}`);
    return f;
  }

  isOwned(familyId, toolId) {
    const f = this._family(familyId);
    if (toolId === f.base) return true;
    return this.save.get('tools.owned').includes(toolId);
  }

  equipped(familyId) {
    const f = this._family(familyId);
    const id = this.save.get('tools.equipped')?.[familyId];
    return id && f.options.some((o) => o.tool === id) && this.isOwned(familyId, id) ? id : f.base;
  }

  // Cards for the selector: option + state, in the configured order.
  options(familyId) {
    const eq = this.equipped(familyId);
    return this._family(familyId).options.map((o) => ({ ...o, owned: this.isOwned(familyId, o.tool), equipped: o.tool === eq, busy: this._busy.has(o.tool) }));
  }

  canAfford(option) {
    const u = option.unlock;
    if (u.type === 'coins') return this.save.get('coins') >= u.price;
    if (u.type === 'diamonds') return this.save.get('diamonds') >= u.price;
    return true;
  }

  equip(familyId, toolId) {
    if (!this._family(familyId).options.some((o) => o.tool === toolId) || !this.isOwned(familyId, toolId)) return { status: 'not-owned' };
    if (this.equipped(familyId) === toolId) return { status: 'equipped', toolId };
    const savePromise = this.save.update((s) => (s.tools.equipped[familyId] = toolId));
    this.emit('equipped', { familyId, toolId });
    return { status: 'equipped', toolId, savePromise };
  }

  // Coins / diamonds purchase (owned → just equip; insufficient → nothing changes).
  purchase(familyId, toolId) {
    const opt = this._family(familyId).options.find((o) => o.tool === toolId);
    if (!opt) return { status: 'invalid' };
    if (this.isOwned(familyId, toolId)) return this.equip(familyId, toolId);
    const { type, price } = opt.unlock;
    if (type !== 'coins' && type !== 'diamonds') return { status: 'invalid' };
    if (this._busy.has(toolId)) return { status: 'busy' };
    const key = type; // 'coins' | 'diamonds'
    const r = { status: 'insufficient', currency: key, price };
    r.savePromise = this.save.update((s) => {
      // re-checked inside the mutation: owned already / balance
      if (s.tools.owned.includes(toolId)) return void (r.status = 'owned');
      if (s[key] < price) return;
      r.before = s[key];
      s[key] -= price;
      r.after = s[key];
      s.tools.owned.push(toolId);
      s.tools.equipped[familyId] = toolId;
      s.tools.purchases += 1;
      r.status = 'purchased';
    });
    if (r.status === 'purchased') this.emit('purchased', { familyId, toolId, ...r });
    if (r.status === 'owned') return this.equip(familyId, toolId);
    return r;
  }

  // Rewarded-ad unlock: permanent; the tool is equipped on success.
  async unlockWithAd(familyId, toolId) {
    const opt = this._family(familyId).options.find((o) => o.tool === toolId);
    if (!opt || opt.unlock.type !== 'ad') return { status: 'invalid' };
    if (this.isOwned(familyId, toolId)) return this.equip(familyId, toolId);
    if (this._busy.has(toolId)) return { status: 'busy' };
    this._busy.add(toolId);
    try {
      const ad = await this.rewards.rewardedAd(this.placement);
      if (ad !== 'earned') return { status: ad };
      const r = { status: 'owned' };
      await this.save.update((s) => {
        if (s.tools.owned.includes(toolId)) return; // a duplicate result grants nothing more
        s.tools.owned.push(toolId);
        s.tools.equipped[familyId] = toolId;
        s.tools.purchases += 1;
        r.status = 'unlocked';
      });
      if (r.status === 'unlocked') this.emit('unlocked', { familyId, toolId });
      return r.status === 'unlocked' ? r : this.equip(familyId, toolId);
    } finally {
      this._busy.delete(toolId);
    }
  }
}
