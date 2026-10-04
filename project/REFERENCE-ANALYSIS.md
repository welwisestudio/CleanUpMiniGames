# Reference analysis and implementation approach

Updated: 2026-10-04 · Step 1 · Status: **draft for approval**. Nothing has been implemented yet.

Inputs: confirmed concept and decisions (`PROJECT-BRIEF.md`, `DECISIONS.md`), `reference/input/Reference_gameplay.mp4`, the 36 screenshots, and the timed breakdown in `REFERENCE-BREAKDOWN.md`. The visual rules are in `STYLE-GUIDE.md`. Timecodes are `mm:ss` in the video.

This document explains **how** the confirmed Core Loop and the approved levels 1–5 will be built. It does not change the concept. Where something is the AI's proposal rather than an observed fact, it says so.

## 1. Core Loop → screens and states

| Core Loop step | Screen / app state | Reference evidence | Our implementation |
|---|---|---|---|
| Object selection | `menu`: vertical scroll of shelves, 2 objects per shelf | 00:00, 04:12, 08:04–08:16 | Shelf list built from the level catalogue. **All objects open** (decision). Tap → `loading` → `playing`. |
| Sequential cleaning / restoration | `playing`: HUD + one active stage at a time | every level | Level config = ordered stage list. Each stage = one mechanic + one tool + its layers. |
| Stage progress | Progress bar with % under the current tool | 00:08 "28%" etc. | The mechanic reports 0..1 from real coverage or real target count; the HUD only displays it. |
| Tool transition | ✓ on the current tile → strip slides → new tool enters | 00:14–00:17.75 | Transition sequence (§4). The finished work stays visible. |
| Object completion | Restored object, sparkle + confetti | 00:59.75–01:01.5 | `completing` state: HUD out, celebration in the scene. |
| Reward | "Completed" card: Reward +N, Home, Claim 2x (ad), "Get +N" | 01:01.75–01:04 | `result` modal. RewardService applies the reward once; the coin fly only displays the accepted change. Claim 2x uses the dev adapter at Step 7, the real SDK at Step 11. |
| Next object | "Get +N" → loading → next shelf object; Home → menu | 01:04–01:10, 04:04–04:12 | "Next" = the next ID in the display order. Wraps or ends at the last object (details at Step 5). |

App states: `boot → loading → menu → playing → completing → result`, plus independent pause reasons (`userPause`, `hostPause`, `adBusy`, `navigationBusy`, `assetsLoading`), following `instructions/02-architecture.md`.

## 2. Mechanic families needed for levels 1–5

Every stage in levels 1–5 maps to one of six families. Each family is one mechanic module with the standard lifecycle: pointer down/move/up/cancel, update, pause/resume, resize, dispose, progress, hint, and a correct final state on skip.

| Family | What the player does | How it works technically | Used in |
|---|---|---|---|
| **Reveal (wipe)** | Drags a tool over the object; the top layer disappears under the tool head | An erasable layer texture masked by the object alpha. The tool head stamps an erase brush along the pointer path (interpolated, no gaps). Progress = cleared share of a coverage grid inside the valid area. | brushes, cloth, sponge, eraser, pressure washer, squeegee, duster, sandpaper |
| **Apply layer** | Drags a sprayer or applicator; a new layer appears where the stream lands | Same grid, inverted: stamps paint into a layer (foam, water mist, wood stain). The jet hits a point **above** the nozzle (see §5). | foam sprayer, foam can, water mist, wood-stain sponge |
| **Transform layer** | Scrubs an existing layer, which changes look while the layer beneath clears | Two linked layers: the scrub erases the stain layer under the foam and swaps the flat foam texture for a swirl-foam texture in the same strokes. | scrub brush / drill brush (ball, rug, trophy, chair, sneaker) |
| **Chunk break-off** | Drags the chisel over a crust; pieces crack, get outlined and fall away | The crust image is split at load time into ~20–35 irregular pieces (precomputed chunk map). Tool contact adds "damage" to the piece under it. At the threshold the piece shows a green outline briefly, then detaches as a falling sprite (gravity + spin + fade) and reveals the layer under it. Progress = pieces removed / total. | chisel (ball, trophy, sneaker) |
| **Drag to target** | Drags outlined items into a container | Items have grab zones and a drop target. A valid drop animates the item into the bin; an invalid drop returns it. Progress = items binned / total. | trash → bin (chair) |
| **Spot targets** | Rubs the tool over dashed-circle spots to fill them | A few target circles. Rubbing inside a circle paints the filler there. A spot completes at a set coverage. Progress = completed spots / total. | wood putty + putty knife (chair) |

