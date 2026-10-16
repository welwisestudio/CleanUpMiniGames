// Audio content (Step 9, 2026-10-13; audio polish 2026-10-15). Runtime files: public/assets/audio/
// (mono Vorbis, trimmed, loops loudness-normalised) made by scripts/audio/encode_audio.py from
// reference/input/Sounds.zip + BackgroundMusic.ogg + the 2026-10-15 files (WaterSound, Painting,
// laser, aerosol spray, Win).
// Only what is referenced below ships. The pack is a cleaning / makeover ASMR set: tools without a
// fitting sound (screwdriver, vacuum) stay silent rather than get a wrong one.

const A = 'assets/audio/';
export const AUDIO_FILES = {
  'sfx-tap': `${A}sfx-tap.ogg`, // put.ogg — short tactile click
  'sfx-wow': `${A}sfx-wow.ogg`, // Right.ogg — voiced "wow": the rare, strongest celebration (CELEBRATION.wow)
  'sfx-win': `${A}sfx-win.ogg`, // Win.mp3 — win jingle: level complete, big rewards
  'sfx-chime': `${A}sfx-chime.ogg`, // Win.mp3 (first 0.45 s) — short chime: stage complete, coins, unlocks
  'sfx-pop': `${A}sfx-pop.ogg`, // Bubble.ogg — soft bubble pop
  'sfx-squeak': `${A}sfx-squeak.ogg`, // GlassWipe.ogg — rubber-on-glass squeak
  'sfx-snip': `${A}sfx-snip.ogg`, // cut.ogg — snip / pluck
  'sfx-crumble': `${A}sfx-crumble.ogg`, // peeling.ogg — crust breaking off
  'loop-brush': `${A}loop-brush.ogg`, // BrushingHair.ogg — bristles
  'loop-softbrush': `${A}loop-softbrush.ogg`, // MakeupBrush.ogg — soft brush / duster
  'loop-lather': `${A}loop-lather.ogg`, // ShampooWash.ogg — wet foamy scrub
  'loop-wipe': `${A}loop-wipe.ogg`, // wipescrub.ogg — cloth rubbing
  'loop-paint': `${A}loop-paint.ogg`, // Painting.mp3 — brush / roller painting strokes
  'loop-file': `${A}loop-file.ogg`, // Nail-File.ogg — abrasive filing (sanding, grinding)
  'loop-scrape': `${A}loop-scrape.ogg`, // card-friction.ogg — blade scraping
  'loop-water': `${A}loop-water.ogg`, // WaterSound.mp3 — water jet / splashing
  'loop-spray': `${A}loop-spray.ogg`, // spray.ogg — pump-spray hiss
  'loop-aerosol': `${A}loop-aerosol.ogg`, // aerosol-spray-hair-spray.mp3 — aerosol can hiss
  'loop-foam': `${A}loop-foam.ogg`, // xitkem.ogg — foam / cream spray
  'loop-laser': `${A}loop-laser.ogg`, // laser_zjsudyn_.mp3 — electronic laser hum
  'loop-polish': `${A}loop-polish.ogg`, // FaceMassage.ogg — smooth buffing
};
export const MUSIC_FILE = { key: 'music-main', url: `${A}music-main.ogg` }; // BackgroundMusic.ogg

// Mix (one place). Final volume = group volume × per-event gain (≤ 1). Polish 2026-10-15: the whole
// mix is lower; music sits well below the effects; tool loops subtle; the wow voice clearly audible.
export const MIX = {
  music: 0.16,
  ui: 0.3,
  reward: 0.4,
  loop: 0.24,
  impact: 0.36,
  wow: 0.5,
};

// Celebration policy (2026-10-15: calmer, less repetitive). Routine successes stay quiet; the
// stronger sounds are reserved for real moments.
// - stage complete: a short chime only on `stageChimeChance` of stages, otherwise silent (the bar
//   and the stage effects already give feedback);
// - level complete: ALWAYS one completion clip, picked at random from `levelClips`, never the same
//   clip twice in a row;
// - the voiced "wow" (the strongest celebration): `wow.chance` per level completion and never
//   within the next `wow.minCompletionsBetween` completions → about 1 completion in 10;
// - rewards: only a BIG one (Wheel jackpot over the thresholds, the tool prize, the full level
//   chest) gets the win jingle; coins, unlocks and ordinary rewards get a soft pop.
export const CELEBRATION = {
  stageChimeChance: 0.25,
  levelClips: [
    { key: 'sfx-win', rate: 1, gain: 1 },
    { key: 'sfx-win', rate: 1.1, gain: 0.95 },
    { key: 'sfx-chime', rate: 0.9, gain: 1 },
  ],
  wow: { chance: 0.15, minCompletionsBetween: 3, delayMs: 380 },
  bigReward: { coins: 300, gems: 25, tool: true },
};

