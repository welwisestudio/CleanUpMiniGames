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


## Step 4 (closing) + Step 5 · build #18 (2026-10-04T20:07:46Z)

Environment: Windows 10, Node 24.21.0, Google Chrome via Playwright 1.63.0 (headless, GPU WebGL), production build served by `vite preview` on 0.0.0.0:4173. Platform profile: dev adapter (TEST MODE). Base commit `b263241` + uncommitted Steps 4–5 work.

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test`: previous 21 + stage order of levels 2–5, drag-to-target (empty presses / wrong drop do nothing), spots (taps / outside strokes do nothing) | **PASS** 24/24 | console | — |
| All five levels, desktop mouse (1280×800) | `npx playwright test levels5 --project=desktop-mouse`: menu → every stage by real mouse input → result → Replay (stage 1 again) → Next (opens the following level); Sneaker has no Next | **PASS** 5/5 on build #18 | `project/screenshots/step5/desktop-mouse-*` | Bot sweeps, not human times |
| All five levels, phone touch (390×844, DPR 2) | same with CDP touch events, list scrolled by touch drag | **PASS** 5/5 on build #17 (only the result-label size and button-label fit changed in #18); Soccer Ball + Chair re-run on #18: **PASS** 2/2 | `project/screenshots/step5/phone-touch-*` | Emulated touch |
| Stage order | each run asserts the exact reference stage list per level | **PASS** | — | — |
| Final object states / result | screenshots of every result card; clean object pictures and rewards (+15, +15, +20, +20, +20) | **PASS** (visual) | `*-result.png` | — |
| Soccer Ball regression | `mouse`, `touch`, `invalid`, `resize`, `pause`, `visual` (phone + desktop + responsive matrix) | **PASS** 8/8 (build #17) | `project/screenshots/step3/` | — |
| Main UI | `npx playwright test step5-ui` (phone + desktop): menu, touch / wheel scroll to the last row, settings from the menu (Sound toggle), HUD with hint, pause, settings from pause | **PASS** 2/2 | `project/screenshots/step5/ui-*` | — |
| Hint never changes progress | hint shown at level start (first-time) while progress stays 0 % (screenshots); the hint code has no access to mechanics | **PASS** (design + visual) | `ui-*-4-hud-hint.png` | — |
| Step 4 video | Soccer Ball played by touch, recorded via Chrome screencast → MP4 (2:34, 390×844) | **DONE** | `project/videos/step4-soccer-ball.mp4` | Bot input (chisel phase is long because the bot sweeps densely) |
| Console errors | asserted empty in every e2e test | **PASS** | — | — |
| Real devices | — | NOT RUN | — | Please check on a phone via the LAN URL |

Automated level times (bot, desktop mouse, build #18): ball 61 s, rug 32 s, trophy 60 s, chair 39 s, sneaker 44 s. Phone touch (build #17): 147 / 60 / 134 / 73 / 93 s. These are not human times.

Build size: JS 98 kB (game) + 1.2 MB Phaser; runtime art 7.3 MB (all five levels); `dist` 9.3 MB.

Defects found and fixed during Step 5:
- The QA snapshot threw on the trash-bin stage (test tooling).
- The trash-bin tool had no held sprite and crashed `setTool`.
- Speaker / vibration icons were split into pieces; shoe / bottle trash names were swapped.
- Result-card labels overflowed with three buttons.
- Chair seat stages were too fast (smaller brush).
- Menu labels overlapped the next shelf.

Open / for Step 6:
- Objects are framed smaller on landscape / desktop.
- The "more objects" footer sits under the status badges on phones.
- Desktop menu labels are small relative to the thumbnails.

## Step 6 — first bug-fix pass (16 review items) · build #24 (2026-10-04T22:14:58Z)

Environment as above. Base commit `b263241` + uncommitted Steps 4–6 work.

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test`: + soft auto-complete (small scattered remnants finish, a big patch does not), putty dip (empty knife does nothing, one dip fills one dent) | **PASS** 26/26 | console | — |
| Every stage of every level, hint + real input | `npx playwright test step6-review` (phone touch + desktop mouse), `?hints=always`: hint hand sampled for 2.4 s per stage, then the stage is played by real input to the result | **PASS** 10/10; 72 hint samples on contact stages, **0 outside** the active area | `project/screenshots/step6/<project>/` | Bot input |
| All five levels end to end | `npx playwright test levels5` | **PASS** 5/5 per project | `project/screenshots/step5/` | — |
| Soccer Ball regression | `mouse`, `touch`, `invalid`, `resize`, `pause`, `visual`, `step5-ui` | **PASS** 10/10 | `project/screenshots/step3/` | — |
| Before / after | review screenshots vs. build #24 | DONE | `project/screenshots/step6/before-after/01–10` | — |

