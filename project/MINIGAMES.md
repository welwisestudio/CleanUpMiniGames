# Post-cleaning minigames (27 games: 4 polished on 2026-10-15 + 23 added on 2026-10-16, build #162)

After the last cleaning stage, the cleaned object flies from where it was cleaned into a short themed minigame (about 8–12 s), shown over the level's own backdrop. Then the normal completion flow continues: sound, confetti, Completed card and reward. The level reward is granted before the minigame starts, so the minigame never changes rewards. Win, fail and Skip all continue the same way.

Code: `src/minigames/` — `MiniGameScene.js` (shell: backdrop, title / hint / pips, Skip, fly-in, result banner, shared FX: `ring`, `burst`, `puffs`, `flash`, `shake`), `registry.js`, `games/*.js`.
QA shortcut (dev build only): `/?qa=1&minigame=<level-id>`.

| Level | Minigame | Control | Win / fail |
|---|---|---|---|
| Soccer Ball | Penalty Kick on the level's stadium backdrop (the goal opening is mapped from the art); a goalkeeper who shuffles, reacts after ~0.12 s and dives with limited reach | pull back from the ball (dotted aim line + coloured power arrow), release | 3 shots, 2 goals win; corners score, shots at the keeper are saved |
| Rusty Cleaver | Cleaver Throw into a real log in the workshop | tap | 4 stuck cleavers win; 2 CLANGs (hitting a stuck cleaver) = fail. Speed 95 → 115 → 135 → 150 °/s, direction flips |
| Antique Cannon | Cannon Blast on the lake shore: barrels bob on the water; a crosshair glides over the water with a dotted arc — the ball lands exactly there | tap | 3 barrels with 5 balls |
| Upright Piano | Piano Notes: glossy notes fall down 3 lanes onto rings on the piano's keyboard; each hit plays the next melody note | tap a ring / lane | 6 of 9 notes; window ±110 units, PERFECT within ±40 |

## Art (2026-10-15)

Nano Banana 2 (`nano_banana_2`, 1k; the jobs report the backend model name `nano_banana_flash`) plus Higgsfield Background Remover. 5 images at 1.5 credits each, plus 5 background removals. Encoded to `public/assets/minigames/`, 74 KB in total.

| File | Generation job | Background removal job |
|---|---|---|
| mg-keeper.webp | 3cfa3163-a10d-4df1-a552-263738637abf | 4910ed13-ffb3-4e26-8e12-bc79bf59f278 |
| mg-log.webp | 9bf688dc-8037-491d-ba92-4194d08689c5 | c9743c46-5d5d-4667-b628-06df499d08ef |
| mg-target.webp | 41ac7d30-3f9a-4100-9cf5-9090e30e1f09 | 6356c7b7-8a73-499c-b9ae-abd505eb2f31 |
| mg-smoke.webp | abc824bb-13b9-4fe0-8f95-9fc8652b551e | 14d85937-02c9-4bc1-8d6e-dab6b7705a8a |
| mg-note.webp | d6339fae-c64d-4a56-a58a-31bb1d3eace8 | 0d84be61-2b26-446f-99c1-9d6878d01457 |

Backdrops reuse the levels' own scene images (pitch, workshop, shore, VIP hall), which are already shipped, so they cost no extra bytes. The cannon boom and the piano notes are synthesized with WebAudio, so no audio files were added.

Tests: `tests/e2e/step20-minigames.spec.js` (win / fail / skip of each game, plus the real hand-off on the Soccer Ball level).


## Expansion: 23 new minigames (2026-10-16, build #162)

The plan was approved with two changes: Bathroom Sink gets no minigame (Garden Grill → Grill Master instead), and Swimming Pool is **Pool Shot**, not a dive. The four existing games are unchanged. Every game: about 5–15 s, phone-first (big targets, forgiving windows, nothing near the screen edges), Skip always available, and doing nothing always ends in a loss (time limit or missed items). The level reward is still granted before the minigame and never changes.

### Shared systems — `src/minigames/systems/kit.js`

