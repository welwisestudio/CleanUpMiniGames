// Cosmetic tool skins (Step 8, separate from the functional alternative tools of toolFamilies.js).
// A skin only changes how a family's BASE tool looks: the sprite in the hand and its card. It
// never changes the radius, the mechanic, the speed, rewards or progress. Skins are recolours of
// the approved base tool master (same silhouette and working point), so the base tool's data
// (working point, offsets, footprint) is used unchanged.
//
// unlock: { type: 'default' } | { type: 'coins', price } | { type: 'diamonds', price } | { type: 'ad' }
// Prices are provisional (Step 10 balance).

const sk = (id, name, unlock) => ({ id, name, texture: `skin-${id}`, unlock });

export const TOOL_SKINS = {
  rinse: { tool: 'washer-lance', skins: [sk('washer-red', 'Red', { type: 'coins', price: 30 }), sk('washer-neon', 'Neon', { type: 'diamonds', price: 4 }), sk('washer-candy', 'Candy', { type: 'ad' })] },
  scrub: { tool: 'scrub-brush', skins: [sk('scrub-wood', 'Wooden', { type: 'coins', price: 20 }), sk('scrub-pink', 'Pink', { type: 'ad' }), sk('scrub-gold', 'Gold', { type: 'diamonds', price: 5 })] },
  foam: { tool: 'foam-sprayer', skins: [sk('foam-candy', 'Candy', { type: 'coins', price: 25 }), sk('foam-neon', 'Neon', { type: 'ad' }), sk('foam-gold', 'Gold', { type: 'diamonds', price: 5 })] },
  screw: { tool: 'screwdriver', skins: [sk('screw-blue', 'Blue', { type: 'coins', price: 15 }), sk('screw-industrial', 'Industrial', { type: 'ad' }), sk('screw-neon', 'Neon', { type: 'diamonds', price: 3 })] },
  hammer: { tool: 'hammer', skins: [sk('hammer-construction', 'Construction', { type: 'coins', price: 20 }), sk('hammer-toy', 'Toy', { type: 'ad' }), sk('hammer-red', 'Red', { type: 'diamonds', price: 3 })] },
  grind: { tool: 'angle-grinder', skins: [sk('grinder-red', 'Red', { type: 'coins', price: 30 }), sk('grinder-neon', 'Neon', { type: 'diamonds', price: 4 }), sk('grinder-industrial', 'Industrial', { type: 'ad' })] },
  polish: { tool: 'polisher', skins: [sk('polisher-pink', 'Candy', { type: 'coins', price: 25 }), sk('polisher-blue', 'Blue', { type: 'ad' }), sk('polisher-chrome', 'Chrome', { type: 'diamonds', price: 4 })] },
  laser: { tool: 'laser', skins: [sk('laser-redblack', 'Red & black', { type: 'coins', price: 35 }), sk('laser-blue', 'Futuristic', { type: 'ad' }), sk('laser-gold', 'Gold', { type: 'diamonds', price: 6 })] },
};

export const SKIN_AD_PLACEMENT = 'skin-unlock';

// Every skin of a family, the default (the base tool's own texture) first.
export function familySkins(familyId) {
  const f = TOOL_SKINS[familyId];
  if (!f) return [];
  return [{ id: `${familyId}-default`, name: 'Default', texture: null, unlock: { type: 'default' } }, ...f.skins];
}

export function skinById(id) {
  for (const [fam, f] of Object.entries(TOOL_SKINS)) {
    const s = f.skins.find((x) => x.id === id);
    if (s) return { ...s, family: fam, tool: f.tool };
  }
  return null;
}