Shared rules (from `instructions/04-mechanics-feedback.md`):
- Progress only comes from a valid action inside the valid area. Waiting, hints and pause add nothing.
- **Completion threshold (AI proposal):** a reveal or apply stage completes at **≈95–97 %** coverage, and the leftover specks fade out over 0.3 s. The reference behaves like this: the bar jumps to 100 % without pixel-perfect work. This is a design rule of the stage, not a test shortcut. Tests still play stages with real input.
- Coverage grid ≈ 48×48 cells over the object bounds, counting only cells inside the object mask. The erase brush is sized so one stage takes the target time (§6).
- **One coordinate basis per object:** object alpha ∩ surface mask ∩ allowed area. Every layer, mask and coverage sample uses it, so dirt never appears outside the object.

## 3. Layer model of an object (shared by all five levels)

Each object is a stack of **pre-aligned full-object images** on one common canvas, top to bottom. A stage removes, adds or swaps one layer. Example for the Soccer Ball:

```
mudCrust     (chunked)        ← removed by chisel
dusty        (full image)     ← removed by dry brush
foam         (texture, applied by foam sprayer; swirl variant appears while scrubbing)
stained      (full image)     ← removed by scrub brush under the foam
wet          (full image)     ← revealed when the washer removes foam + stain; removed by cloth
clean        (base image)     ← final state
```

Production rule: the **clean** object is generated first. Every dirty or wet state is produced from it **as an image edit in Nano Banana 2 with the clean master as reference**, so the silhouette and pentagon panels line up. Then each state is cut out with Background Remover and registered to the common canvas. If an edit drifts in geometry it is rejected and redone; it is never hand-stretched to fit. Small drift is hidden by masking every layer with the clean object's alpha.

## 4. Stage transition and completion timing (measured)

**Stage → next stage** (measured at 0.25 s steps, 00:14.00–00:17.75):
1. The bar reaches 100 % and the current tile shows a green ✓ (00:14.00).
2. Remaining chunks and particles finish falling while the tool stays usable for a moment (≈1.0–1.5 s).
3. The tool leaves the screen (≈00:15.5).
4. The new tool appears at its rest position, bottom centre (00:16.50).
5. The tool strip slides one step left over ≈0.5 s (00:17.00–00:17.50).
6. The player starts the next stage (00:17.75).

Total ≈ **2.5–3.0 s** between finishing one stage and acting on the next. The finished state is kept throughout; nothing re-fills.

**Last stage → result card** (00:58.75–01:02.25):
1. The last ✓ appears (00:58.75).
2. HUD fade-out begins after ≈1.0 s (00:59.75).
3. Confetti bursts from the two bottom corners for ≈1.75 s (00:59.75–01:01.50), with small white puffs where the confetti leaves the corners. The restored object stays in full view.
4. The scene dims and the "Completed" card pops in with a slight overshoot in ≈0.25 s (01:01.75).
5. "Get +15" appears ≈0.5 s after the card (01:02.25).

Total ≈ **3.0 s** from the last ✓ to the card.

**Reward collection** (01:02–01:10): pressing "Get" flies ~5 coins to the coin counter (≈0.5–0.8 s), then the loading screen appears and the next object opens. Loading took ≈2 s in the reference; ours depends on asset size.

## 5. Interaction details per tool type (observed → implemented)