| System | What it provides | Used by |
|---|---|---|
| `BaseGame` | layout helpers (hero box, play field), time limit + shell timer bar, `end()`, hero bounce, QA bot hints | all 23 |
| Timing — `Meter`, `drawBar`, `drawArcMeter` | marker sweeping (or looping) over a zone; `judge()` → perfect / good / miss | Pancake Flip, Grill Master (one bar per sausage), Stop the Clock (loop), Brass Ring Grab (moving target), Tune In |
| Rhythm — `Rhythm` | spawn / fall / judge along lanes (generalised from Piano Notes) | Crystal Chimes |
| Memory — `Sequence`, `shuffledPairs` | Simon sequences with rounds; card pairs | Simon Buttons, Tool Memory |
| Tap Targets — `Targets` | spawned targets with a lifetime and a generous hit radius | Key Rush, Bubble Pop, Shield Block, Feed the Fish, Bloom the Garden (hold) |
| Aim / Throw — `Swipe`, `arcPoint`, `drawGuide` | swipe / pull-back vectors, arc flights, a dotted guide that shows the landing spot | Flower Toss, Pool Shot, Wishing Coins |
| Catch — `Catcher` | smoothed follow-the-pointer (drag on touch, move on desktop) | Fruit Catch, Toast Catch, Bloom the Garden (can) |
| Runner / Drive — `Lanes`, `Jumper`, `Strip` | three-lane switching, a floaty one-button jump, a scrolling ground strip | Puddle Run, Balloon Breeze (hold-to-lift), Mow Dash, Highway Ride, Sunday Drive (`games/DriveGame.js`) |

Shell additions (`MiniGameScene.js`): per-game sprite preload (`sprites` / `assets` in the registry, so a minigame loads only its own art), a remaining-time bar under the pips (`setTime`). AudioService: `noise()` (splash, sizzle, whoosh, static) and `bell()` (glass chimes), both synthesized — no new audio files, same gates as every effect (Sound setting, platform mute, pauses).

### The 23 games

| # | Level | Minigame | System | Control | Win |
|---|---|---|---|---|---|
| A1 | Frying Pan | Pancake Flip | Timing | tap in the green | 3 of 5 flips (left alone, the pancake burns) |
| A2 | Toolbox | Tool Memory | Memory (pairs) | tap cards | 3 pairs in 20 s, at most 4 wrong pairs |
| A3 | Keyboard | Key Rush | Tap Targets | tap popped-up keycaps | 8 of 12 |
| A4 | Garden Grill | Grill Master | Timing ×3 | tap a sausage when its bar is green | 4 of 6 (too early = keeps cooking, too late = burnt) |
| A5 | Bathtub | Bubble Pop | Tap Targets | tap bubbles (duck = 3) | 15 points in 11 s |
| A6 | Game Controller | Simon Buttons | Memory (sequence) | repeat the lights | rounds 3 → 4 → 5, 2 lives |
| A7 | Pocket Watch | Stop the Clock | Timing (loop) | tap to stop the hand on the arc | 3 of 4 |
| A8 | Chandelier | Crystal Chimes | Rhythm | tap a ring when its crystal arrives | 7 of 10 |
| A9 | Carousel Horse | Brass Ring Grab | Timing (moving target) | tap when a ring is in the circle | 4 of 6 |
| B1 | Wooden Crate | Fruit Catch | Catch | slide the crate | 7 of 10 apples |
| B2 | Watering Can | Bloom the Garden | Hold over targets | hold + move the can | 4 pots in 12 s |
| B3 | Porcelain Vase | Flower Toss | Throw | swipe up (moving vase) | 3 of 5 roses, 15 s |
| B4 | Swimming Pool | Pool Shot | Aim / Throw | pull back + release; the guide shows the landing | 2 rings with 3 balls |
| B5 | Toaster | Toast Catch | Catch | slide the plate (landing glow) | 5 of 7 slices |
| B6 | Retro Radio | Tune In | Timing | tap when the needle is on the station | 3 of 4 |
| B7 | Aquarium | Feed the Fish | Tap a spot | tap the water to drop food | 3 fish × 2 flakes in 14 s |
| B8 | Stone Fountain | Wishing Coins | Throw | flick a coin into the drifting spot | 3 of 5 coins |
| C1 | Sneaker | Puddle Run | Runner (jump) | tap to jump | 7 puddles, 3 splashes lose |
| C2 | Desk Fan | Balloon Breeze | Runner (hold-to-lift) | hold to blow | 6 of 9 coins |
| C3 | Lawn Mower | Mow Dash | Drive (lanes) | tap above / below the mower | 8 tufts in 14 s, 2 lives |
| C4 | Vintage Motorcycle | Highway Ride | Drive (lanes) | tap above / below | survive 11 s, 3 lives |
| C5 | Knight Armor | Shield Block | Tap Targets (left / right reaction) | tap the arrow's side | 8 arrows, 3 hits lose |
| C6 | Vintage Car | Sunday Drive | Drive (lanes) | tap above / below | 6 coins in 14 s, 2 lives |

