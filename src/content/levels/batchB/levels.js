import { makeLevel, S, TINT } from './kit.js';

// Levels 16–50 (Step 8 Batch B). Stage counts were 7–9 / 8–10 / 9–12 by range; the Step 9 logic pass
// removed artificial stages (screws without a reason, polish after paint, rectangle zones), so a few
// levels now have 5–8 stages.
// Scattered dirt (moss) is brushed over a logical zone (whole object / plinth / paving), not
// outlined patch by patch.
// Layer names = scripts/prepare_batch_b.py stack ids (clean is always the bottom, static).

const F = ['foam', 'scrubbed'];

export const BATCH_B_LEVELS = [
  // 16 · Swimming pool — skim the leaves, pump it dry, scrub the tiles, refill with the hose
  makeLevel('swimming-pool', 'Swimming Pool', [
    S.skim('leaves'),
    S.drain('murky', 'water'),
    S.mop(['deck-dirty'], 'deck'),
    S.foam('water'),
    S.poolScrub(['empty-dirty'], 'water'),
    S.rinse([...F, 'empty-dirty'], 'water'),
    S.fill('empty-clean', 'water'),
  ]),
  // 17 · Leather jacket — empty the pockets, dust, foam, scrub, wipe, condition, buff
  makeLevel('leather-jacket', 'Leather Jacket', [
    S.trash('junk'),
    S.dust(),
    S.foam(),
    S.scrub(['dirty']),
    S.wipe([...F, 'dirty']),
    S.mist(['dry'], null, 'condition'),
  ], { init: { dull: 'empty' } }),
  // 18 · Rusty cleaver — laser the rust off the blade, sand the handle, polish, sharpen, varnish
  makeLevel('rusty-cleaver', 'Rusty Cleaver', [
    S.dust(),
    S.laser(['rusty'], 'blade'),
    S.sand(['rusty'], 'handle'),
    S.polish(['bare'], 'blade'),
    S.sharpen(['edge-dull'], 'edge'),
    S.stain(['bare'], 'handle'),
    S.toolReveal('polishing-cloth', ['smudge'], null, 'buff', 110),
  ], { maxLong: 0.92 }),
  // 19 · Toaster — dust, knock the dents out, degrease, mist-rinse, dry, polish the chrome
  makeLevel('toaster', 'Toaster', [
    S.dust(),
    S.hammer('dents'),
    S.foam(),
    S.toolScrub('dish-sponge', ['greasy']),
    S.mist([...F, 'greasy'], null, 'mist-rinse'),
    S.dry(),
    S.buff(['smudge']),
  ]),
  // 20 · Coir doormat — leaves off, beat the dust out, scrape the caked mud, wash, blow dry
  makeLevel('coir-doormat', 'Doormat', [
    S.trash('leaves', { leaves: true }),
    S.beat('beat', 'dusty'),
    S.chunks('crust', { tool: 'heavy-scraper', family: null, seed: 2001, tip: 60 }),
    S.foam(),
    S.scrub(['dirty']),
    S.rinse([...F, 'dirty']),
    S.blow(['wet']),
  ]),
  // 21 · Garden grill — junk out, scrape the carbon, wire-brush the grate, laser the body, wash
  makeLevel('garden-grill', 'Garden Grill', [
    S.trash('junk'),
    S.scrapeCrust(['crust'], 'grate'),
    S.wire(['rusty'], 'grate'),
    S.laser(['rusty'], 'body'),
    S.foam(),
    S.scrub(['grime']),
    S.rinse([...F, 'grime']),
    S.dry(),
  ], { init: { crust: 'full' } }),
  // 22 · Bathtub — toys out, drain, scrub, rinse, dry, polish the chrome, run a fresh bath
  makeLevel('bathtub', 'Bathtub', [
    S.trash('junk'),
    S.drain('murky', 'water'),
    S.foam(),
    S.spinScrub(['empty-dirty']),
    S.rinse([...F, 'empty-dirty']),
    S.squeegee(['wet']),
    S.hint(S.buff(['chrome-dull'], 'chrome')),
    S.fill('empty-clean', 'water'),
  ]),
  // 23 · Retro radio — dust, blow + steam the fabric grille, swab the dial and knobs, sponge the wooden housing
  makeLevel('retro-radio', 'Retro Radio', [
    S.toolReveal('soft-brush', ['dusty'], null, 'soft-brush', 70),
    S.blow(['lint'], 'grille'),
    S.steam(['dirty'], 'grille'),
    S.swab(['dirty'], 'front'),
    S.stain(['dirty'], 'housing', 'sponge'),
  ]),
  // 24 · Stone lion — leaves, chisel the lime crust, brush the moss, wash, blow dry
  makeLevel('stone-lion', 'Stone Lion', [
    S.trash('leaves', { leaves: true }),
    S.chunks('crust', { tool: 'chisel', family: null, seed: 2401, count: 10 }),
    S.toolReveal('stone-brush', ['moss'], null, 'stone-brush', 60),
    S.foam(),
    S.scrub(['dirty']),
    S.rinse([...F, 'dirty']),
    S.blow(['wet']),
  ]),
  // 25 · Wooden dresser — clear the top, dust, sand, wipe, clean the knobs, stain, polish
  makeLevel('wooden-dresser', 'Wooden Dresser', [
    S.trash('junk'),
    S.dust(),
    S.sand(['old'], 'body'),
    S.vacuum(['sawdust'], 'body'),
    S.swab(['old'], 'knobs'),
    S.paint(['sanded'], 'body', TINT.walnut, 'stain'),
  ], { init: { dull: 'empty' } }),
  // 26 · Aquarium — skim, drain, scrub the decor, scrape the glass, rinse, glass cleaner, dust, refill
  makeLevel('aquarium', 'Aquarium', [
    S.skim('leaves'),
    S.drain('murky', 'tank'),
    S.razor(['empty-dirty'], 'tank', 'algae-scrape'),
    S.rinse(['silt'], 'tank'),
    S.mist(['smudge'], 'tank', 'glass-cleaner'),
    S.dust(['dusty'], 'stand'),
    S.fill('empty-clean', 'tank'),
  ]),
  // 27 · Backpack — empty it, beat it, steam the stains, wash, rinse, blow dry, protect
  makeLevel('backpack', 'Backpack', [
    S.trash('junk'),
    S.beat('beat', 'dusty'),
    S.steam(['stains']),
    S.foam(),
    S.toolScrub('upholstery-brush', ['dirty']),
    S.rinse([...F, 'dirty']),
    S.blow(['wet']),
  ], { init: { dull: 'empty' } }),
  // 28 · Kitchen stove — clear it, scrape the burnt crust, steam the grease, foam + scrub, sponge, dry
  makeLevel('kitchen-stove', 'Kitchen Stove', [
    S.trash('junk'),
    S.chunks('crust', { tool: 'razor-scraper', family: null, seed: 2801, count: 10, tip: 60 }),
    S.steam(['greasy']),
    S.foam(),
    S.spinScrub(['grime']),
    S.toolReveal('dish-sponge', [...F, 'grime'], null, 'sponge', 95),
    S.dry(),
  ]),
  // 29 · Lawn mower — clippings, scrape the mud, hammer the deck, laser the rust, wash, polish
  makeLevel('lawn-mower', 'Lawn Mower', [
    S.trash('leaves', { leaves: true }),
    S.chunks('mud', { tool: 'heavy-scraper', family: null, seed: 2901, tip: 60 }),
    S.hammer('dents'),
    S.blast(['rusty']),
    S.foam(),
    S.scrub(['grime']),
    S.rinse([...F, 'grime']),
  ], { init: { dull: 'empty' } }),
  // 30 · Street sign — flyers off, dust, laser the plate, grind the post, repaint, polish, bolts
  makeLevel('street-sign', 'Street Sign', [
    S.trash('junk'),
    S.dust(),
    S.laser(['rusty'], 'plate'),
    S.grind(['rusty'], 'post'),
    S.spray(['bare'], 'plate', TINT.yellow),
    S.screws('bolts', 'install'),
  ], { init: { dull: 'empty' } }),
  // 31 · Table lamp — clear, dust, blow + steam the shade, foam / scrub / wipe the brass, polish
  makeLevel('table-lamp', 'Table Lamp', [
    S.trash('junk'),
    S.dust(),
    S.blow(['lint'], 'shade'),
    S.steam(['tarnished'], 'shade'),
    S.foam('base'),
    S.toolScrub('brass-brush', ['tarnished'], 'base', 60),
    S.wipe([...F, 'tarnished'], 'base'),
    S.polish(['dull'], 'base'),
  ]),
  // 32 · Rowboat — leaves, scrape barnacles, rinse, dry, sand, wipe, roll fresh paint, varnish
  makeLevel('rowboat', 'Rowboat', [
    S.trash('leaves', { leaves: true }),
    S.chunks('barnacles', { tool: 'heavy-scraper', family: null, seed: 3201, tip: 60 }),
    S.rinse(['grime']),
    S.blow(['wet-dirty']),
    S.sand(['dirty']),
    S.mitt(['sawdust'], null, 'wipe'),
    S.roll(['bare'], null, TINT.white),
  ], { init: { dull: 'empty' } }),
  // 33 · Game controller — crumbs, blow the dust out, detail brush the gunk, magic eraser on the grips, cleaner, dry
  makeLevel('game-controller', 'Game Controller', [
    S.trash('junk'),
    S.blow(['dusty', 'lint']),
    S.detail(['gunk']),
    S.eraser(['scuff'], 'grips'),
    S.mist(['dirty']),
    S.dry(),
  ], { init: { dull: 'empty' } }),
  // 34 · Iron gate — leaves, dust, laser the bars, wire-brush the tips, wipe, paint black, gild, polish
  makeLevel('iron-gate', 'Iron Gate', [
    S.trash('leaves', { leaves: true }),
    S.dust(),
    S.blast(['rusty'], 'bars'),
    S.hint(S.wire(['rusty'], 'tips')),
    S.wipe(['grit']),
    S.paint(['bare'], 'bars', TINT.black),
    S.hint(S.spray(['bare'], 'tips', TINT.gold)),
  ], { init: { dull: 'empty' } }),
  // 35 · Sofa — clear the cushions, beat, steam the stains, foam, scrub, mist-rinse, blow dry, freshen
  makeLevel('sofa', 'Sofa', [
    S.trash('junk'),
    S.beat('beat', 'dusty'),
    S.hint(S.steam(['stains'], 'stains')),
    S.foam(),
    S.toolScrub('upholstery-brush', ['stained']),
    S.mist([...F, 'stained'], null, 'mist-rinse'),
    S.blow(['wet']),
  ], { init: { dull: 'empty' } }),
  // 36 · Stone fountain — skim, drain, scrape moss, foam, scrub, rinse, dry, polish the spout, refill
  makeLevel('stone-fountain', 'Stone Fountain', [
    S.skim('leaves'),
    S.drain('murky', 'water'),
    S.toolReveal('stone-brush', ['moss'], null, 'stone-brush', 60),
    S.foam(),
    S.poolScrub(['empty-dirty']),
    S.rinse([...F, 'empty-dirty']),
    S.blow(['wet']),
    S.polish(['spout-dull'], 'spout'),
    S.fill('empty-clean', 'water'),
  ]),
  // 37 · Vintage motorcycle — rags off, rinse the mud, laser the chrome, sand the paint, wash, dry, polish
  makeLevel('vintage-motorcycle', 'Vintage Motorcycle', [
    S.trash('junk'),
    S.rinse(['dirty']),
    S.hint(S.laser(['rusty'], 'chrome')),
    S.sand(['rusty'], 'paint'),
    S.foam(),
    S.washBrush(['grime']),
    S.rinse([...F, 'grime']),
    S.mitt(['wet'], null, 'dry'),
    S.buff(['dull']),
  ]),
  // 38 · Pocket watch — blow, glass cleaner, polish compound, foam, scrub, wipe, swab the chain, buff
  makeLevel('pocket-watch', 'Pocket Watch', [
    S.blow(['dusty']),
    S.mist(['tarnished'], 'glass', 'glass-cleaner'),
    S.toolReveal('polishing-cloth', ['scratch'], 'glass', 'compound', 70),
    S.foam('case'),
    S.scrub(['tarnished'], 'case'),
    S.wipe([...F, 'tarnished'], 'case'),
    S.toolReveal('toothbrush', ['chain-grime'], 'chain', 'toothbrush', 40),
    S.polish(['dull'], 'case'),
  ]),
  // 39 · Upright piano — clear the lid, dust, blow + swab the keys, magic eraser, cleaner, dry, polish
  makeLevel('upright-piano', 'Upright Piano', [
    S.trash('junk'),
    S.dust(),
    S.blow(['lint'], 'keys'),
    S.crevice(['grime'], 'keys'),
    S.eraser(['old'], 'keys'),
    S.mist(['old'], 'body'),
    S.dry(['wet'], 'body'),
  ], { init: { dull: 'empty' } }),
  // 40 · Knight armor — dust, hammer the dents, laser the rust, wash, dry, polish, condition the straps
  makeLevel('knight-armor', 'Knight Armor', [
    S.dust(),
    S.hammer('dents'),
    S.laser(['rusty']),
    S.foam(),
    S.scrub(['grime']),
    S.rinse([...F, 'grime']),
    S.dry(),
    S.buff(['dull'], 'steel'),
    S.hint(S.mist(['straps-dry'], 'straps', 'condition')),
  ]),
  // 41 · Cannon — clear, dust, laser the barrel, grind the rims, sand + wipe the wood, paint, varnish, polish
  makeLevel('cannon', 'Antique Cannon', [
    S.trash('leaves', { leaves: true }),
    S.dust(),
    S.blast(['rusty'], 'barrel'),
    S.hint(S.cupBrush(['rusty'], 'rims')),
    S.sand(['rusty'], 'wood'),
    S.vacuum(['sawdust'], 'wood'),
    S.spray(['bare'], 'iron', TINT.black),
    S.paint(['bare'], 'wood', TINT.brown, 'varnish'),
  ], { init: { dull: 'empty' } }),
  // 42 · Shower cabin — clear, steam off the mould and limescale, foam, scrub, rinse, squeegee the whole cabin
  makeLevel('shower-cabin', 'Shower Cabin', [
    S.trash('junk'),
    S.steam(['mold', 'lime']),
    S.foam(),
    S.spinScrub(['dirty']),
    S.rinse([...F, 'dirty']),
    S.squeegee(['wet']),
  ]),
  // 43 · Bicycle — basket leaves, rinse the mud, wire-brush the rust, wash, dry
  makeLevel('bicycle', 'Bicycle', [
    S.trash('leaves', { leaves: true }),
    S.rinse(['muddy']),
    S.hint(S.cupBrush(['rust'], 'metal')),
    S.foam(),
    S.scrub(['grime']),
    S.rinse([...F, 'grime']),
    S.mitt(['wet'], null, 'dry'),
  ], { init: { dull: 'empty' } }),
  // 44 · Rider statue — leaves, moss, laser the patina, wash the plinth, dry, polish, buff
  makeLevel('rider-statue', 'Rider Statue', [
    S.trash('leaves', { leaves: true }),
    S.toolReveal('stone-brush', ['moss'], 'plinth', 'stone-brush', 60),
    S.laser(['patina'], 'bronze'),
    S.foam('plinth'),
    S.washBrush(['patina'], 'plinth'),
    S.rinse([...F, 'patina'], 'plinth'),
    S.blow(['wet']),
    S.polish(['dull'], 'bronze'),
    S.toolReveal('polishing-cloth', ['haze'], 'bronze', 'buff', 100),
  ]),
  // 45 · Chandelier — cobwebs, dust, steam + mist the crystals, foam / scrub / wipe / swab the brass, polish
  makeLevel('chandelier', 'Chandelier', [
    S.blow(['cobweb']),
    S.dust(['dust']),
    S.steam(['old'], 'crystals'),
    S.mist(['smudge'], 'crystals', 'crystal-shine'),
    S.foam('brass'),
    S.toolScrub('brass-brush', ['old'], 'brass', 60),
    S.wipe([...F, 'old'], 'brass'),
    S.swab(['grime'], 'brass'),
    S.polish(['dull'], 'brass'),
  ]),
  // 46 · Royal throne — clear, dust, beat + steam the velvet, sand, regild, polish, set the gems
  makeLevel('royal-throne', 'Royal Throne', [
    S.trash('junk'),
    S.vacuum(['dusty']),
    S.beat('beat', 'velvet-dust', 'velvet'),
    S.steam(['old'], 'velvet'),
    S.sand(['grime'], 'frame'),
    S.paint(['old'], 'frame', TINT.gold, 'gild'),
    S.gems(),
  ], { init: { dull: 'empty', 'velvet-haze': 'empty' } }),
  // 47 · Stone patio — leaves, moss, foam, scrub, rinse, mop, seal, wire-brush + repaint the bistro set
  makeLevel('stone-patio', 'Stone Patio', [
    S.trash('leaves', { leaves: true }),
    S.toolReveal('stone-brush', ['moss'], 'slabs', 'stone-brush', 60),
    S.foam('slabs'),
    S.spinScrub(['dirty'], 'slabs'),
    S.rinse([...F, 'dirty'], 'slabs'),
    S.mop(['wet'], 'slabs'),
    S.roll(['unsealed'], 'slabs', TINT.gray),
    S.cupBrush(['dirty'], 'furniture'),
    S.spray(['primer'], 'furniture', TINT.white),
  ]),
  // 48 · Carousel horse — clear, dust, wash, scrape the old paint, wipe, paint, gild, polish
  makeLevel('carousel-horse', 'Carousel Horse', [
    S.trash('junk'),
    S.dust(),
    S.foam(),
    S.washBrush(['grime']),
    S.wipe([...F, 'grime']),
    S.chunks('old', { seed: 4801, count: 22 }),
    S.vacuum(['sawdust'], null, 'dust-off'),
    S.paint(['primer'], 'body', TINT.white, 'paint'),
    S.hint(S.paint(['primer'], 'gold', TINT.gold, 'gild')),
  ], { init: { dull: 'empty' } }),
  // 49 · Vintage tractor — straw, hammer, rinse the tyres, laser the body, repaint, wash the tyres, polish
  makeLevel('vintage-tractor', 'Vintage Tractor', [
    S.trash('leaves', { leaves: true }),
    S.rinse(['muddy'], 'tires'),
    S.blast(['muddy'], 'body'),
    S.hammer('dents'),
    S.spray(['bare'], 'body', TINT.red),
    S.foam('tires'),
    S.toolScrub('wheel-brush', ['grime'], 'tires', 80),
    S.rinse([...F, 'grime'], 'tires'),
  ], { init: { dull: 'empty' } }),
  // 50 · Vintage car (finale) — clear, dust, dents, sand, laser the chrome, wipe, paint, polish, shine
  makeLevel('vintage-car', 'Vintage Car', [
    S.trash('junk'),
    S.vacuum(['dusty']),
    S.hammer('dents'),
    S.sand(['dirty'], 'body'),
    S.hint(S.laser(['dirty'], 'chrome')),
    S.mitt(['sawdust'], 'body', 'wipe'),
    S.spray(['primer'], 'body', TINT.turquoise),
    S.hint(S.wipe(['primer'], 'chrome', 'chrome-shine')),
  ], { init: { dull: 'empty' } }),
];
