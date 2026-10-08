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

## Step 6 — UI / reward pass 3 · build #47 (2026-10-06T19:49:49Z)

Focused checks only. Base: commit `7705b74`.

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test`: boost x2…x5 (each value pays base × m once; invalid values; parallel / repeated claims; cancel / error / unavailable → nothing; reload-safe; old x3 saves migrate), chest forfeit (only at 100 %, no reward, once) | **PASS** 35/35 | console | — |
| Hub, gameplay scale, completed screen, boost, chest (mouse + touch) | `npx playwright test step6-ui-pass3`: completed chair / sneaker show clean previews with checks > 40 px, others dirty; sneaker + rug larger, horizontally centred, no overlap with any HUD block; real rug play → chest 100 % → offer; cancelled ad keeps the chest; watched ad → reel → lands → +150 coins +2 diamonds once, 0 %; completed screen; meter showed x2, x3, x4, x5; cancelled boost → +0, meter runs again; watched → base × locked multiplier (x4 / x5 seen); menu offer + tap outside → forfeited, no reward | **PASS** 2/2 | `project/screenshots/step6/ui-pass3/<project>/` | Bot input |
| Text alignment (rendered pixels) | `python scripts/check_result_alignment.py ui-pass3`: title, reward row, chest label, Replay (yellow), Next (green), boost (pink) labels | **PASS** 12/12 (all within 2.4 %) | console | Meter chips and icons checked visually |
| Larger objects: tool usability | `npx playwright test levels5 -g "soccer-ball\|golden-trophy\|chair\|sneaker" --project=phone-touch`: all stages by real touch to the result | **PASS** 4/4 (rug covered by the pass-3 spec) | `project/screenshots/step5/` | Phone only; bot times longer (larger objects = longer sweeps) |
| Object scale (layout maths) | probe of `fitObject` for all levels: phone ball / rug / sneaker +14 % (width limit), trophy +16 %, chair 0 %; desktop sneaker +30 %, rug +28 %, trophy +10 %, ball +7 %, chair 0 %; landscape phone +9…+34 % | measured | — | Chair is height-limited |
| Screenshot boards | hub, completed screen, boost meter, chest offer, reel, object scale | DONE | `project/screenshots/step6/before-after/33–38` | — |

## Step 6 — UI pass 4 (multiplier bar, hub Chair / Rug, reel clipping) · build #49 (2026-10-06T21:06:29Z)

| Check | Command / steps | Result | Artifact |
|---|---|---|---|
| Unit tests | `npm test` (boost values x2 / x3 / x5, zones; x4 now invalid) | **PASS** 35/35 | console |
| Multiplier bar, hub, reel (mouse + touch) | `npx playwright test step6-ui-pass4`: hub chest column clear of all slots; real rug play → chest offer → watched ad → reel; completed screen: values seen only 2 / 3 / 5, marker moved through 21–24 positions in 2.2 s, lock + watched ad → base × locked value (x2 / x3 seen) | **PASS** 2/2 | `project/screenshots/step6/ui-pass4/<project>/` |
| Reel stays inside the card (rendered pixels) | `python scripts/check_reel_clip.py`: in the reel's rows, left and right of the card, 0 bright pixels on all 6 frames per project (5 scrolling + landed) | **PASS** 12/12 | console |
| Screenshot boards | multiplier bar, hub Chair / Rug, clipped reel | DONE | `project/screenshots/step6/before-after/39–41` |

## Step 6 — multiplier bar polish · build #50 (2026-10-06T21:20:19Z)

| Check | Command / steps | Result | Artifact |
|---|---|---|---|
| Completed screen + bar (mouse + touch) | `npx playwright test step6-ui-pass4` (unchanged spec): values 2 / 3 / 5 only, marker moves, lock + watched ad → base × value; hub and reel checks as before | **PASS** 2/2 | `project/screenshots/step6/ui-pass4/<project>/02-*` |
| Visual | close-up of the bar on phone and desktop: lane and x5 segment equal height, centred on the green face | DONE | `project/screenshots/step6/before-after/42-multiplier-bar-even.png` |

## Step 7 — alternative tools · build #53 (2026-10-06T21:53:47Z)

Focused checks only. Base: commit `212e04d`.

| Check | Command / steps | Result | Artifact | Limitations |
|---|---|---|---|---|
| Unit tests | `npm test`: families (3 options, one free base, all unlock types, radius 1–1.1, catalog valid); default equipped; locked tool cannot be equipped; coins purchase once (double tap), switch back and forth; insufficient coins / diamonds change nothing; diamonds purchase; ad cancel / error / unavailable → nothing; parallel ad results → one unlock; owned ad tool needs no second ad; reload persistence; bad save data sanitised | **PASS** 41/41 | console | — |
| Real input, rug (mouse + touch) | `npx playwright test step7-tools`: foam stage cards (equipped / 15 coins / ad); buy foam gun (20 → 5 coins), equipped, second tap charges nothing; partial progress 26 %; ad cancelled, ad failed → nothing changes, progress identical; ad watched → foam cannon unlocked + equipped, progress identical; switch back to free sprayer and to the foam gun → progress identical; stage completed with the foam gun. Scrub stage: not enough coins (oval 15, 5 coins) and not enough diamonds (drill 5, 4 diamonds) → nothing changes; completed with the base brush. Reload: foam gun + cannon still owned, foam gun still equipped; drill bought with 5 diamonds; scrub completed with the drill; no cards on the next stage | **PASS** 2/2 | `project/screenshots/step7/<project>/` | Bot input |
| Layout + pause | `npx playwright test step7-tools-layout`: landscape phone (column, 67 px cards), tablet (row, 115 px), small phone (row, 72 px): all cards inside, no overlap with counters, tool strip, pause, chests or the object; card tap while paused changes nothing | **PASS** | `project/screenshots/step7/responsive/` | — |
| Base tools complete their stages | `npx playwright test levels5 -g "soccer-ball\|golden-trophy\|sneaker" --project=phone-touch` (all card stages with the default tools; rug covered above) | **PASS** 3/3 | console | Phone only |
| Screenshot boards | cards, locked states, equip / switch, persistence + diamonds | DONE | `project/screenshots/step6/before-after/43–46` | — |

## Step 7 — phone tool-card placement · build #54 (2026-10-07T18:19:40Z)

| Check | Command / steps | Result | Artifact |
|---|---|---|---|
| Layout (5 viewports) | `npx playwright test step7-tools-layout`: phone portrait 390×844, phone landscape 844×390, small phone 360×640, tablet 768×1024 → one bottom row below the object, cards ≥ 67 px; desktop 1280×800 → right column beside the object; all cards inside, no overlap with HUD / chests / object | **PASS** | `project/screenshots/step7/responsive/` |
| Tool flow, phone touch | `npx playwright test step7-tools --project=phone-touch` (buy, insufficient, ad cancel / fail / success, mid-stage switches keep progress, reload persistence, diamond buy) | **PASS** | `project/screenshots/step7/phone-touch/` |

## Step 8 Batch A — levels 6–15 · build #55 (2026-10-08T13:12:57Z)

| Check | Command / steps | Result | Artifact |
|---|---|---|---|
| Unit | `npx vitest run` — incl. PointTargets hold / tap / pull (anti-cheat, remove cuts / install bakes, ≤10 % card modifier), parts into slots + `fromLayer`, paint source (empty roller paints nothing, dip loads, load runs out), catalog of 15 levels + Batch A stage sequences, levels 1–5 families unchanged, new families rules | **51 / 51 PASS** | — |
| Levels 6–15, phone touch (dev server) | `E2E_BASE=… npx playwright test step8-batch-a --project=phone-touch` — every stage of all 10 levels by real touch, stage transitions, final state, result card, Replay / Next (alternating), menu order 1–15, no console errors | **11 / 11 PASS** (16.4 min) | `project/screenshots/step8/phone-touch/` (start / mid / final / result per level), `batch-a-overview-*.png` |
| Levels 6–15, desktop mouse (production #55, preview) | `npx playwright test step8-batch-a --project=desktop-mouse` — same checks; Next of level 15 → object list | **11 / 11 PASS** (9.8 min) | `project/screenshots/step8/desktop-mouse/` |
| Regression levels 1–5 (production) | `npx playwright test levels5 --project=phone-touch -g "soccer-ball\|chair\|sneaker"` (full play, Replay, Next — sneaker now → rain boots) | **3 / 3 PASS** | `project/screenshots/step5/` |
| Regression alternative tools (production) | `npx playwright test step7-tools.spec --project=phone-touch` (buy, insufficient, ad cancel / fail / success, mid-stage switch, persistence) | **1 / 1 PASS** | `project/screenshots/step7/phone-touch/` |

Not run (by instruction: no full historical suite): rug / golden-trophy level runs, layout / visual / step6 specs. Stage times of the test bot (not a player): chunk-break stages are the longest (boots chisel 23–46 s, crate / bench peel 8–38 s after tuning); all other stages 1–19 s. Known limitation: the keyboard (a very wide object) is small on narrow phones.

## Step 8 Batch B — levels 16–50 + cosmetic skins · build #60 (2026-10-08T21:05:56Z)

| Check | Command / steps | Result | Artifact |
|---|---|---|---|
| Unit | `npx vitest run` — catalog of 50 (validation, stage counts by range 7–9 / 8–10 / 9–12, 15 → 16, 50 → end), every 16–50 level uses its generated stack / background / thumbnails / regions, every new tool and mechanic used, levels 1–15 stage counts unchanged, FillLevel drain / fill (hold inside only, top-down / bottom-up), skins (8 × 3, unlock types, coins once, diamonds, ad only when earned, cancel / fail / unavailable nothing, parallel ad once, persistence, separate from functional tools, save sanitising) | **62 / 62 PASS** | — |
| Levels 16–50, desktop mouse (production #56 → fixes #57–#59) | `npx playwright test step8-batch-b --project=desktop-mouse` — every stage by real mouse input, transitions, final state, result, Replay / Next (alternating; 50 → object list), no console / request errors | **32 / 36 on #56**; the 4 failures = hose fill stage (jet tool on a hold mechanic, fixed in LevelScene); pool, bathtub, aquarium, fountain + tuned grill / lion / stove re-run on #57–#59: **PASS** | `project/screenshots/step8b/desktop-mouse/` (start / mid / final / result per level) |
| Levels 16–50, phone touch 390×844 (production #59) | `npx playwright test step8-batch-b --project=phone-touch` | **36 / 36 PASS** (56 min) | `project/screenshots/step8b/phone-touch/` |
| 50-level menu (mouse + touch) | `step8-batch-b -g "menu lists"`: 50 objects in order, scroll to the middle and the end (#60: long names fit their column) | **PASS** 2/2 | `…/menu-top.png`, `menu-middle.png`, `menu-end.png` |
| Cosmetic skins (mouse + touch, #60) | `npx playwright test step8-skins`: skin button on the equipped foam card → picker; insufficient diamonds; coins purchase charged once + equipped; sprite changes, radius / offsets / jet unchanged; ad cancel and failure give nothing; ad success unlocks + equips; equip back; stage completes with the skin; reload keeps ownership + equipped skin; Default restores the base sprite | **PASS** 2/2 | `project/screenshots/step8b/<project>/skins-*.png` |
| Regression levels 1–5 + alternative tools (production #59) | `npx playwright test levels5 step7-tools` (both projects) | **12 / 12 PASS** | `project/screenshots/step5/`, `step7/` |
| Regression Batch A sample (production #59) | `BATCH_A=rain-boots,desk-fan,porcelain-vase … --project=desktop-mouse` (incl. Next 15 → 16); `BATCH_A=garden-bench,keyboard … --project=phone-touch` | desktop **4 / 4 PASS**; phone keyboard **PASS**, garden bench **1 of 3 runs PASS** — the test bot leaves thin strips at 93.6 % with an empty roller on the roll stage (the game correctly asks for a re-dip; level unchanged since its acceptance) | test-results |

Stage times are the test bot's, not a player's: most stages 1–15 s; longest: garden-grill carbon scrape ~38 s (thin crust on the grate), stone-patio moss brush 26 s (phone); several zone stages on small regions finish in < 1 s (cleaver edge / handle, grill grate, sign post, lamp base, shower tray). Size: dist 52 MB unpacked / 49.4 MB ZIP; boot images 12.3 MB (Batch B adds 2.46 MB: 70 thumbnails 320 px, 9 tools, 24 skins) + JS 1.55 MB; per-level lazy art 16–50: 0.63–2.25 MB (avg 1.15 MB). Not checked here: real YouTube SDK / platform limits (integrated at the end per AGENTS.md).