Drive fairness: every wave leaves a free lane next to the player's lane, a short blink of safety after a hit, and at least about 1 s to react on a phone.

### Art (2026-10-16)

Nano Banana 2 (`nano_banana_2`, 1k, standard; the jobs report the backend `nano_banana_flash`) plus Higgsfield Background Remover (MCP `remove_background`, model `image_background_remover`). Processing: trimmed to the alpha bounds, max 256 px (arrow 320, ground strips 768 wide), WebP q72–82 (trim + resize + encode only, no colour changes). 23 new files, **281 KB**; all minigame art together is **355 KB**.

| File | Generation job | Background removal job |
|---|---|---|
| mg-pancake | 05227e2c-6e67-46b9-b0c7-4f5bee41a1b9 | 8a173816-d44b-4911-9a58-8e5dfab752d5 |
| mg-sausage | 29ca2561-19d6-4441-abe6-ced18ef71548 | cf099f0e-98bf-4c0e-9d37-21eef4c8a58e |
| mg-bubble | 45483a67-bba0-4c2f-9470-0e45f989a592 | — (generated on black, drawn with additive blending) |
| mg-duck | e48c19d2-664a-48ea-bfa1-419f69440673 | 550ded90-410a-45cf-9642-78f4e7c51449 |
| mg-crystal | fe122c98-34dd-42fa-8667-f9db310e3270 | d0242fa2-0ea8-4039-a71e-a1a863fd0a80 |
| mg-apple | c15cc633-ca28-477a-a8a7-7f9061bcad11 | 501ba393-3ce5-4826-9d74-5b82c7842731 |
| mg-pot | 33f37bd5-8aca-4819-a7e4-ca804d9277cd | 1cffbbb4-dfc3-4205-b56d-fad6c68995fc |
| mg-rose | 61865320-1b8b-4162-81ef-1e5106d0467f | a2d282c7-4050-41ab-bf8c-f140bf6c06a4 |
| mg-swimring | 7fd51343-9fd1-4322-a740-5128e0bbff33 | fe2e9bb4-106d-49d2-b66c-5928af94a365 |
| mg-beachball | 6b457a65-a0dc-4c6f-b476-a21b464b4fd6 | ff062c57-cf69-45e7-bb7c-1cb55dd07030 |
| mg-toast | 5cd5d950-d3b0-45bc-b448-45168db9b945 | ca47bd83-4a48-40b6-b0e9-d0cb9d7f1188 |
| mg-plate | 4403ebf3-1bff-4516-b7e2-ec6c8dd9208b | 8a62afaf-d48a-4e40-8e84-49f42f42806a |
| mg-fish | 1c8436d9-634e-4bc7-8320-a6719fb597fb | 7447a063-5d56-4c18-b072-db9c96888fcd |
| mg-puddle | 06629d8b-92e5-4ab2-abdd-62117bc26e93 | ca261bce-d1e9-402f-a192-3067668ad0eb |
| mg-cone | 15ac9888-a551-47fa-8f5a-7e29475afb02 | 052406ef-9616-474e-8b3a-826cf89e979f |
| mg-balloon | 2eff3779-5f4b-4776-95a0-5f955cf7b030 | 336be904-f333-4eeb-a0ac-68dd19e3b5bc (the thin string was lost in the cut-out; it is drawn in code) |
| mg-gnome | 796f1934-0312-4ce7-8168-8b46e36d945c | 807a1153-5122-4ab6-b07f-891f5c6802b7 |
| mg-grass | a57b9734-4043-487b-a909-541faf931e66 | c25537b6-ad43-4bdd-a758-d388ee977278 |
| mg-barrier | d13e6c91-b503-49b7-8e2c-41f00c562c9a | f27655eb-57a2-4e09-9859-13ebda6dd7b7 |
| mg-hay | b2314763-65d4-48e9-a638-3c2c1c706dea | c7f259da-c3cb-43a5-97da-a9cf4fddb90b |
| mg-arrow | ad2ed838-8ae5-41f2-bb8a-e9a6acfb3cd4 (requested 4:1, generated 21:9) | 71437861-a644-4f8c-9828-012d5b671b27 |
| mg-road | 5da6a879-e0d6-4ad0-a11a-b373d955a2f8 | — (ground strip; the top 20 % with sky cropped off) |
| mg-lawn | d6b914ab-266e-4644-8f29-d3b8086baa13 | — (ground strip; the top 13 % with sky cropped off) |

