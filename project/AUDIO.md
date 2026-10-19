# Audio (Step 9, 2026-10-13)

Sources (kept as records, never shipped): `reference/input/music-main.ogg` (music since 2026-10-19; before: `BackgroundMusic.ogg`), `reference/input/Sounds.zip` (22 mono clips; a makeover / cleaning ASMR pack).
Runtime files: `public/assets/audio/` (19 files, 755,493 bytes), produced by `scripts/audio/encode_audio.py` (trim to the active part, 25 ms loop fades / 4–40 ms shot fades, peak −1 dBFS, mono Vorbis 22.05 kHz q1; music mono 32 kHz q0). Mapping and mix: `src/content/audio.js`; playback rules: `src/services/AudioService.js`.

Sound identification was done from the file names and a signal analysis (duration, loudness, brightness, continuous vs. separate hits). Nobody listened to the files, so the mapping still needs a listening check.

## Used

| Runtime file | Source | Used for |
|---|---|---|
| music-main | music-main.ogg (90 s, new track 2026-10-19; Opus stereo 48 kHz → Vorbis mono 24 kHz q0, +5.5 dB to the previous level, 325 KB) | one looping track for menu, levels, Store, Wheel |
| sfx-tap | put.ogg | button taps; pitched down: error / insufficient, hammer / beater hits, chisel hits; pitched up: Wheel ticks |
| sfx-success | Right.ogg | stage complete, level complete, coins, unlocks, Wheel / chest rewards (different pitch per event) |
| sfx-pop | Bubble.ogg | popup open (Wheel), level chest offer, part placed / item dropped |
| sfx-squeak | GlassWipe.ogg | squeegee (pulsed while working) |
| sfx-snip | cut.ogg | part pulled / removed (keycaps, nails, screws out) |
| sfx-crumble | peeling.ogg | crust chunk breaking off (chisel stages) |
| loop-brush | BrushingHair.ogg | bristle brushes (scrub, detail, deck, pool, wheel, stone…); drill / spin scrubber faster |
| loop-softbrush | MakeupBrush.ogg | duster, dry / soft brush, paint brush |
| loop-lather | ShampooWash.ogg | brush scrubbing in foam (`scrub` stages) |
| loop-wipe | wipescrub.ogg | cloth, sponges, mitts, mop, polishing cloth (subtle) |
| loop-dab | Cotton.ogg | rollers, stain sponge, cotton swab |
| loop-file | Nail-File.ogg | sandpaper, sanding block, steel wool, wire brush, whetstone; orbital sander / grinders / wire wheel at a higher rate |
| loop-scrape | card-friction.ogg | scrapers, putty knives, razor |
| loop-water | WaterPoor.ogg | pressure washers, hose, pump, skimmer |
| loop-spray | spray.ogg | spray bottle, mist, spray gun, airbrush; steam cleaner (lower), air blower (much lower), sandblaster (higher) |
| loop-foam | xitkem.ogg | foam sprayer, foam can / gun / cannon |
| loop-laser | FireCrack.ogg | laser cleaner (burning crackle) |
| loop-polish | FaceMassage.ogg | polishers, rotary buffer |

## Not used

| Source | Why |
|---|---|
| lipstick.ogg | almost silent (peak 0.29, RMS 0.001) |
| pencil.ogg | very quiet thin scratch, nothing it fits |
| Towel.ogg | sparse; duplicates the wipe loop (wipescrub is denser) |
| MakeupTap.ogg | soft taps; too weak for a hammer, nothing else needs it |

Deliberately silent (no fitting sound in the pack): screwdrivers (no ratchet), wet/dry vacuum (no suction), keycap puller while held (the removal plays the snip).

## Mix (`MIX` in `src/content/audio.js`)

music 0.30 · UI 0.50 · rewards 0.75 · tool loops 0.42 (× per-tool gain evening out source loudness) · impacts 0.70.

## Known limitations

- The music track gets quieter toward its end. The loop is click-free (sample-continuous), but its restart is audible as a phrase restart.
- Runtime audio is Ogg Vorbis only (as requested). Older iOS Safari versions may not play Ogg.

## Audio polish (2026-10-15, build #141)

New source files (in `reference/input/`): `WaterSound.mp3`, `Painting.mp3`, `laser_zjsudyn_.mp3`, `Win.mp3`, `salamisound-8612318-aerosol-spray-hair-spray.mp3`. All runtime files are rebuilt with `scripts/audio/encode_audio.py`. Loops now use the most continuous window of the source and are loudness-normalised (RMS 0.12 with a soft limiter).

| Was | Now | Where |
|---|---|---|
| Right.ogg as the general success sound (stage complete, level complete, coins, unlocks, rewards) | Right.ogg = **sfx-wow** (a voice) only as a rare level-complete celebration; **Win.mp3** = level complete and Wheel reward; **Win.mp3 first 0.45 s** = chime for stage complete, coins, unlocks | completion / rewards |
| WaterPoor.ogg | **WaterSound.mp3** | washers, hose, pump, skimmer |
| Cotton.ogg (rollers, stain sponge) and MakeupBrush (paint brush) | **Painting.mp3** | paint brush, rollers, stain sponge |
| FireCrack.ogg | **laser_zjsudyn_.mp3** | laser |
| spray.ogg (spray gun, airbrush) and xitkem (foam can) | **aerosol spray** | spray paint guns, aerosol foam can |
| — | spray.ogg kept | spray bottle, mist, steam, blower, sandblaster (pump hiss fits better than an aerosol can) |
| — | xitkem kept | foam sprayer / gun / cannon |

No longer shipped: WaterPoor, Cotton, FireCrack. The cotton swab now uses the wipe loop.

**WOW:** `WOW` in `src/content/audio.js` — chance 0.25 per level completion, and never within the next 2 completions. That is about 1 completion in 6 (≈17 %, unit-tested over 3000 completions). The win jingle always plays.

**Mix (`MIX`):** music 0.16 · UI 0.30 · rewards 0.40 · tool loops 0.24 · impacts 0.36 · wow 0.50. The previous values were 0.30 / 0.50 / 0.75 / 0.42 / 0.70.

Runtime audio: 22 files, 791,182 bytes.

## Celebration policy (2026-10-15, build #142)

`CELEBRATION` in `src/content/audio.js` holds all the numbers. Routine successes stay quiet; strong sounds are for real moments.

- **Stage complete:** a short chime on 25 % of stages, otherwise silent.
- **Level complete:** always one clip, picked at random from three variants (Win.mp3, Win.mp3 slightly higher, the short chime), never the same one twice in a row. The voiced "wow" plays at a 15 % chance per completion and never within the next 3 completions, which is about 1 completion in 10.
- **Big rewards** (win jingle):
  - a Wheel prize of ≥ 300 coins, ≥ 25 diamonds, or the tool;
  - the full level chest.
- **Subtle soft pop, no victory sound:**
  - coin pickups and coin flights;
  - Store grants and bundle claims;
  - level / tool / VIP unlocks;
  - ordinary Wheel prizes.