## Step 6 — second pass (review rules 1–2, items 1–9) · builds #27–#29 (final #29, 2026-10-05T17:32:38Z)

Environment as above. Base commit `2229c2d` + uncommitted Step 6 work. Builds #28 and #29 changed only the chisel hint path (#28) and a read-only QA field (#29) after the runs on #27. As agreed with the game designer, the historical 42-test suite was **not** re-run; validation is focused on the changed systems.

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test`: + chisel soft-complete (last small crumbs break off; three largest chunks left → no auto-complete), duster tall footprint (band ≈ head shape, not a circle) | **PASS** 28/28 | console | — |
| Hold to release, all five levels | `npx playwright test step6-release` (desktop mouse + phone touch, build #27): every stage played by real input with the pointer kept down at completion; asserted `pendingRelease`, same stage, tool still shown while the pointer keeps moving for 1.2 s; next stage only after release | **PASS** 10/10. 35 stages held per project: manual 100 % (chisels, putty, sanding) and gentle auto-complete (all brush / jet stages); chair trash completes on the drop itself | `project/screenshots/step6/pass2/<project>/*-mid.png`, `*-held.png` | Bot input |
| Chair + Sneaker review (hint in area, play to result) | `npx playwright test step6-review -g "chair\|sneaker"` (build #27) | Chair **PASS** 2/2 (0 hint samples outside on every contact stage, incl. duster, drill, sanding). Sneaker desktop **PASS**; phone **FAIL**: 1 chisel hint sample above the laces, outside the shoe → fixed (hint follows remaining chunks, build #28) | `project/screenshots/step6/<project>/` | — |
| Chisel hint re-check (all chisel levels) | `step6-review` soccer-ball / golden-trophy / sneaker on build #28 (run completed before it was stopped) | **PASS** 6/6; chisel hints 0 outside on all three levels, both projects | log | — |
| Focused fix check: Sneaker chisel, phone touch | `npx playwright test step6-chisel-hint --project=phone-touch` (build #29): hint sampled on the full crust and again at 50 % after real partial swipes, against the actual remaining crust chunks; then finished by touch with the finger held | **PASS**: 32 + 34 hint samples, **0 outside** the remaining crust; stage completed (manual 100 %); held 1.2 s in `pendingRelease` with the tool shown; advanced to rinse-mud only after release | `pass2/phone-touch/sneaker-chisel-hint-{start,partial}.png`, `sneaker-chisel-held.png` | Emulated touch |
| Foam can reach on phones | found by the phone run on build #26 (seat stuck at 55 %: the finger had to leave the 390 px screen) → can held at 55°, impact almost above the finger; phone chair run **PASS** on #27 | **PASS** after fix | `chair-04-foam-can-mid.png` | — |
| Before / after | review screenshots vs. build #27 | DONE | `project/screenshots/step6/before-after/11–18` | — |
| Real devices | — | NOT RUN | — | Please check on a phone |

Known limitation: on the 390 px phone, while the drill brush works the right end of the sneaker, the drill body extends past the right screen edge (stage fully playable).

## Step 6 — polish pass (trophy outline, putty fill, sanding targets) · build #32 (2026-10-05T18:29:49Z)

Focused checks only, as agreed (no full suite).

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test` | **PASS** 28/28 | console | — |
| Golden Ball Trophy dry-brush / detail-brush (mouse + touch) | `npx playwright test step6-polish -g trophy` (build #31): chisel by real input → dry-brush: no outline (QA `outline: null`), hint shown; played with the pointer held → waited in `pendingRelease` with the tool shown → advanced only after release; detail-brush (pedestal only) still has its outline | **PASS** 2/2 | `project/screenshots/step6/polish/<project>/trophy-*` | Trophy not re-run on #32 (that build changed only chair data) |
| Chair putty → sanding → stain → result (mouse + touch) | `npx playwright test step6-polish -g chair` (build #32): stages 1–6 by real input; putty: dip → load → fill, held at completion → waits for release; sanding shows 4 circle targets (QA `circles`, r 54), work area = whole patches incl. the parts over the chair edge, held at completion (gentle auto-complete) → waits for release; stain starts with no outline and no putty / hole residue; played to the result | **PASS** 2/2 | `polish/<project>/chair-07…99` | Bot input |
| Putty coverage offline | dent decal (70) vs. putty stamps (101): ragged stamp alone left up to 5.3 % of one hole visible; with the solid base 0 % | **PASS** | — | — |
| Before / after | review screenshots vs. builds #31–#32 | DONE | `project/screenshots/step6/before-after/19–21` | — |

## Step 6 — chair duster fix · build #33 (2026-10-05T18:51:09Z)

Focused checks only.

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test` | **PASS** 28/28 | console | — |
| Chair duster stage, mouse + touch | `npx playwright test step6-duster`: trash by real input → duster stage start (no outline) → real swipes over the left post area only (41 %) → finished with the pointer held → `pendingRelease`, tool shown → release → seat stage | **PASS** 2/2 | `project/screenshots/step6/duster/<project>/chair-02-dust-{1-start,2-partial,3-done-held}.png` | Bot input |
| Pixel check on those screenshots | `python scripts/check_duster_pixels.py`: dusted area brightness 159–169 → 111–113 in the partial frame; untouched right side 145 → 145 (still dusty) → 103–105 at the end; hole centres 23–72 at start / partial / done, unchanged (±1) and far darker than the dusty frame | **PASS** 5/5 checks per project | console | — |
| Before / after | review screenshots vs. build #33 | DONE | `project/screenshots/step6/before-after/22–23` | — |

## Step 6 — UI / reward pass · build #36 (2026-10-05T19:40:06Z)

Focused checks only (no historical suite). Ads: dev adapter, outcome set explicitly per check.

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test`: + x3 once (parallel claims → 1 grant, adBusy pause during the ad), x3 cancel / error / unavailable → nothing, x3 flag survives reload, timed chest countdown / claim once / reset / reload / clock jump repair, progress chest 20→100 %, duplicate run ignored, stays 100 % while full, cancel / error / unavailable keep it, parallel claim → 1 grant, reset + persisted, save v1 → v2 migration | **PASS** 34/34 | console | — |
| Menu (mouse + touch) | `npx playwright test step6-rewards -g menu`: header widgets do not overlap; all 5 levels reached by real wheel / touch-drag scrolling; timer counts down | **PASS** 2/2 | `project/screenshots/step6/rewards/<project>/01–02` | — |
| Timed chest (mouse + touch) | same spec `-g "timed chest"`: tap while counting → nothing; saved timer in the past + reload → ready; double tap → +15 once, timer 5:00; reload → coins and running timer kept | **PASS** 2/2 | `03–05` | Real clock; "due" state reached by seeding the saved timer |
| Result, x3, level chest (mouse + touch) | same spec `-g result` (3 real rug runs per project, chest seeded at 40 %): normal reward +15 credited once; x3 not-earned / error → +0, offer stays; x3 earned with a double tap → 45 total once; chest 60 → 80 → 100 %; offer opens; cancelled ad keeps 100 %; Later keeps it (also after reload); claim from the menu with a double tap → +150 coins +2 diamonds once; 0 % persisted | **PASS** 2/2 | `06–13` | Bot input; chest seeded to save two level runs |
| Responsive matrix | `npx playwright test step6-ui-shots`: menu, full-chest offer and result card at 390×844, 844×390, 768×1024, 900×900, 1280×800 (result card resized live): all buttons / widgets inside the screen, no overlaps | **PASS** | `project/screenshots/step6/ui/` | Landscape phone: result / offer card buttons ≈ 35 CSS px tall (card fitted to the 390 px height) |
| Screenshot boards | menu, completed screen, x3 states, timed chest, level chest | DONE | `project/screenshots/step6/before-after/24–28` | — |
| Real ads / YouTube SDK | — | NOT RUN (out of scope) | — | Step 11 |

## Step 6 — UI corrections (hub revert, chest placement, x3 button, text alignment) · build #41 (2026-10-05T20:56:15Z)

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test` | **PASS** 34/34 | console | — |
| Hub + completed screen (mouse + touch) | `npx playwright test step6-ui-fix`: hub = approved background / shelves, no emblem; each chest centred under its counter (Δx < 2 px), below it, above the first shelf row, left of settings, chests not overlapping; real rug play → completed screen; x3 cancelled → +0, claimed → 45 total | **PASS** 2/2 | `project/screenshots/step6/ui-fix/<project>/01–04` | Bot input |
| Text alignment on the rendered completed screen | `python scripts/check_result_alignment.py` (text pixels vs. measured anchors; tolerance 2.5 % of height, 1.5 % of width): "Completed" −0.3 / −0.2 %; reward row −1.6 / −1.0 %; chest label −1.6 / +0.1 %; Replay / Next −0.8…−0.3 %; horizontal ≤ 0.7 % | **PASS** 10/10 | console | x3 button and Home icon checked visually (multi-colour content) |

## Step 6 — UI polish 2 (HUD chests, hub column, button labels, green x3) · build #42 (2026-10-05T21:48:15Z)

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test` | **PASS** 34/34 | console | — |
| Hub, gameplay HUD, completed screen (mouse + touch) | `npx playwright test step6-ui-polish2 -g hub`: hub chests one column, left, below the counters, compact header, no overlap with any level (also after scrolling); HUD chests present, inside the screen, no overlap with counters / tool strip / pause / object; real rug play → completed screen, HUD chests still present; x3 cancel → +0, claim → 45 | **PASS** 2/2 | `project/screenshots/step6/ui-polish2/<project>/01–07` | Bot input |
| Responsive (hub + HUD) | same spec `-g responsive`: 844×390, 768×1024, 360×640 | **PASS** | `ui-polish2/responsive/` | — |
| Completed-screen text alignment (rendered pixels) | `python scripts/check_result_alignment.py ui-polish2`: title −0.3 / −0.2 %; reward row −1.6 / −1.0 %; chest label −1.6 / +0.1 %; Replay / Next −0.9…−0.7 % (vs. the new label centre); x3 "Claim" −0.9 / −0.4 %; horizontal ≤ 0.9 % | **PASS** 12/12 | console | Home icon and the x3 plate checked visually |
| Screenshot boards | gameplay HUD, hub header, completed screen, x3 button | DONE | `project/screenshots/step6/before-after/29–32` | — |

## Step 6 — x3 button v4 (purple + clapperboard icon) · build #43 (2026-10-05T22:09:17Z)

| Check | Command / steps | Result | Artifact |
|---|---|---|---|
| Unit tests | `npm test` | **PASS** 34/34 | console |
| Completed screen (mouse + touch) | `npx playwright test step6-ui-polish2 -g "hub column"`: real rug play → completed screen; x3 cancel → +0, claim → 45; hub / HUD checks unchanged | **PASS** 2/2 | `project/screenshots/step6/ui-polish2/<project>/04–07` |
| Text alignment (rendered pixels) | `python scripts/check_result_alignment.py ui-polish2`: x3 "Claim" −0.1 / −0.5 % (purple label centre); all other completed-screen text unchanged and within tolerance | **PASS** 12/12 | console |