Prompt pattern (props): "Game asset: one <object>, <details>. Glossy stylized 3D render like a polished mobile game, soft studio lighting. Isolated on a plain pure white background, centered, no shadow, no text." (bubble / crystal / plate on black). Ground strips: "Game background texture: a seamless horizontally tiling strip of … Fills the whole frame, no text." The full prompts are kept in the Higgsfield job records.

**Brass ring: not generated.** Four Nano Banana 2 attempts did not produce it: jobs 98d0f8fe…, cea90d6d… and 1bb068b4… failed, and e3456d29… was flagged by the generator's content filter (a false positive). No other model was used. Instead, the ring is made at runtime from the game's existing gold coin art (`icon-coin`): the centre is cut out and a bright inner rim is added (`BrassRingGrabGame.js`). It matches the coin style and adds no file.

Reused art (no new bytes): each level's own backdrop, the cleaned object (hero), tool sprites (Tool Memory), `icon-coin` (Wishing Coins, Balloon Breeze, Highway Ride, Sunday Drive, the ring), `mg-note` (Tune In), `mg-smoke`, `fx-sparkle`, `fx-drop-1`, `fx-dot`.

### Audio

No new files. Material sounds use the existing SFX (`place`, `hit`, `ui-pop`, `ui-tap`, `coins`, `chisel-hit`, `error`) plus the synthesized `tone` / `bell` / `noise` / `boom`: splash, sizzle, whoosh, static, glass chimes and little melodies. The result stays the shell's single `stage-chime` on a win, with no extra victory sounds and no new loops.

### Tests

`tests/e2e/step21-minigames2.spec.js` covers each of the 23 games:
- direct QA launch;
- a WIN and a FAIL played with real mouse / touch input;
- Skip;
- a clean return (no pause reasons left, no page errors).

Each game only *suggests* the next correct input (`qa().bot.win`) or wrong input (`qa().bot.lose`); the test sends it as a real tap, drag or hold. Nothing sets progress directly.

The same spec also runs the real flow on Frying Pan, Swimming Pool and Sneaker: clean the level → minigame → Completed card. Coins are checked at each step: the reward is granted once, before the minigame, and is unchanged after it. Screenshots: `project/screenshots/minigames2/<project>/`.


## Polish pass (2026-10-17): text UI, hit alignment, phone composition

No new minigames, and no changes to the core logic, rewards, win / fail or Skip.

**Text system (shell, all 27 games).**
- **Header:**
  - The title is calmer: 29 units, a thinner outline and a soft shadow.
  - The hint sits on a rounded translucent pill.
  - Pips are smaller, and their spacing adapts to narrow screens.
  - The timer is slimmer.
  - Everything is fitted to the screen width minus the margins.
- **Feedback words** (PERFECT!, MISS, CLANG! …) are compact rounded chips:
  - 18-unit display font on a coloured pill with a light rim.
  - Each chip stays inside the margins, below the header and above Skip.
  - When chips would overlap, the new one steps aside.
- **Result:** a ribbon banner (gold with three stars for a win, blue for "Nice try!") sized to its word, so it is never wider than the screen.
- Games keep their old `flash(text, x, y, color, chipColor)` calls.
- Simon's WATCH / YOUR TURN label is smaller.
- Tune In's result chip sits above the dial, so the station stays visible.

