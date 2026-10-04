# Current project status

Updated: 2026-10-04 (rev. 7) · Build **#12** (2026-10-04T15:34:39Z) · Commit: `e2a0125` (Step 3 committed) + uncommitted Step 3 revision

- **Current stage goal:** Step 3 / **CP2**: visual quality benchmark of the Soccer Ball level. **CP2 not approved yet.** A visual revision is in progress for the game designer's four notes. Step 4 not started.
- **Accepted by the game designer:**
  - All Step 0 decisions.
  - Step 1 (style guide, plan).
  - **CP1 core gameplay**, with two required notes: (1) larger UI; (2) responsive layout instead of a fixed 9:16 canvas.
- **Implemented, not yet accepted (Step 3):**
  - **Full Soccer Ball visual set generated with Nano Banana 2** via Higgsfield MCP (22 generations): ball + 4 states, 6 tools, portrait and landscape pitch backgrounds, 2 foam textures, UI kit (tiles, buttons, pill, progress fill), 6 icons, result card, shelf, FX.
  - Transparency via Higgsfield Background Remover (19 operations).
  - Masters, cutouts, prompts, job IDs and reviews recorded in `project/ASSET-MANIFEST.md` and `project/asset-manifest.json`.
  - Integrated into menu, gameplay HUD, all six stages, the completion card and the pause modal.
  - **CP1 notes applied:** UI about 1.5× larger on phones (tool tile 80 vs ≈ 53 CSS px; touch targets ≥ 48 px). The canvas fills any window at native DPR (≤ 2); the HUD is anchored to the screen edges (two rows on narrow phones, one row on wide screens). The object is fitted to the free area; backgrounds cover-fit with portrait or landscape art; nothing is stretched.
  - Fonts Rubik + Nunito bundled locally (OFL).
- **Step 3 revision (CP2 feedback, build #12, not yet accepted):**
  - Foam continuity: one foam material from spraying through scrubbing to rinsing (new `scrub` mode; scrubbed foam derived from the same foam texture). **Done.**
  - Result card: measured inner-panel layout, smaller picture, centred reward row, even buttons ≥ 48 CSS px. **Done.**
  - Coin fly: no compounding pulse; coins shrink to the counter-icon size along an arc. **Done.**
  - Background: regenerated with Nano Banana 2 (2 candidates, the better one chosen) and integrated for portrait; landscape uses a 16:9 crop of it; result picture re-composited. **Done.** Limitation: no dedicated landscape generation (the Higgsfield connector disconnected in this session).
  - Screenshots: `project/screenshots/step3-revision/`.
- **Current task:** CP2 visual review of the Step 3 revision (build #12).
- **Active constraints:**
  - No real ads / SDK (dev adapter, TEST MODE).
  - No sound assets (Step 9).
  - No hint hand yet (feedback / hints are Step 4).
  - Not tested on physical devices.
- **Important files:** `src/`, `scripts/prepare_assets.py`, `scripts/write_asset_manifest.py`, `reference/masters|cutouts|review/soccer-ball/`, `public/assets/`, `project/screenshots/step3/`, `project/screenshots/step3-revision/`.
- **How to run:**
  - Node: portable 24.21.0 on the Windows workstation (`C:\Users\Admin\AppData\Local\Programs\node-v24.21.0-win-x64`); Node 22 in the cloud session (E2E there needs the bundled Chromium and a longer timeout for the touch tests, because WebGL is software-rendered).
  - `npm test`; `npm run build`; `npm run preview` → http://127.0.0.1:4173/; `npx playwright test`.
  - Asset pipeline (Python with Pillow / NumPy / SciPy): `python scripts/prepare_assets.py`, then `python scripts/write_asset_manifest.py`.
- **Checks actually performed:** see `project/VALIDATION.md`. Build #12 (revision): unit 21/21 PASS, production build + preview OK, one real phone playthrough + landscape shot PASS; full E2E not re-run (cloud software rendering). Build #9: unit 21/21, E2E 8/8 PASS.
- **Known defects / blockers:** none known. Full E2E not re-run on the revision (see VALIDATION).
- **Next concrete step:** CP2 decision. After CP2 approval → Step 4: feedback and hints for Level 1 (hint hand, stage feedback polish).

## Open items

| # | Item | Needed by |
|---|---|---|
| 1 | Final game name for the logo | Step 5 |
| 2 | Localization (fonts already support Latin + Cyrillic) | Before release |
| 3 | Full v1 object count | Step 8 |
| 4 | Mt. Rushmore replacement / no real brands (AI suggestion) | Later levels |

## Provisional choices (reversible)

- Replays pay the same base reward (+15); the real rule is set at Step 7.
- The result card shows **Replay** where the reference has "Claim 2x" (monetization is Step 7).
- Coin / diamond counters show values but have no "+" buttons yet (store is Step 7).
