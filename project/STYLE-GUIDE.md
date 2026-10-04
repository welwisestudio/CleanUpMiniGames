# Visual direction (Style Guide)

Status: **Step 3 visual benchmark produced (Soccer Ball), waiting for the game designer's acceptance (CP2).** Benchmark screenshots: `project/screenshots/step3/`. CP1 feedback applied: larger UI, responsive layout instead of a fixed 9:16 canvas. Date: 2026-10-04.

Rule: **we follow the reference's visual direction; we do not invent another one.** All assets are our own (Nano Banana 2 via Higgsfield MCP). No reference graphics, logo, name or UI art is copied or traced.

Colour values were measured from the screenshots (median-cut sampling of UI regions) and rounded. Proportions were measured on the 562×907 screenshots and the 612×1080 video frame, then converted to our design resolution.

## 1. References used (file / timecode)

| Aspect | Source |
|---|---|
| Gameplay HUD and tool strip | `Soccer_ball_water_gun_start.PNG`, `Soccer_ball_chisel_progress.PNG`; video 00:06–01:00 |
| Variant cards | `Soccer_ball_water_gun_start.PNG`, `Rug_foam_brush_cleaning.PNG`, `Chair_duster_start.PNG`; video 01:44, 02:04, 05:06 |
| Result card | `Soccer_ball_completed_reward.PNG`; video 01:01.75–01:04, 02:20, 04:04 |
| Menu shelves | `Menu_screen.PNG`; video 00:00, 04:12, 08:04–08:16 |
| Store | `Store_screen.PNG`; video 12:38–12:44 |
| Materials and dirt | ball 00:06–00:58, rug 01:10–02:12, trophy 02:24–04:00, chair 04:20–06:04, sneaker 06:20–07:52 |
| Interaction outlines and hints | `Handle_item.png`, `Nail_item.png`, `Chair_trash_removal.PNG`, `Chair_scraper_targets.PNG`; video 00:12, 02:36, 05:28, 10:04 |
| Loading screen | `Loading_screen.png`; video 00:04 |

## 2. Palette

### 2.1 UI palette (measured)

| Role | Hex | Where in the reference |
|---|---|---|
| **Primary action green** | `#31C339` fill · `#28B22C` bottom edge · `#9ADC9C` top highlight | Claim 2x, store price buttons |
| Selected tool frame | `#4FC24D` | frame of the current tool tile |
| Progress fill | `#7CE818` with `#C4F976` highlight; track dark navy `#0D233E` at about 70 % opacity | stage progress bar |
| Home / secondary button | `#FFD729` fill · `#F4CD2D` lower tone · `#937D2E` shadow edge | Home button on the result card |
| Offer / limited ribbon | `#F83D64` · light `#F88CA6` | "Limited Offer" ribbon |
| Store awning | `#0B96F5` / `#089BFA` stripes with `#FCFFFF` | store header |
| Cream card surface | `#FFFBF7`, `#FAF5ED`; label strip `#FFF3DE` | variant card label, store cards |
| Pure white surfaces and borders | `#FFFFFF` | HUD pills, tiles, pause, result card body |
| Tool tile (current) | gradient `#F6DEC6` → `#E4BE95` | large centre tile |
| Tool tile (small) | `#D4AF87` → `#CA9964` | prev / next tiles |
| Result ribbon / card rim | ribbon `#F1D4B6` with shade `#D9B999`; rim tan `#D9B999` | "Completed" banner |
| Variant card fills | blue `#6BA6FF` · pink `#FF69A5` · orange `#FFC75A` | 3 bottom cards (fixed order) |
| Menu background | `#FFF7F7` main, `#F7EFE7` header band | shelves screen |
| Shelf | top `#F7F3EE` · front `#E7E2D7` · shade `#D7C8BC` | shelves |
| Store page and section tints | page `#FFF3F7`; starter `#E0EBFC`; diamonds `#F7E6FD`; coins `#E6F5F1` | store sections |
| Text, numbers | dark navy `#344660` | currency counters |
| Text, titles on cards | navy `#3F5B83` | "Starter Pack" |
| Text, card labels | dark brown `#594D36` | "Equipped", "Free" |
| Text, neutral dark | `#535653` | "Reward:" |
| Big titles | white `#FFFFFF` with dark outline `#3A3A3A` and soft drop shadow | "Completed", "Store" |
| Coin | gold `#EDD16F` · `#D0A256` · rim `#A66834`, star emboss | coin icon |
| Diamond | pink-magenta `#E2A7E6` → deep magenta, white facets | diamond icon |
| No-Ads badge | red `#ED2317` with white | No-Ads button |
| **Interaction outline** | pure bright green `≈#00F010` | outlines on chunks and items; dashed spot circles |
| Result dim | black at ≈70–75 % opacity over the scene | behind the result card |

