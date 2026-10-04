# Implementation plan

Updated: 2026-10-04 · Status: **draft for approval (Step 1).** Step numbers and checkpoints follow `instructions/01-workflow.md`. Nothing is implemented yet.

## Tech baseline (to be pinned at Step 2)

Phaser 3 + JavaScript ES Modules + Vite. Real versions and the lockfile are recorded when the project is created; the major version never changes silently. Design resolution 1080 × 1920 portrait, a documented scale mode, DPR up to 2.

Code layout (from `instructions/02-architecture.md`):

```
src/app/        bootstrap, state machine (boot/loading/menu/playing/completing/result), transitions
src/core/       clock, events, pause reasons, run/transition tokens
src/content/    levels/*.js (stage configs), campaignOrder.js, tools.js (tools + variants), economy.js
src/mechanics/  reveal.js, applyLayer.js, transformLayer.js, chunkBreak.js, dragToTarget.js, spotTargets.js
src/scenes/     BootScene, GameScene, UIScene (HUD/modals)
src/ui/         tool strip, progress bar, pills, buttons, result card, hint hand, layout
src/services/   SaveService, RewardService, AudioService, AssetService
src/platform/   contract.js, dev/ (dev adapter, TEST MODE); youtube/ only at Step 11
public/assets/  runtime assets only
scripts/        asset prep (alpha check, crop, export), build, packaging
tests/          data, contract, input, layout, production
```

## Steps

| Step | Work | Result / checkpoint |
|---|---|---|
| **1 (now)** | Style guide, reference analysis, Level 1 asset list, this plan | Game designer approves the plan and answers the open points |
| **2** | Create the Phaser + Vite project; platform contract + **dev adapter**; SaveService skeleton (load-before-write); level config schema + display order; the mechanic families for Level 1 (**chunk break, reveal, apply layer, transform layer**); tool follow + working points; stage sequencing and transition; HUD tool strip + progress; completion → simple result → next. Level 1 (Soccer Ball) playable **with clearly marked placeholder graphics**. | **CP1:** fresh production build on localhost; Level 1 fully playable with mouse and touch; tests for data, mechanics progress (real input, no `progress=1` shortcuts), dev-adapter contract |
| **3–4** | Style sample in Nano Banana 2 (ball-clean, one tool, one button, background) assembled in-game → approval. Then the full Level 1 set from `ASSET-MANIFEST.md`; Background Remover for cutouts; alpha review; registration. Final HUD and result-card UI in the generated style; particles; transitions and completion timings from the style guide; glove-hand hints. | **CP2:** Level 1 final visual + feedback reference accepted |
| **5–6** | Levels 2–5 (Rug, Golden Ball Trophy, Chair, Sneaker): new capabilities = region-restricted stages, per-stage camera framing, drag-to-target, spot targets, a floor-water decal. Menu with shelves (all objects open), loading screen + logo, settings (sound/music/vibration), pause. "Get +N" → next object; Home → menu. Responsive check on the device matrix. | **CP3:** five levels + full core UI |
| **7** | Meta/monetization per the confirmed design: coins, diamonds, tool-variant cards with purchases, store, Claim 2x, free rewards, No Ads form, all **through the dev adapter** (TEST MODE). Starting economy numbers. | **CP4:** clear rewards and spending |
| **8** | Scale content within the approved concept: one sample per new mechanic or theme, then batches (needs the agreed v1 object count) | Each batch approved |
| **9** | Full content + audio (audio direction proposed; the reference video has no sound) | **CP5:** complete game with sound |
| **10** | Gameplay, progression and economy balance; live playtest; before/after comparison | **CP6** |
| **11** | Real YouTube Playables SDK via the swappable adapter; cloud-only saves; host pause/mute; real rewarded ads; check current platform docs for No Ads, real-money purchases and banners | Platform test in YouTube |
| **12** | Final build, post-SDK balance check, ZIP, README, report | **CP7:** release accepted, version committed |

## Key technical decisions (AI-owned, reversible)

- **Object layers:** pre-aligned full-object images on a common canvas. Dirty and wet states are made as image edits from the clean master so they register; everything is masked by the clean alpha.
- **Coverage:** ≈48×48 grid per object, counting only cells inside the mask; brush stamps are interpolated along the stroke.
- **Chunking:** crust pieces precomputed at load from a seeded Voronoi split of the crust layer (stable per level ID).
- **Jet tools:** the impact point is offset above the nozzle; particles run between them.
- **One source of truth:** progress, rewards and purchases live in the game state; animations only display accepted changes.

## Risks and how they are handled

| Risk | Handling |
|---|---|
| Edited dirty states don't line up with the clean master | Reject and redo the edit; mask every layer by the clean alpha; never hand-stretch |
| Background Remover loses fine details (bristles, net) or leaves a halo | Review on light, dark and game backgrounds; regenerate the master with more contrast against the background if needed; never fall back to a local chroma key without approval |
| Too many layers or too large textures for mobile | 2k masters, runtime export sized to display; per-level asset bundles; measure the build size |
| Generation cost | Style sample first; the per-generation cost is checked and reported before each batch |
