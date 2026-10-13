// Audio content (Step 9, 2026-10-13). Runtime files: public/assets/audio/ (mono Vorbis, trimmed,
// made by scripts/audio/encode_audio.py from reference/input/Sounds.zip + BackgroundMusic.ogg).
// Only what is referenced below ships. The pack is a cleaning / makeover ASMR set: tools without a
// fitting sound (screwdriver, vacuum) stay silent rather than get a wrong one.

const A = 'assets/audio/';
export const AUDIO_FILES = {
  'sfx-tap': `${A}sfx-tap.ogg`, // put.ogg — short tactile click
  'sfx-success': `${A}sfx-success.ogg`, // Right.ogg — bright "correct" chime
  'sfx-pop': `${A}sfx-pop.ogg`, // Bubble.ogg — soft bubble pop
  'sfx-squeak': `${A}sfx-squeak.ogg`, // GlassWipe.ogg — rubber-on-glass squeak
  'sfx-snip': `${A}sfx-snip.ogg`, // cut.ogg — snip / pluck
  'sfx-crumble': `${A}sfx-crumble.ogg`, // peeling.ogg — crust breaking off
  'loop-brush': `${A}loop-brush.ogg`, // BrushingHair.ogg — bristles
  'loop-softbrush': `${A}loop-softbrush.ogg`, // MakeupBrush.ogg — soft brush / duster
  'loop-lather': `${A}loop-lather.ogg`, // ShampooWash.ogg — wet foamy scrub
  'loop-wipe': `${A}loop-wipe.ogg`, // wipescrub.ogg — cloth rubbing
  'loop-dab': `${A}loop-dab.ogg`, // Cotton.ogg — soft wet dabs (roller / sponge paint)
  'loop-file': `${A}loop-file.ogg`, // Nail-File.ogg — abrasive filing (sanding, grinding)
  'loop-scrape': `${A}loop-scrape.ogg`, // card-friction.ogg — blade scraping
  'loop-water': `${A}loop-water.ogg`, // WaterPoor.ogg — running water
  'loop-spray': `${A}loop-spray.ogg`, // spray.ogg — spray hiss
  'loop-foam': `${A}loop-foam.ogg`, // xitkem.ogg — foam / cream spray
  'loop-laser': `${A}loop-laser.ogg`, // FireCrack.ogg — burning crackle
  'loop-polish': `${A}loop-polish.ogg`, // FaceMassage.ogg — smooth buffing
};
export const MUSIC_FILE = { key: 'music-main', url: `${A}music-main.ogg` }; // BackgroundMusic.ogg

// Mix (one place). Final volume = group volume × per-event gain.
export const MIX = {
  music: 0.3,
  ui: 0.5,
  reward: 0.75,
  loop: 0.42,
  impact: 0.7,
};

// One-shot events: { key, group, gain, rate, minGapMs }
export const SFX = {
  'ui-tap': { key: 'sfx-tap', group: 'ui', gain: 0.9, rate: 1 },
  'ui-pop': { key: 'sfx-pop', group: 'ui', gain: 1, rate: 1 },
  error: { key: 'sfx-tap', group: 'ui', gain: 1, rate: 0.55 },
  'wheel-tick': { key: 'sfx-tap', group: 'ui', gain: 0.45, rate: 1.35, minGapMs: 30 },
  coins: { key: 'sfx-success', group: 'reward', gain: 0.7, rate: 1.3 },
  unlock: { key: 'sfx-success', group: 'reward', gain: 0.85, rate: 1.18 },
  reward: { key: 'sfx-success', group: 'reward', gain: 1, rate: 1.06 },
  'stage-complete': { key: 'sfx-success', group: 'reward', gain: 0.75, rate: 1.12 },
  'level-complete': { key: 'sfx-success', group: 'reward', gain: 1, rate: 0.94 },
  'chest-open': { key: 'sfx-pop', group: 'reward', gain: 1, rate: 0.85 },
  hit: { key: 'sfx-tap', group: 'impact', gain: 1, rate: 0.62, minGapMs: 70 },
  'chisel-hit': { key: 'sfx-tap', group: 'impact', gain: 0.8, rate: 0.8, minGapMs: 110 },
  'chunk-fall': { key: 'sfx-crumble', group: 'impact', gain: 0.75, rate: 1.1, minGapMs: 90 },
  snip: { key: 'sfx-snip', group: 'impact', gain: 1.4, rate: 1 },
  place: { key: 'sfx-pop', group: 'impact', gain: 0.9, rate: 1 },
  squeak: { key: 'sfx-squeak', group: 'loop', gain: 0.8, rate: 1, minGapMs: 320 },
};

