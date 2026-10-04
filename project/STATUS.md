# Current project status

Updated: 2026-10-04 (rev. 6) · Build **#9** (2026-10-04T12:17:14Z) · Commit: `23fe1ef` + uncommitted Steps 2–3 work

- **Current stage goal:** Step 3 / **CP2**: visual quality benchmark of the Soccer Ball level. **Waiting for the game designer's approval** before Step 4.
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
- **Current task:** CP2 review.
- **Active constraints:**
  - No real ads / SDK (dev adapter, TEST MODE).
  - No sound assets (Step 9).
  - No hint hand yet (feedback / hints are Step 4).
  - Not tested on physical devices.
- **Important files:** `src/`, `scripts/prepare_assets.py`, `scripts/write_asset_manifest.py`, `reference/masters|cutouts|review/soccer-ball/`, `public/assets/`, `project/screenshots/step3/`.
- **How to run:**
  - Node portable: `C:\Users\Admin\AppData\Local\Programs\node-v24.21.0-win-x64`.
  - `npm test`; `npm run build`; `npm run preview` → http://127.0.0.1:4173/; `npx playwright test`.
  - Asset pipeline (Python with Pillow / NumPy / SciPy): `python scripts/prepare_assets.py`, then `python scripts/write_asset_manifest.py`.
- **Checks actually performed:** see `project/VALIDATION.md`. Unit 21/21 PASS; E2E 8/8 PASS on build #9.
- **Known defects / blockers:** none known.
- **Next concrete step:** after CP2 approval → Step 4: feedback and hints for Level 1 (hint hand, stage feedback polish).

## Open items

| # | Item | Needed by |
|---|---|---|
| 1 | Git storage before the first commit: the 911 MB reference video, plus ≈ 190 MB of masters and cutouts (individual files ≤ 10 MB). Options: keep large media local (`.gitignore`), Git LFS, or compressed copies. | First commit |
| 2 | Final game name for the logo | Step 5 |
| 3 | Localization (fonts already support Latin + Cyrillic) | Before release |
| 4 | Full v1 object count | Step 8 |
| 5 | Mt. Rushmore replacement / no real brands (AI suggestion) | Later levels |

## Provisional choices (reversible)

- Replays pay the same base reward (+15); the real rule is set at Step 7.
- The result card shows **Replay** where the reference has "Claim 2x" (monetization is Step 7).
- Coin / diamond counters show values but have no "+" buttons yet (store is Step 7).
