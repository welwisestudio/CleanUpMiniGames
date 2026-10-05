# Current project status

Updated: 2026-10-04 (rev. 9) · Build **#24** (2026-10-04T22:14:58Z) · Commit: `b263241` + uncommitted Steps 4–5 work

- **Current stage goal:** Step 6 — gameplay / UX / visual polish and bug fixing from the game designer's Step 5 review (16 items). **Fixes done, waiting for approval.** Step 7 not started. Nothing committed.
- **Step 6 fixes (build #24, see DECISIONS 2026-10-04 Step 6 rows):**
  - **Hint:** stage- and target-aware strokes inside the remaining work area; lifts between strokes; dip → dent for putty; item → bin for drag.
  - **Tools:** cleaning radii match the visible tool heads; spray radii per level and stage; mist nozzle, foam can and drill brush re-drawn to point at the object.
  - **Materials:** foam per material (rug, metal, leather, sneaker).
  - **Localized stages:** dashed green outlines on every one.
  - **Chair:** bigger; full-seat foam mask; putty dip with a tub.
  - **Edge remnants:** region finish erases with the region mask, so thin edges are cleaned; the sneaker eraser targets the real scuff marks.
  - **Soft auto-complete** for scattered remnants.
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
- **Current task:** game designer review of Step 5.
- **Active constraints:**
  - Dev adapter only; no YouTube SDK.
  - No sound assets (Step 9).
  - Alternative tool cards and monetization are Step 7.
  - Minor UI polish and the full responsive audit are Step 6.
- **Important files:**
  - Level data: `src/content/levels/*.js`; menu / Next order: `src/content/catalog.js` (`DISPLAY_ORDER`).
  - Mechanics: `src/mechanics/` (brush with region and aspect, chunk break, drag to target, spots).
  - Hints: `src/scenes/level/HintController.js`.
  - Art pipeline: `scripts/prepare_levels.py`, `scripts/write_step5_manifest.py`.
- **How to run:**
  - `npm test`; `npm run build`; `npm run preview` (LAN: `npx vite preview --host 0.0.0.0 --port 4173`).
  - Step 5 E2E: `npx playwright test levels5`.
  - Art pipeline (Python with Pillow / NumPy / SciPy): `python scripts/prepare_levels.py` (all, or e.g. `rug chair`), then `python scripts/write_step5_manifest.py`.
- **Checks actually performed:** see `project/VALIDATION.md` (Step 5 section).
- **Known defects / limitations:**
  - On landscape / desktop windows the objects are framed smaller than on phones (they fit under the HUD with room for jet tools). To be reviewed in the Step 6 audit.
  - Landscape backgrounds for levels 2–5 are crops of the portrait art.
- **Next concrete step:** game designer review → Step 6 UI / responsive audit.

## Questions for the game designer

| # | Question |
|---|---|
| Q1 | **Next after Level 5 (Sneaker):** not defined in the approved decisions. Currently the Sneaker result shows Home and Replay only. Options: no Next (as now); Next → back to the menu; Next → Level 1 (loop). |

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