| Tool | Observed behaviour | Implementation note |
|---|---|---|
| Chisel | The blade tip is the contact point. The tool sprite sits above the finger. Debris chunks fly down and out with spin (00:08–00:16). | Working point = blade tip. Damage per piece ≈ 0.25–0.4 s of contact. |
| Dry brush / scrub brush / drill brush | The brush body tilts slightly with movement direction. Dirt clears in wide soft strokes (00:18–00:22). | Erase brush ≈ the bristle footprint; soft edge. Rotate the sprite ±10° with horizontal velocity. |
| Foam sprayer / water mist | Rest position at the bottom with a hose to the screen bottom. The **jet travels up** from the nozzle to the object; foam builds where the jet hits (00:28–00:32). | Working point = nozzle. Impact point = nozzle + fixed offset upward (≈18–22 % of screen height). A particle stream is drawn between them. The hose is a code-drawn curve. |
| Pressure washer lance | Same as the sprayer: a thin jet, mist at impact, wet shiny reveal (00:44–00:52). | Narrower, stronger erase brush; mist particles at impact. |
| Cloth / sponge / eraser | The cloth sits on the surface and slightly deforms. Droplets disappear under it (00:54–00:58). | Contact = cloth centre. Small squash/stretch on the sprite. |
| Squeegee | A wide blade; strip-wise reveal (01:24, 02:04). | Wide rectangular erase stamp aligned to the blade. |
| Duster | Coloured dust puffs follow it (04:32–04:40). | Wide soft erase brush + puff particles at a capped rate. |
| Trash bin | Outlined items; drag into the bin; the bin sits bottom centre (04:20–04:28). | Drag-to-target; items scale down into the bin opening. |
| Putty knife + putty | Dashed green circles; rubbing fills them grey (05:28–05:40). | Spot targets with fill coverage per spot. |
| Sandpaper | A small block; sands patches (05:44–05:52). | Reveal on the putty-patch layer. |
| Wood-stain sponge | Wiping applies rich brown stain (05:56–06:04). | Apply layer over the wood mask only. |

The glove-hand hint appears in the reference for special gestures (10:04, 10:28; screenshots: drag to beaker, ↔ swipe). Hint rules are in the suggestions section of `STATUS.md`.

## 6. Approved levels 1–5: stage plans

Stable IDs (technical, AI-assigned): `soccer-ball`, `rug`, `golden-trophy`, `chair`, `sneaker`. The display order is stored separately: `['soccer-ball','rug','golden-trophy','chair','sneaker', …]`.

Target times are for a first-time player, about 1.3× the reference. They are tuned at the balance step.

### Level 1 · Soccer Ball (`soccer-ball`). Reference: video 00:06–01:04, 6 stages, ≈55 s. **Our target: 50–75 s.**

| Stage ID | Tool | Family | Layer change | Target time | Completion |
|---|---|---|---|---|---|
| `chisel` | Chisel | Chunk break-off | mudCrust pieces → dusty | 12–16 s | all pieces removed (≈24) |
| `dry-brush` | Dry brush | Reveal | dusty → stained | 5–8 s | ≥96 % |
| `foam-spray` | Foam sprayer | Apply layer | + foam | 6–9 s | ≥96 % |
| `scrub` | Round scrub brush | Transform layer | foam → swirl foam; stained cleared beneath | 6–9 s | ≥96 % |
| `rinse` | Pressure washer | Reveal | foam + stain → wet | 6–9 s | ≥96 % |
| `dry` | Cloth | Reveal | wet → clean | 4–6 s | ≥96 % |

Background: football pitch with a goal net at the top (our own). The ball sits at ≈45 % of screen height.

### Level 2 · Rug (`rug`). Reference 01:10–02:20, 6 stages, ≈70 s. **Target: 60–90 s.**

| Stage | Tool | Family | Layer change |
|---|---|---|---|
| `rinse-dirt` | Pressure washer | Reveal | dry sand/dirt → wet dirty rug; dirty water spreads on the floor tiles |
| `squeegee-1` | Squeegee | Reveal | wet dirty → damp dirty (dirty water pushed off) |
| `foam-spray` | Foam sprayer | Apply | + foam |
| `scrub` | Scrub brush | Transform | foam → swirl foam; grime cleared beneath |
| `rinse` | Pressure washer | Reveal | foam → wet clean (green patterned rug) |
| `squeegee-2` | Squeegee | Reveal | wet → clean dry |

New compared with level 1: the squeegee's wide stamp, and a floor-water decal around the rug, which is a scene layer outside the object mask but bounded to a floor zone.