**Clean landing / attachment.** A shared `Riders` helper (`systems/kit.js`) eases each object from where it was caught into its exact slot, then keeps it locked to the moving host every frame.
- **Pool Shot:** a shot that will land in a ring homes onto the ring's centre while the ring drifts. The ball then sits centred in the ring, sized to the hole.
- **Wishing Coins:** a coin that will land in the wish spot homes onto the spot's centre and sinks there.
- **Fruit Catch:** caught apples roll into 10 fixed slots inside the crate's opening (rows of 4 / 3 / 3), centred on the crate.
- **Brass Ring Grab:** caught rings slide onto the carousel pole (measured at x 0.52 of the art). They are seen edge-on, centred and stacked down the pole, and ride the horse's bob.
- **Flower Toss:** a rose that will reach the vase homes onto its mouth. Roses stand in the vase stem-first, behind the vase body, as a neat fan.
- **Toast Catch:** slices settle flat and centred on the plate stack.
- **Stop the Clock:** the dial geometry is re-measured from the art (centre 0.495 / 0.62, radius 0.205). The face is now a clean dial with 12 ticks, so the art's own hands no longer compete with the sweep hand. The target arc sits just inside the ticks.

**Composition (phone first):**
- Key Rush caps stay inside the screen margins.
- Flower Toss: the vase sits lower, so the bouquet never reaches the header.
- Pool Shot: the pool is bigger on phones.
- Tool Memory: a centred 3 × 2 grid whenever two rows fit.
- Drive games: obstacles stand on a ground shadow, so Sunday Drive's hay bales no longer read as coins.
- Balloon Breeze: the balloon sprite was re-cropped to its body.
- Grill Master: labels are staggered.
- Particle bursts are smaller and crisper; the win uses star sparkles.
- The result ribbon sits on the top layer, with a soft dim behind it.

Tests: `step21-minigames2.spec.js` now takes its mid-game screenshot just after the second success (so it shows a chip and attached objects).

## Changes 2026-10-17

- **Tutorial hands** (shell `showHand` / `hideHand`, the level's glove art): Football shows the pull-back and release, Balloon Breeze shows press-and-hold, Key Rush taps the popped-up on-screen key. Each hand loops softly and disappears on the first touch.
- **Penalty Kick:** 5 shots, 3 goals win (was 3 / 2); the keeper is unchanged.
- **Cleaver Throw:** 8 cleavers (was 4), collision gap 16° (was 22°), 3 lives, speed ramp 85 → 140 °/s.
- **Pool Shot:** all 3 balls are always played (the win is still 2 rings). There is no overall timer; a ball left alone for 9 s rolls into the water as a miss.

## Progress indicators fix (2026-10-17, cleanup pass)

**What was wrong:** Phaser reuses the minigame scene object, and the shell never cleared its per-game state on a new start. A game that marks attempts (✓ / ✗ per shot: Football, Pool, Pancake …) left its attempt states behind. The next game counting successes (Cleaver Throw, Key Rush …) then drew the previous game's mixed row, and its own count changes stayed hidden behind it ("strange circles, not updating"). The tutorial-hand flag leaked the same way. Cleaver's lives were small red dots in the bottom-left corner.

**Fix (shell):**
- All per-game state is reset on every start: attempt states, lives, hand, result.
- `progress(n)` always draws a plain success count, and two kinds of rows are never mixed:
  - **success count:** n gold dots, for stuck cleavers, notes, catches, pairs and rounds;
  - **attempts:** one dot per attempt, gold ✓ for a success, red ✗ for a miss, white for still to come. Used by Football, Pancake, Grill, Clock, Brass Ring, Flower, Pool, Wishing and Tune In.
- **New lives row:** hearts right under the progress row (`setLives`).
  - Cleaver Throw: 8 success dots plus 3 hearts (the corner dots are gone).
  - Shield Block, Puddle Run, Simon and the three Drive games show their lives too; before, these lives were invisible.
- Every indicator updates in the same frame as the throw / hit / miss.
- QA: `?minigame=a,b,c` plays minigames one after another in the same scene (tests the reset).

