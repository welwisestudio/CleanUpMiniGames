import { Emitter } from '../core/Emitter.js';

// Cosmetic tool skins (Step 8): ownership, purchases, rewarded-ad unlocks and the equipped skin
// per tool family. Separate from ToolService (functional alternative tools): a skin never changes
// gameplay, only the base tool's sprite and card.
//
// Rules (same as tools): the default skin is always owned; coins / diamonds are re-checked and
// charged once inside the save mutation; a second purchase of an owned skin charges nothing; a
// rewarded ad unlocks only when 'earned' (cancel / fail / unavailable change nothing), one request
// in flight per skin, a duplicate result grants nothing more; a bought / unlocked skin is equipped.

export class SkinService extends Emitter {
  constructor({ save, rewards, skins, placement = 'skin-unlock' }) {
    super();
    this.save = save;
    this.rewards = rewards;
    this.skins = skins; // TOOL_SKINS
    this.placement = placement;
    this._busy = new Set();
  }

  _skin(familyId, skinId) {
    const f = this.skins[familyId];
    if (!f) return null;
    if (skinId === `${familyId}-default`) return { id: skinId, texture: null, unlock: { type: 'default' } };
    return f.skins.find((s) => s.id === skinId) ?? null;
  }

  isOwned(familyId, skinId) {
    if (skinId === `${familyId}-default`) return true;
    return this.save.get('tools.skins.owned').includes(skinId);
  }

  equipped(familyId) {
    const id = this.save.get('tools.skins.equipped')?.[familyId];
    return id && this._skin(familyId, id) && this.isOwned(familyId, id) ? id : `${familyId}-default`;
  }

  // Texture of the equipped skin for a family's base tool (null = the base tool's own texture).
  textureFor(familyId) {
    if (!this.skins[familyId]) return null;
    return this._skin(familyId, this.equipped(familyId))?.texture ?? null;
  }

  options(familyId) {
    const f = this.skins[familyId];
    if (!f) return [];
    const eq = this.equipped(familyId);
    const all = [{ id: `${familyId}-default`, name: 'Default', texture: null, unlock: { type: 'default' } }, ...f.skins];
    return all.map((s) => ({ ...s, owned: this.isOwned(familyId, s.id), equipped: s.id === eq, busy: this._busy.has(s.id), tool: f.tool }));
  }

  canAfford(skin) {
    const u = skin.unlock;
    if (u.type === 'coins') return this.save.get('coins') >= u.price;
    if (u.type === 'diamonds') return this.save.get('diamonds') >= u.price;
    return true;
  }

  equip(familyId, skinId) {
    if (!this._skin(familyId, skinId) || !this.isOwned(familyId, skinId)) return { status: 'not-owned' };
    if (this.equipped(familyId) === skinId) return { status: 'equipped', skinId };
    const savePromise = this.save.update((s) => (s.tools.skins.equipped[familyId] = skinId));
    this.emit('equipped', { familyId, skinId });
    return { status: 'equipped', skinId, savePromise };
  }

  purchase(familyId, skinId) {
    const skin = this._skin(familyId, skinId);
    if (!skin) return { status: 'invalid' };
    if (this.isOwned(familyId, skinId)) return this.equip(familyId, skinId);
    const { type, price } = skin.unlock;
    if (type !== 'coins' && type !== 'diamonds') return { status: 'invalid' };
    const r = { status: 'insufficient', currency: type, price };
    r.savePromise = this.save.update((s) => {
      if (s.tools.skins.owned.includes(skinId)) return void (r.status = 'owned');
      if (s[type] < price) return;
      r.before = s[type];
      s[type] -= price;
      r.after = s[type];
      s.tools.skins.owned.push(skinId);
      s.tools.skins.equipped[familyId] = skinId;
      r.status = 'purchased';
    });
    if (r.status === 'purchased') this.emit('purchased', { familyId, skinId, ...r });
    if (r.status === 'owned') return this.equip(familyId, skinId);
    return r;
  }

  async unlockWithAd(familyId, skinId) {
    const skin = this._skin(familyId, skinId);
    if (!skin || skin.unlock.type !== 'ad') return { status: 'invalid' };
    if (this.isOwned(familyId, skinId)) return this.equip(familyId, skinId);
    if (this._busy.has(skinId)) return { status: 'busy' };
    this._busy.add(skinId);
    try {
      const ad = await this.rewards.rewardedAd(this.placement);
      if (ad !== 'earned') return { status: ad };
      const r = { status: 'owned' };
      await this.save.update((s) => {
        if (s.tools.skins.owned.includes(skinId)) return;
        s.tools.skins.owned.push(skinId);
        s.tools.skins.equipped[familyId] = skinId;
        r.status = 'unlocked';
      });
      if (r.status === 'unlocked') this.emit('unlocked', { familyId, skinId });
      return r.status === 'unlocked' ? r : this.equip(familyId, skinId);
    } finally {
      this._busy.delete(skinId);
    }
  }
}
