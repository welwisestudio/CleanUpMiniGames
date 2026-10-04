# Validation report

Date: 2026-10-04 · Build **#9** (2026-10-04T12:17:14Z), base commit `23fe1ef` + the Steps 2–3 work that was later committed as `e2a0125`.
Environment: Windows 10, Node 24.21.0 (portable), Google Chrome via Playwright 1.63.0 (headless, WebGL). Platform profile: **dev adapter** (TEST MODE).

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Higgsfield connection / model | `models_explore get nano_banana_2`, balance, cost preflight (2k = 2 credits) | **PASS** | — | Jobs report backend `nano_banana_flash` |
| Generation | 22 Nano Banana 2 jobs (2k), all completed | **PASS** | `reference/masters/soccer-ball/` | — |
| Background Remover / alpha | 19 `remove_background` jobs; each cutout checked: transparent + opaque pixels present, margins ≥ 120 px at 2k, edges on light / dark / pitch backgrounds | **PASS** (sparkle on the gray FX sheet lost → regenerated on dark, PASS) | `reference/cutouts/`, `reference/review/` | Visual review by AI; game designer acceptance pending |
| Ball state registration | Fitted circle centre/radius per state vs clean master | **PASS** (±3 px, ±1 %) | `assetMeta.js` registration | — |
| Working points | Measured by script, marked and inspected | **PASS** (blade tip, nozzles, bristle contact, cloth centre) | review image | — |
| Unit tests | `npm test`: mechanics (incl. invalid gestures), saves, rewards, pause, audio gate, dev contract, content, **responsive layout** (UI size, compact HUD, object fit with jet room) | **PASS** 21/21 | console | — |
| Mouse playthrough | `playwright test mouse` (1280×800): menu → 6 stages → result → Replay → Pause → Menu | **PASS** | console | Automated benchmark |
| Touch playthrough | `playwright test touch` (390×844, DPR 2, CDP touch) | **PASS** | console | Emulated touch |
| Invalid gestures | taps, holding still, off-object drags, jet off-object / one spot, strokes while paused | **PASS** | — | — |
| Resize | menu at 6 sizes, 6 resizes mid-stroke, stage completed at 844×390 and 412×915, resize with the result open | **PASS** | — | — |
| Host / user pause | dev host pause; host resume keeps the user pause | **PASS** | — | Dev adapter only |
| Visual benchmark, phone | `playwright test visual` (390×844, DPR 2): menu, all 6 stages, result; HUD blocks on screen, no overlaps, pause ≥ 48 px, result buttons ≥ 44 px | **PASS** | `project/screenshots/step3/phone-touch-*.png` | — |
| Visual benchmark, desktop | same at 1280×800 | **PASS** | `project/screenshots/step3/desktop-mouse-*.png` | — |
| Responsive matrix | 360×640, 844×390, 768×1024, 1024×1024, 1920×1080, 2560×1080: no overlap, inside viewport, round object stays round | **PASS** | `project/screenshots/step3/matrix-*.png` | DPR 1 for the matrix |
| Console errors | asserted empty in every e2e test | **PASS** | — | — |
| Production build | `npm run build`; preview on 127.0.0.1:4173; all e2e tests run against the build | **PASS** | `dist/build-info.json` | Dev-profile build |
| SDK mock / real ads | — | NOT RUN | — | Step 7 / 11 |
| ZIP integrity | — | NOT RUN | — | Step 12 |
| Real devices | — | NOT RUN | — | Please check on a phone |

Automated times (bot sweeps, not human): mouse ≈ 36 s, touch ≈ 61 s per level.

Build size: JS 61 kB (game) + 1.2 MB (Phaser, 319 kB gzip), CSS + fonts ≈ 0.1 MB, art 2.2 MB.

Defects found and fixed in Step 3:
- The pause-modal test stroke pressed the larger Resume button (a test issue; the test now strokes around the buttons).
- On desktop, the menu labels overlapped (fixed: side-by-side shelves on landscape).
- Result buttons were 43 px on phones (fixed: ≥ 48 px).

Open defects: none known.

## Step 3 revision (CP2 feedback) · build #12 (2026-10-04T15:34:39Z)

Environment: Claude Code cloud session (Linux), Node 22.22.0, Playwright 1.63.0 with the bundled Chromium (WebGL via SwiftShader software rendering), production build served by `npm run preview`. Base commit `e2a0125` + uncommitted revision.

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test` (incl. new `scrub` mode test) | **PASS** 21/21 | console | — |
| Production build + preview | `npm run build`; `npm run preview`; HTTP 200 for the page, `build-info.json` (#12) and the new assets | **PASS** | `dist/build-info.json` | — |
| Real playthrough, phone | 390×844, DPR 2, real mouse input through all 6 stages via the e2e helpers (partial foam / scrub / rinse strokes captured mid-stage) → result card; no console errors | **PASS** (6.0 min, software WebGL) | `project/screenshots/step3-revision/phone-*.png` | Mouse at phone size, not CDP touch |
| Result buttons size | QA geometry on the result card | **PASS**: Home 57×48, Replay 121×48 CSS px | console | — |
| Landscape background | 1280×800, gameplay start | **PASS** | `project/screenshots/step3-revision/desktop-gameplay-background.png` | Landscape uses a crop of the portrait master |
| Coin fly | Watched in frames of the earlier capture run (build #10 code, same animation): coins small, shrinking into the counter, no oversized HUD coin | **PASS (visual)** | — | No frame of build #12 caught a coin mid-flight (timing under software rendering) |
| Full E2E suite | — | **NOT RE-RUN** on build #12 at the game designer's request (slow software-rendered WebGL in the cloud). On build #10 code (before the revision) all tests passed, with the touch tests needing a longer timeout. | — | Re-run `npm run check` on the Windows workstation before the commit |
| Real devices | — | NOT RUN | — | Please check on a phone |