// Tool → working sound. { loop, rate, gain } = a sustained loop while the tool really works (gains
// even out the source loudness: measured RMS foam 0.07, water 0.05, polish 0.04 vs ~0.13 for most);
// { pulse } = a one-shot repeated (throttled) while working (squeegee squeak); { hit } = one-shot per
// strike; null = silent. Foam scrubbing (brush stage in `scrub` mode) uses the lather loop.
const L = (loop, rate = 1, gain = 1) => ({ loop, rate, gain });
const GROUPS = [
  [['foam-sprayer', 'foam-can', 'foam-gun', 'foam-cannon'], L('loop-foam', 1, 1.8)],
  [['washer-lance', 'turbo-lance', 'gold-washer', 'hose', 'pump'], L('loop-water', 1, 2.1)],
  [['spray-bottle', 'mist-nozzle', 'spray-gun', 'airbrush', 'gold-spray-gun'], L('loop-spray')],
  [['steam-cleaner'], L('loop-spray', 0.72, 0.9)],
  [['air-blower'], L('loop-spray', 0.58, 0.85)],
  [['sandblaster'], L('loop-spray', 1.25, 0.9)],
  [['laser'], L('loop-laser', 1, 0.65)],
  [['scrub-brush', 'scrub-brush-oval', 'detail-brush', 'detail-toothbrush', 'detail-crevice', 'toothbrush', 'crevice-brush', 'deck-brush', 'pool-brush', 'wheel-brush', 'stone-brush', 'upholstery-brush', 'brass-brush', 'telescopic-brush'], L('loop-brush')],
  [['drill-brush', 'spin-scrubber'], L('loop-brush', 1.25)],
  [['dry-brush', 'duster', 'soft-brush', 'paint-brush'], L('loop-softbrush', 1, 1.2)],
  [['cloth', 'wipe-sponge', 'wipe-eraser', 'eraser', 'dish-sponge', 'wash-mitt', 'microfiber-mitt', 'wool-mitt', 'mop', 'polishing-cloth'], L('loop-wipe', 1, 0.8)],
  [['paint-roller', 'wide-roller', 'foam-roller', 'stain-sponge', 'cotton-swab'], L('loop-dab', 1, 0.85)],
  [['sandpaper', 'sanding-block', 'steel-wool', 'rust-steel-wool', 'wire-brush', 'whetstone'], L('loop-file')],
  [['orbital-sander'], L('loop-file', 1.3)],
  [['angle-grinder', 'grind-sander', 'gold-grinder', 'wire-wheel', 'cup-brush'], L('loop-file', 1.5, 1.05)],
  [['wide-scraper', 'scrape-putty-knife', 'pro-scraper', 'putty-knife', 'razor-scraper', 'heavy-scraper'], L('loop-scrape')],
  [['polisher', 'orbital-polisher', 'gold-polisher', 'rotary-buffer'], L('loop-polish', 1, 2.3)],
  [['skimmer-net'], L('loop-water', 0.8, 1.3)],
  [['squeegee'], { pulse: 'squeak' }],
  [['hammer', 'mallet', 'gold-hammer', 'carpet-beater'], { hit: 'hit' }],
  [['chisel'], { hit: 'chisel-hit' }],
];
const TOOL_SOUND = {};
for (const [ids, spec] of GROUPS) for (const id of ids) TOOL_SOUND[id] = spec;

export function toolSound(tool, stage) {
  const id = tool?.visualOf ?? tool?.id;
  const spec = TOOL_SOUND[id] ?? null;
  if (spec?.loop === 'loop-brush' && stage?.params?.mode === 'scrub') return L('loop-lather', spec.rate, spec.gain);
  return spec;
}