// One-shot events: { key, group, gain, rate, minGapMs }
export const SFX = {
  'ui-tap': { key: 'sfx-tap', group: 'ui', gain: 0.9, rate: 1 },
  'ui-pop': { key: 'sfx-pop', group: 'ui', gain: 1, rate: 1 },
  error: { key: 'sfx-tap', group: 'ui', gain: 1, rate: 0.55 },
  'wheel-tick': { key: 'sfx-tap', group: 'ui', gain: 0.45, rate: 1.35, minGapMs: 30 },
  // routine successes: subtle (no victory sound)
  coins: { key: 'sfx-pop', group: 'ui', gain: 0.5, rate: 1.25 },
  unlock: { key: 'sfx-pop', group: 'ui', gain: 0.75, rate: 1.05 },
  reward: { key: 'sfx-pop', group: 'ui', gain: 0.85, rate: 0.95 },
  // celebrations (CELEBRATION policy)
  'stage-chime': { key: 'sfx-chime', group: 'reward', gain: 0.75, rate: 1 },
  'reward-big': { key: 'sfx-win', group: 'reward', gain: 0.9, rate: 1.05 },
  wow: { key: 'sfx-wow', group: 'wow', gain: 1, rate: 1, minGapMs: 3000 },
  'chest-open': { key: 'sfx-pop', group: 'reward', gain: 1, rate: 0.85 },
  hit: { key: 'sfx-tap', group: 'impact', gain: 1, rate: 0.62, minGapMs: 70 },
  'chisel-hit': { key: 'sfx-tap', group: 'impact', gain: 0.8, rate: 0.8, minGapMs: 110 },
  'chunk-fall': { key: 'sfx-crumble', group: 'impact', gain: 0.75, rate: 1.1, minGapMs: 90 },
  snip: { key: 'sfx-snip', group: 'impact', gain: 1.4, rate: 1 },
  place: { key: 'sfx-pop', group: 'impact', gain: 0.9, rate: 1 },
  squeak: { key: 'sfx-squeak', group: 'loop', gain: 0.8, rate: 1, minGapMs: 320 },
};

// Tool → working sound. { loop, rate, gain } = a sustained loop while the tool really works (loops
// are loudness-normalised at encode time, so gains only shape the character);
// { pulse } = a one-shot repeated (throttled) while working (squeegee squeak); { hit } = one-shot per
// strike; null = silent. Foam scrubbing (brush stage in `scrub` mode) uses the lather loop.
const L = (loop, rate = 1, gain = 1) => ({ loop, rate, gain });
const GROUPS = [
  [['foam-sprayer', 'foam-gun', 'foam-cannon'], L('loop-foam')],
  [['foam-can'], L('loop-aerosol', 1, 0.9)], // an aerosol can
  [['washer-lance', 'turbo-lance', 'gold-washer', 'hose', 'pump'], L('loop-water')],
  [['spray-bottle', 'mist-nozzle'], L('loop-spray')],
  [['spray-gun', 'airbrush', 'gold-spray-gun'], L('loop-aerosol')], // spray paint
  [['steam-cleaner'], L('loop-spray', 0.72, 0.9)],
  [['air-blower'], L('loop-spray', 0.58, 0.85)],
  [['sandblaster'], L('loop-spray', 1.25, 0.9)],
  [['laser'], L('loop-laser')],
  [['scrub-brush', 'scrub-brush-oval', 'detail-brush', 'detail-toothbrush', 'detail-crevice', 'toothbrush', 'crevice-brush', 'deck-brush', 'pool-brush', 'wheel-brush', 'stone-brush', 'upholstery-brush', 'brass-brush', 'telescopic-brush'], L('loop-brush')],
  [['drill-brush', 'spin-scrubber'], L('loop-brush', 1.25)],
  [['dry-brush', 'duster', 'soft-brush'], L('loop-softbrush')],
  [['paint-brush'], L('loop-paint')],
  [['cloth', 'wipe-sponge', 'wipe-eraser', 'eraser', 'dish-sponge', 'wash-mitt', 'microfiber-mitt', 'wool-mitt', 'mop', 'polishing-cloth'], L('loop-wipe', 1, 0.8)],
  [['cotton-swab'], L('loop-wipe', 1.15, 0.6)],
  [['paint-roller', 'wide-roller', 'foam-roller', 'stain-sponge'], L('loop-paint', 0.9)],
  [['sandpaper', 'sanding-block', 'steel-wool', 'rust-steel-wool', 'wire-brush', 'whetstone'], L('loop-file')],
  [['orbital-sander'], L('loop-file', 1.3)],
  [['angle-grinder', 'grind-sander', 'gold-grinder', 'wire-wheel', 'cup-brush'], L('loop-file', 1.5, 1.05)],
  [['wide-scraper', 'scrape-putty-knife', 'pro-scraper', 'putty-knife', 'razor-scraper', 'heavy-scraper'], L('loop-scrape')],
  [['polisher', 'orbital-polisher', 'gold-polisher', 'rotary-buffer'], L('loop-polish', 1, 1.1)],
  [['skimmer-net'], L('loop-water', 0.85, 0.7)],
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
