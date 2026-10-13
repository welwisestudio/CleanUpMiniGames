# Audio (Step 9, 2026-10-13)

Sources (kept as records, never shipped): `reference/input/BackgroundMusic.ogg`, `reference/input/Sounds.zip` (22 mono clips; a makeover / cleaning ASMR pack).
Runtime files: `public/assets/audio/` (19 files, 755,493 bytes), produced by `scripts/audio/encode_audio.py` (trim to the active part, 25 ms loop fades / 4–40 ms shot fades, peak −1 dBFS, mono Vorbis 22.05 kHz q1; music mono 32 kHz q0). Mapping and mix: `src/content/audio.js`; playback rules: `src/services/AudioService.js`.

Sound identification was done from the file names and a signal analysis (duration, loudness, brightness, continuous vs. separate hits). Nobody listened to the files, so the mapping still needs a listening check.

## Used

| Runtime file | Source | Used for |
|---|---|---|
| music-main | BackgroundMusic.ogg (111 s) | one looping track for menu, levels, Store, Wheel |
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