### 2.2 Scene and object palette (observed character)

- **Backgrounds** are soft, slightly desaturated and often blurred so the object stays the brightest, sharpest element. Each object has its own themed background: green pitch with goal net; white bathroom tiles; warm trophy-shelf interior; warm peach room; neutral grey studio floor.
- **Dirty states:** earthy browns `#5A3E2A`–`#9B7A55` (mud, crust), olive grime, grey dust, mossy green-black mold. Foam is near-white with cool grey shadows `#F4F6F8`/`#C9D0D8`.
- **Clean states:** saturated, glossy hero colours (ball yellow ≈`#F5C400` + blue ≈`#2F7FD6`; rug forest green; trophy rich gold; chair warm brown wood + mustard-yellow leather; sneaker white with red and blue accents).
- **Contrast arc:** every level goes from dull, low-saturation dirt to a high-saturation, high-gloss finish. The palette itself carries the "makeover" payoff.

## 3. Outlines

- **Objects, tools and backgrounds have no drawn outlines.** They are semi-realistic renders defined by light and shadow.
- **UI surfaces:** white rim ≈ 6 px at 1080 width on tiles, pills and the pause button, plus a soft dark outer shadow (1–2 px, ≈25 % black).
- **Selected tile:** green `#4FC24D` frame ≈ 9 px at 1080 width.
- **Big titles:** thick dark outline (≈6 px at 1080 width) + 3–4 px drop shadow.
- **Button labels:** white text with a thin darker-green or dark outline.
- **Interaction outlines** (code-generated from the sprite alpha, not painted): bright green ≈`#00F010`, 3–4 px on chunks and items, thin lines along crack seams; **dashed** green circles for spot targets. They appear only while relevant.

## 4. Materials, light, level of detail

- **Rendering style:** semi-realistic, glossy "premium casual 3D render" look. Soft studio key light from the upper left/front, gentle ambient occlusion, strong specular highlights on clean glossy surfaces (ball leather, gold, wet surfaces).
- **Dirt reads as physical material:** thick cracked mud crust with chunky volume; dry dust as a matte grey haze; stains as darker translucent blotches; mold as dark green-black specks; foam as thick white bubbles that become swirled patterns when scrubbed; wet state as visible droplets and specular sheen.
- **Tools:** realistic, slightly idealised props with clean shapes and saturated plastic accents (red sprayer, wooden brush, blue cloth). They read at ~15–25 % of screen width.
- **UI:** glossy, chunky, rounded "toy-like" casual UI. Flat saturated fills with a lighter top and a darker bottom edge (2.5D press look). No skeuomorphic textures on UI surfaces.
- **Avoid:** cel shading, pixel art, painterly brush strokes, hard black outlines, flat vector objects, photo-real gritty horror dirt.

## 5. Camera and object scale

- **Portrait-first composition** (the reference is portrait 9:16), adapted responsively to any window (§7, §9).
- Object view: three-quarter front, slightly elevated camera. The object is centred horizontally just below the HUD and fitted to the free play area (on a 390×844 phone ≈ 84 % of the width), with a soft contact shadow under it.
- Per-stage reframing is allowed (chair seat close-up 04:44; cannon close-ups). Camera moves are short eased pans/zooms (≈0.5–0.7 s) between stages, never during a stroke.
- The tool rest position is bottom centre, between the object and the card zone.

## 6. Fonts