### Level 3 · Golden Ball Trophy (`golden-trophy`). Reference 02:24–04:04, 8 stages, ≈100 s. **Target: 85–120 s.**

| Stage | Tool | Family | Layer change |
|---|---|---|---|
| `chisel` | Chisel | Chunk break-off | dried crust → dull dirty gold |
| `dry-brush` | Dry brush | Reveal | dust |
| `detail-brush` | Small round brush | Reveal (**restricted to the base mask**) | grime in the base crevices |
| `wet` | Water mist nozzle | Apply | + wet sheen |
| `foam-spray` | Foam sprayer | Apply | + foam |
| `scrub` | Scrub brush | Transform | foam swirl; tarnish cleared beneath |
| `rinse` | Pressure washer | Reveal | foam → shiny wet gold |
| `dry` | Cloth (or sponge variant) | Reveal | wet → polished gold |

New: the **region-restricted** stage (only the base counts), and a second object shape (ball + plinth).

### Level 4 · Chair (`chair`). Reference 04:20–06:12, 9 stages, ≈110 s. **Target: 100–140 s.**

| Stage | Tool | Family | Layer change / camera |
|---|---|---|---|
| `trash` | Trash bin | Drag to target | 5 outlined items (shirt, can, peel, shoe, bottle) → bin |
| `dust-chair` | Duster | Reveal | dust over the whole chair |
| `dust-seat` | Duster | Reveal | **camera zooms to the seat**; seat dust → moldy stained seat |
| `foam-can` | Foam spray can | Apply | + foam on the seat |
| `scrub` | Scrub / drill brush | Transform | foam swirl |
| `wipe-seat` | Cloth | Reveal (**new state**) | foam + old fabric → **new yellow leather** |
| `putty` | Putty knife + wood putty | Spot targets | 4 dashed dents → grey putty patches; camera back to full chair |
| `sand` | Sandpaper | Reveal | rough putty → smooth patches |
| `stain` | Wood-stain sponge | Apply | raw/patched wood → glossy brown frame |

New: drag-to-target, camera zoom between stages, spot targets, a "new state" reveal, and an apply layer bounded to the wood mask.

### Level 5 · Sneaker (`sneaker`). Reference 06:20–07:56, 8 stages (7 tool stages + finish), ≈95 s. **Target: 85–120 s.**

| Stage | Tool | Family | Layer change |
|---|---|---|---|
| `chisel` | Chisel | Chunk break-off | cracked mud crust (laces included) → muddy sneaker |
| `rinse-mud` | Pressure washer | Reveal | mud → stained sneaker |
| `foam-spray` | Foam sprayer | Apply | + foam |
| `scrub` | Scrub / drill brush | Transform | foam swirl; stains cleared beneath |
| `rinse` | Pressure washer | Reveal | foam → wet clean white/red/blue sneaker |
| `dry` | Cloth | Reveal | wet → dry |
| `erase` | Eraser block | Reveal | last scuffs on the sole → spotless |

New: a long, low silhouette (layout check for the bottom zone).

**Reuse:** levels 1–5 need only the six families. Levels 2–5 add four engine capabilities: the region-restricted stage, camera framing per stage, drag-to-target, and spot targets.

## 7. Rewards and meta in these levels (design record; built at Step 7)

- Base completion reward per object: reference values +15 / +15 / +20 / +20 / +20. Our numbers are set at Step 7 and tuned at Step 10.
- Claim 2x uses a rewarded ad: double only on a confirmed `earned` result, once per completion. "Get +N" is the no-ad path. The real SDK comes at Step 11 only.
- Tool-variant cards (3 per stage on tool stages) for in-game currency. Until Step 7 the bottom card zone is **reserved in the layout** but not shown (see suggestion S2 in `STATUS.md`).
- No banner, no mid-level ad breaks (decision).

## 8. Platform layer reminder

All ads, saves, pause/mute and language go through the internal platform contract (`platform/SDK-CONTRACT.md`) with a dev adapter. `ytgame` appears only in the YouTube adapter at Step 11. Cloud save loads before any write. No YouTube progress in browser storage.
