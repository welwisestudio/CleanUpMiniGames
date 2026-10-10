# Current project status

Updated: 2026-10-11 (rev. 36) · Build **#108** (2026-10-10T21:13:37Z UTC) · Commit: `1429600` + uncommitted Step 8 Batch A + **Step 8 Batch B (levels 16–50) + cosmetic skins** (not committed — waiting for designer review)

- **Current stage goal:** Step 8 — **50 playable levels**; levels 16–50 and the cosmetic tool skin system implemented, **waiting for designer review** (build #63, http://localhost:4173/; #63 = menu list centring fix). Levels 1–15 = accepted baseline (unchanged).
- **Fixes (build #108, waiting for review):** no-drift shake for the VIP offer (shared helper), Wheel close top-right on desktop, vibration removed.
- **Final polish (build #107):** exact menu centring, stable chest nudge, ready chests openable during a level, paint can / tray in the stage colour; `tests/e2e/step14-polish.spec.js` passed.
- **Top-bar polish (build #104; Wheel aligned with the top chest, round "+", padlock-only locked cards):** Store next to Settings, new wheel / storefront icons, Wheel CTA below, polished counters with "+".
- **Store + Wheel of Fortune (build #98):** Store page with Diamonds / Coins / Bonus offers, "+" deep links on both counters (menu + level), separate Wheel of Fortune popup (button under Settings), rewarded spins; `tests/e2e/step13-store.spec.js` passed on desktop and phone.
- **Level access (build #94):** sequential progression, rewarded-ad level jumps, VIP levels 46–50 for diamonds (4–8), save v3 with migration; `tests/e2e/step12-progression.spec.js` passed on desktop and phone. Manual QA: `?unlockAll=1` opens every level (dev adapter only).
- **Mobile framing / tool scale (build #90, approved baseline):** larger phone objects (+9–24 %), Watering Can centred on its body, small hand tools enlarged, carpet beater strikes with its head; desktop framing unchanged.
- **Unified tool variants (build #89):** 3 / 4 variants per tool in the one card area (functional + visual-only), 7 visual variants restored from earlier masters, coin → rewarded-ad offer; focused e2e passed on desktop and phone.
- **Cosmetic skins removed (build #88):** no Tool Skins popup / skin button / skin strip; the original 3 alternative-tool cards on every family stage; Completed screen of #87 kept; dist 18.01 MiB.
- **UI polish (build #86; skin parts superseded by #88):** Completed screen regrouped (purple Claim + purple x5, one navigation row), inline skins for 3-option families, cleaned 4-option popup, coin-skin rewarded-ad fallback; `tests/e2e/step10-ui.spec.js` + ported skin specs passed on desktop and phone; dist 18.36 MiB.
- **Tool variety pass 2 (build #83):** skins cut to 3 options (4 for washer / scrub / hammer / grinder / laser), 37 skins shipped; 8 new interaction tools (sandblaster, wet/dry vacuum, spin scrubber, rotary buffer, wire cup brush, razor scraper, heavy scraper, telescopic brush) on 29 reassigned stages; blower / steam / foam-cannon effects upgraded; 8 NB2 images + 8 removals; `tests/e2e/step9-tools2.spec.js` (effects asserted via fxLog) + skins / alternatives specs passed on desktop and phone; registration 0 / 50; dist 18.35 MiB.
- **Tool variety pass (build #79, superseded in part by pass 2):** 9 new functional tools, 15 repetitive stages switched to them, 4 new alternative-tool families (detail, pool brush, squeegee, mitt), skins expanded to 16 families × 3–4 skins (56); 46 NB2 images (standard, no 2K) + 9 Background Remover operations; focused e2e `tests/e2e/step9-variety.spec.js` passed on desktop-mouse and phone-touch; registration validator 0 / 50; dist 18.44 MiB (DECISIONS 2026-10-10).
- **Visual polish pass (build #78, approved baseline):** smooth outlines / hand hint for thin zones, invisible-progress stages fixed (DECISIONS 2026-10-10).
- **Logic + visual pass (build #74):** artificial screw / polish stages removed, rectangle zones replaced by physical parts, simplified outlines, desk-fan guard fixed (DECISIONS 2026-10-10).
- **Registration regression fixed (build #72, approved):** zone-clipped cleaning landed beside the tool since #64 (scratch texture origin); validator: 0 of 50 levels flagged; dist 18.8 MB (DECISIONS 2026-10-10).
- **Step 9 fast polish pass (build #64, waiting for review):** hammer / dents, water drain-fill visuals, net skim, jet directions, zone-clipped cleaning + green outlines, paint capacity, cleaver framing, keyboard simplified, new pool brush / wash mitt / crevice brush (DECISIONS 2026-10-09).
- **Batch B (build #60):** 35 new levels (16 Swimming Pool … 50 Vintage Car), 7–10 stages each by range, new base tools (laser cleaner, spray bottle, steam cleaner, water pump, garden hose, skimmer net, whetstone, carpet beater, mop), drain / fill water mechanic, carpet beater taps, laser / steam effects, new background families PLAZA / GARAGE / VIP / SHORE, light 320 px thumbnails, lazy level art, Next 15 → 16, 50 → object list. Art: 130 Nano Banana 2 images (standard resolution, no 2K, no NB Pro) + 44 Background Remover operations. Validation: VALIDATION "Step 8 Batch B".
- **Cosmetic skins (build #60):** 8 tool families × 3 skins + Default (coins / diamonds / rewarded ad), persistent ownership, one equipped skin per family, brush button on the equipped base card → picker. A skin only changes the base tool's sprite and card.
- **Known open points (Batch B):** garden-grill carbon scrape is the longest stage (~38 s for the test bot); several zone stages on small regions finish in < 1 s (cleaver edge / handle, grill grate, sign post, lamp base, shower tray); stone-patio slabs use a polygon outline (remover kept only the furniture); pool / patio are objects on the YARD family (no unique scenes); prices and rewards provisional (Step 10).
- **Batch A (build #55):** Rain Boots, Frying Pan, Wooden Crate, Toolbox, Bathroom Sink, Desk Fan, Garden Bench, Keyboard, Watering Can, Porcelain Vase — full stage sequences from CONTENT-MATRIX, 108 Nano Banana Pro generations + 93 background removals, new `points` mechanic (hold / tap / pull), parts into slots, paint loading, zone dim, power-tool effects, 30 new tool sprites, 10 new card families, shared backgrounds WASH / STUDIO / WORKSHOP / YARD, lazy per-level art loading, 15-level menu, Next 15 → object list. Validation: VALIDATION "Step 8 Batch A".
- **Known open points (Batch A):** keyboard is small on narrow phones (wide object); chunk-break stages (bench / crate peel, boots chisel) are the longest stages; credits: Batch A art was charged to normal credits (unlimited mode not available via MCP) — new rule: Nano Banana Pro only in verified unlimited mode.
- **Checkpoint 4 accepted (2026-10-07):** metagame / monetization incl. alternative tools; phone tool cards always a bottom row (build #54).
- **Step 6 gameplay approved** (2026-10-06).
- **Step 7 alternative tools (build #53, accepted with CP4):** 3 tool cards on 10 stages (families scrub / foam / wipe), coins / diamonds / rewarded-ad unlocks, permanent ownership, equipped per family, mid-stage switching without progress loss. See DECISIONS 2026-10-07 Step 7 rows.
- **Multiplier bar polish (build #50, approved):** inner segments equal height and evenly centred.
- **UI pass 4 (build #49):** multiplier bar after the reference (x2 | x3 | x5 | x3 | x2, purple marker), Chair / Rug hub previews larger, chest reel clipped to the card.
- **UI / reward pass 3 (build #47, approved):** hub clean previews + 46-unit checks; completed screen (Home + wide yellow Replay, full-width Next; boost meter x2…x5 + pink button: tap locks, ad pays base × multiplier); larger, vertically centred objects (screen-scale jets); Level Chest offer (green Open chest with pulse + sheen, "Skip chest" text + lost-forever warning — skipping forfeits the chest) and a reward reel. Backgrounds unchanged; ad-based tool / colour choice is backlog only.
- **x3 button v4 (build #43):** purple button with the clapperboard watch-ad icon, "Claim" + large yellow "x3".
- **UI polish 2 (build #42):** chests always visible in the gameplay HUD; hub chests in one left column under the counters with the approved compact header; Replay / Next labels optically centred; green x3 button after the reference composition.
- **UI corrections (build #41):** hub background and shelves reverted to the approved version, emblem removed, chests under the coin / diamond counters, x3 button redesigned, completed-screen text alignment fixed and verified on rendered pixels.
- **Step 6 UI / reward pass (build #36):** global text-layout rules, x3 post-level reward (rewarded ad, dev adapter), timed chest (menu), level-progress chest (result card, offer window, menu). Values in `src/content/economy.js` (provisional). No real ads / SDK.
- **Step 6 chair duster fix (build #33):** the frame starts visibly dusty (new Nano Banana 2 dust film) and turns into clean wood under the duster; the holes are above the dust layers and visible the whole time (approved with Step 6 gameplay).
- **Step 6 polish pass (build #32):** trophy ball dry-brush without outline (hint kept); chair putty fully covers each hole (solid patch, repair spots no longer cut by the chair silhouette); sanding shows clean circle targets and removes the whole patch. (approved with Step 6 gameplay).
- **Step 6 second pass (build #29, see DECISIONS 2026-10-05 rows, VALIDATION "Step 6 — second pass"):**
  - **Completion lifecycle (all levels):** work done (manual 100 % or gentle auto-complete from 85 %) → bar runs to 100 % → **waits while the finger / mouse is still down** (tool stays in the hand) → on release: completion feedback → next stage.
  - **Outlines** only where the target is ambiguous (trophy ball / pedestal, chair seat close-ups, putty / sanding spots); removed from whole-chair dusting and sneaker scuffs.
  - **Duster:** cleans with a tall footprint matching its fluffy head (was a circle at the tip).
  - **Foam can v3** (Nano Banana 2): side nozzle tube, can held tilted, foam visibly leaves the nozzle and travels to the object.
  - **Drill brush v3** (Nano Banana 2): side view per the reference, brush face on the surface (chair + sneaker).
  - **Chair putty:** no residue after sanding (putty clipped to the chair, sanding covers the whole patch).
  - **Sneaker chisel:** no stall at 95 % (wider tip probe on speckled mud, last crumbs break off).
  - **Chisel hint** stays on the remaining crust (found by the phone run).
- **Step 6 first pass (build #24):** target-aware hints, radii = tool heads, spray radii per stage, material foams, larger chair, putty dip, region-mask finishing, soft auto-complete.
- **Accepted by the game designer:**
  - Step 0 decisions, Step 1, CP1 (core gameplay).
  - **Step 3 revision approved as the Soccer Ball baseline** (responsive layout, larger UI, new pitch, continuous foam, result card, coin fly).
- **Implemented, not yet accepted:**
  - **Step 4 (closed quickly):**
    - Glove-hand hint (generated with Nano Banana 2) demonstrates the real gesture on the remaining work. It appears the first time each gesture family is introduced and after 5 s of inactivity, and never changes progress.
    - Gameplay video: `project/videos/step4-soccer-ball.webm`.
  - **Step 5:**
    - Levels 2–5 (Rug, Golden Ball Trophy, Chair, Sneaker) with the reference stage sequences. All stages are playable by real input and each level ends in the correct final object state, a result card, Replay and Next.
    - Main UI:
      - **Menu:** a vertical scrolling list of shelves with 2 objects per row and all levels open. No title text. The header holds the counters and a settings gear.
      - **HUD.**
      - **Settings** (sound / music / vibration), reachable from the menu and from pause.
      - **Pause:** Resume, Restart, Settings, Menu.
      - **Result:** Home, Replay, Next.
    - Text alignment fix (glyph-centred labels, labels shrink to fit their buttons).
    - Art: 42 Nano Banana 2 generations (2 rejected, kept for the record) and 36 Background Remover jobs, recorded in `project/asset-manifest.json` (section `step5`).
- **Current task:** game designer review of the Step 6 second pass.
- **Active constraints:**
  - Dev adapter only; no YouTube SDK.
  - No sound assets (Step 9).
  - Alternative tool cards and monetization are Step 7.
  - Minor UI polish and the full responsive audit are Step 6.
- **Important files:**
  - Level data: `src/content/levels/*.js`; menu / Next order: `src/content/catalog.js` (`DISPLAY_ORDER`).
  - Mechanics: `src/mechanics/` (brush with region and aspect, chunk break, drag to target, spots).
  - Hints: `src/scenes/level/HintController.js`.
  - Art pipeline: `scripts/prepare_levels.py`, `scripts/write_step5_manifest.py`, `scripts/write_step6_manifest.py`.
  - Tool geometry (offset, jet direction, hold angle, head footprint): `src/content/tools.js`, `src/scenes/level/ToolController.js`.
- **How to run:**
  - `npm test`; `npm run build`; `npm run preview` (LAN: `npx vite preview --host 0.0.0.0 --port 4173`).
  - Step 5 E2E: `npx playwright test levels5`.
  - Step 6 E2E: `npx playwright test step6-release` (hold to release, all levels) and `npx playwright test step6-review`.
  - Art pipeline (Python with Pillow / NumPy / SciPy): `python scripts/prepare_levels.py` (all, or e.g. `rug chair`), then `python scripts/write_step5_manifest.py`.
- **Checks actually performed:** see `project/VALIDATION.md` (Step 6 sections).
- **Known defects / limitations:**
  - Landscape phone: result / chest-offer card buttons are ≈ 35 CSS px tall (card fitted to the short height).
  - Timed chest uses the device clock (moving it forward opens the chest early); receipts are client-side only.
  - The dev save now persists across reloads (`?devStorage=memory` for a clean start).
  - Phone, sneaker scrub: when the drill brush works the right end of the shoe, the drill body extends past the right screen edge (playable; possible fix: mirror the drill near the right edge).
  - Gentle auto-complete thresholds and level timing are bot-measured; human pacing is Step 10.
  - On landscape / desktop windows the objects are framed smaller than on phones (they fit under the HUD with room for jet tools). To be reviewed in the Step 6 audit.
  - Landscape backgrounds for levels 2–5 are crops of the portrait art.
- **Next concrete step:** game designer review of the UI / reward pass → on approval, Step 7.

## Questions for the game designer

| # | Question |
|---|---|
| Q1 | **Next after Level 5 (Sneaker):** not defined in the approved decisions. Currently the Sneaker result shows Home and Replay only. Options: no Next (as now); Next → back to the menu; Next → Level 1 (loop). |

## Backlog (recorded, not implemented)

- Regular levels after the first five: one reusable standard background family; VIP levels: a separate premium background family.
- ~~Choosing tool skins / colours by watching an ad~~ → started as Step 7 alternative tools (build #53).
- VIP mini-games: the reward reel shows a VIP card as decoration only.

## Open items (not blocking)

| # | Item | Needed by |
|---|---|---|
| 1 | Final game name / logo (menu shows no title text now) | Later (not blocking) |
| 2 | Localization (fonts support Latin + Cyrillic; labels already shrink to fit) | Before release |
| 3 | Full v1 object count | Step 8 |
| 4 | Mt. Rushmore replacement / no real brands (AI suggestion) | Later levels |

## Provisional choices (reversible)

- Rewards: ball +15, rug +15, trophy +20, chair +20, sneaker +20 (reference values); replays pay the same. Real economy at Step 7.
- The result card shows **Replay** where the reference has "Claim 2x" (Step 7).
- Vibration toggle uses `navigator.vibrate` through the dev adapter (no effect on desktop).