The reference uses two rounded, heavy sans faces: a chunky display face for titles/buttons and a rounded geometric sans for labels and numbers. The logo is a separate bubbly multicolour lettering.

Free (OFL) equivalents, **bundled locally** from `@fontsource/rubik` and `@fontsource/nunito` 5.3.0 (weights 800/900; no runtime font CDN):

| Use | Proposed font | Weight | Treatment |
|---|---|---|---|
| Big titles ("Completed", "Store"), button labels | **Rubik** | 800–900 | White fill + dark outline + drop shadow (titles); white with thin outline (buttons) |
| Numbers, labels, card text | **Nunito** | 800 | Navy / dark-brown fill, no outline |
| Logo | generated image (Nano Banana 2) | — | Our own name in a bubbly multicolour style at Step 5 |

Both fonts include Latin and Cyrillic. The final choice is revisited after the localization decision. Minimum readable size: 28 px at 1080 width for labels, 36 px for numbers in the HUD, 64 px+ for big titles.

## 7. UI proportions (responsive; replaces the fixed 1080 × 1920 column)

CP1 feedback: the UI must be larger, and the layout must adapt to the window instead of a fixed 9:16 canvas.

- **UI unit `u`:** 1 u = 1 CSS px on a 390-px-wide phone; `u = clamp(min(cssW / 390, cssH / 700), 0.85, 1.6)`. The canvas renders at device pixel ratio (up to 2) for sharp art and text.
- **Sizes in u:**

| Element | Size (u) | Anchor |
|---|---|---|
| Current tool tile | **80** (CP1 prototype ≈ 53 CSS px on a phone) | top centre |
| Prev / next tiles | 46, centres ±92 from the current tile | same row |
| Progress bar | 108 × 22, "NN %" inside | under the current tile |
| Currency pills | 128 × 44 + icon 52 | top-left |
| Pause button | **58** (≥ 48 CSS px touch target everywhere) | top-right |
| Margins | 14 | all edges |

- **HUD rows:** wide screens use one row (pills stacked | tool strip | pause), as in the reference. Narrow phones switch to two rows (pills side by side + pause, then the tool strip), so nothing overlaps.
- **Object:** fitted into the free play area below the HUD: radius = min(42 % of the width, 29 % of the play height; 30.5 % on landscape). This leaves room below for the resting tool and for jet tools. The object is never stretched.
- **Tools:** sized relative to the ball (object-local units); the finger offset and jet length scale with them.
- **Result / pause card:** the generated card is scaled to fit ≤ 92 % of the width, ≤ 440 u and ≤ 86 % of the height; result buttons are ≥ 48 CSS px tall on phones.
- **Menu:** shelves sit in one column on portrait screens and side by side on landscape screens, 2 objects per shelf, with labels under each shelf.

## 8. Image vs. dynamic text

- **Images (generated):** backgrounds; object state layers; tools; particles (mud chunks, dust puff, droplet, sparkle); coin and diamond icons; button surfaces (green, yellow, white square); tile surfaces (large, small); progress bar track and fill; result card frame with blank ribbon; home icon; ad badge icon; pause icon; no-ads icon; glove hand; logo; shelf; menu header icons (store, settings).
- **Dynamic text (fonts):** every number, %, label ("Equipped", "Free", "Reward:", "Claim 2x", "Get +N", "Completed", "Store"), prices and titles. **No text baked into images**, except the logo.
- **Code-drawn:** interaction outlines (from alpha), dashed circles, hose lines, confetti strips, the dim overlay and the contact shadow.

## 9. Layout: phone / landscape / desktop

- The canvas fills the whole window at any size and aspect; there are no letterbox bars and no fixed column.
- **Backgrounds:** the portrait art on portrait/square windows, the landscape art on wide windows, always cover-fitted (uniform scale, cropped edges, never distorted).
- **HUD:** anchored to the screen corners and the top centre, scaled by `u`.
- **Gameplay:** the object is centred in the play area.
- **Modals:** stay card-shaped and centred.
- **Resizing:** relayout is live on resize and DPR change; a stroke in progress ends cleanly.
- **Verified:** 390×844 (DPR 2), 360×640, 844×390, 768×1024, 1024×1024, 1280×800, 1920×1080, 2560×1080 (`project/screenshots/step3/`). Physical devices are not tested yet.

## 10. Animation style

Measured timings (see `REFERENCE-ANALYSIS.md` §4):

| Moment | Animation |
|---|---|
| Tool follow | The tool follows the pointer with a light lag (≈60–80 ms ease) and sits slightly above the finger. Brushes tilt ±10° with horizontal speed; the cloth squashes slightly. |
| Contact | Immediate material change under the working point. Small particles: debris with gravity and spin, dust puffs, water mist at jet impact, foam stream. Rate-capped. |
| Chunk removal | The piece gets a green outline (≈0.15 s), detaches and falls with gravity, spin and fade (≈0.6–0.9 s). |
| Stage done | ✓ badge pops (scale 0 → 1.15 → 1, ≈0.25 s). Remaining specks fade (0.3 s). Tool exits (≈0.3 s). Strip slides one step (≈0.5 s, ease-in-out). New tool enters at rest (≈0.3 s). Total ≈ 2.5–3 s. |
| Level complete | HUD fades out; a sparkle on the object; **confetti bursts from both bottom corners** with white puffs (≈1.75 s). Then a black dim (0.2 s) and the result card pops (scale 0.8 → 1.05 → 1, ≈0.25 s); "Get +N" fades in after ≈0.5 s; light confetti keeps falling. |
| Reward | ~5 coins fly along a curve from the card to the coin counter (≈0.6 s, staggered); the counter ticks up to the already-accepted value and pulses on arrival. |
| Buttons | Press: scale 0.95 + darker edge; release: back with a slight overshoot (≈0.12 s). |
| Errors | There are no fail states. An invalid drag-to-target drop eases the item back (≈0.25 s). |
| Hints | White glove hand demonstrating the real gesture path; loops until the player acts. |
| Reduced motion | No screen-wide confetti (small burst only), no camera shake, shorter particle bursts; the material change itself is kept. |

## 11. Transparency (Higgsfield Background Remover)

- **Cut out with Background Remover:** every object state layer, every tool, particles, UI surfaces with rounded or irregular shapes, icons, the glove hand, the logo.
- **Not cut out (kept as generated):** scene backgrounds, the loading-screen background, full-bleed textures (foam texture, tileable surfaces).
- **Edge requirements:** clean anti-aliased edges with no halo or colour spill. Fine details (brush bristles, cloth folds, laces, net) must be preserved. Object state layers share **one common canvas and pivot**. Tools record a **working point** (blade tip, nozzle, bristle centre). Shadows are not baked into cutouts; the contact shadow is code-drawn.
- Alpha review on light, dark and in-game backgrounds before acceptance (see `instructions/03-art-higgsfield.md`).

## 12. Not allowed (style deviations)

- Any reference asset, logo, name, character or UI graphic, or tracing of them.
- Real brands or trademarks on objects (e.g. team names on the jersey, label brands).
- Flat HTML/CSS boxes passed off as final UI.
- Outlined cartoon or cel-shaded objects; pixel art; dark/gritty horror look.
- Text baked into generated images (except the logo).
- Dirt or foam drawn outside the object mask.
- Re-filling dirt or foam between stages; any flash of the full dirty state after progress.
- Any generation model other than Nano Banana 2.

## 13. Benchmark screenshots (menu / game / result)

Step 3 benchmark, waiting for acceptance:
- **Phone (390×844, DPR 2):** `project/screenshots/step3/phone-touch-1-menu.png`, `phone-touch-2-stage1-chisel.png` … `stage6-dry.png`, `phone-touch-3-result.png`.
- **Desktop (1280×800):** `desktop-mouse-1-menu.png`, `desktop-mouse-2-stage*.png`, `desktop-mouse-3-result.png`.
- **Responsive matrix:** `matrix-<w>x<h>.png`.

For each batch, record the accepted assets, rejected assets and the reason for each rejection. A prompt without a picture at real size does not count as style acceptance.
