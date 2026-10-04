# Reference breakdown

Updated: 2026-10-04 (rev. 2: video analysis added) · Sources in `reference/input/`:
- 36 screenshots (`*.png` / `*.PNG`)
- **`Reference_gameplay.mp4`**: 12:59, 1920×1080 screen recording of a portrait game (game area 612×1080, pillarboxed), 30 fps. **The audio track is effectively silent (≈2 kb/s)**, so it gives no audio reference.

The reference game is *Perfect Makeover Cleaning ASMR*. It is used only to understand mechanics, interaction, UI layout, pacing, progression, rewards and general style. **None of its assets, logo, name, character art or UI graphics may be reused.** We make our own implementation and our own assets.

Method: frames were extracted every 2 s and reviewed as contact sheets (4 s spacing for the whole video, 2 s for ambiguous moments). Timecodes are `mm:ss` from the start of the video and accurate to about ±2 s.

Notation: **Prev / Cur / Next** = the three icons in the top tool strip. ✓ = a completed stage. "Variants" = the three cards at the bottom.

## 0. Video session overview

| Time | Segment | Reward |
|---|---|---|
| 00:00–00:04 | Main menu → tap the soccer ball → loading screen | — |
| 00:06–01:04 | **Soccer ball** (6 stages, ≈55 s) | +15 |
| 01:06–01:08 | Loading screen (auto-advance to the next shelf object) | — |
| 01:10–02:20 | **Rug** (6 stages, ≈70 s) | +15 |
| 02:24–04:04 | **Golden ball trophy** (8 stages, ≈100 s) | +20 |
| 04:08–04:16 | Loading → **menu** (Home pressed), scroll, pick the chair (bag and vase skipped) | — |
| 04:20–06:12 | **Chair** (9 stages, ≈110 s; loading screen mid-level at 05:04) | +20 |
| 06:16 | Loading (auto-advance to the next shelf object) | — |
| 06:20–07:56 | **Sneaker** (8 stages, ≈95 s; loading screen mid-level at 07:04–07:08) | +20 |
| 08:00–08:20 | Loading → menu, long scroll through the catalogue, pick the cannon near the end | — |
| 08:24–10:36 | **Cannon** (12 stages, ≈130 s; loading screen mid-level at 09:28–09:32) | +5 |
| 10:40–10:44 | Loading (auto-advance) | — |
| 10:48–12:12 | **Stone monument (Mt. Rushmore)** (6 stages, ≈85 s; loading screen mid-level at 11:20–11:24) | +5 |
| 12:16–12:24 | Menu end: "COMING SOON" shelf | — |
| 12:28–12:34 | Settings popup; "Exciting events are coming soon!" toast | — |
| 12:36–12:44 | Store | — |
| 12:46–12:50 | No Ads popup | — |
| 12:52–12:59 | Store again, menu scroll | — |

Not covered by the video (screenshot-only): keyboard, rusty cleaver, swimming pool.

## 1. Global screens

| State | Time / screenshot | What happens | What we take |
|---|---|---|---|
| Loading | 00:04, 01:06, 04:08, 06:16, 08:00, 08:20, 10:40; `Loading_screen.png` | Logo over a warm room interior; blue progress bar with %. Shown **when entering every level, when returning to the menu, and also mid-level** (see §2, ad breaks). | Loading screen with our own logo and a progress bar. |
| Main menu | 00:00, 04:12–04:16, 08:04–08:16, 12:16–12:28; `Menu_screen.PNG` | Currency HUD, shop (red "!" badge), settings, No Ads, Themes. A long vertical scroll of shelves, **2 objects per shelf, about 45+ objects**, ending with a **"COMING SOON"** shelf. Every object is shown dirty with a tool icon. **Completed objects look the same** (the ball is still shown dirty at 12:28). The player **chose objects freely**: chair (skipping bag and vase) and cannon (near the end of the list). | Free object selection from shelves. No visible locks observed. |
| Settings | 12:30–12:32 | Popup with **Sound / Vibration / Music** toggles, a "Privacy Policy" link and "Tap To Continue". | Settings: sound, music, vibration. |
| "Coming soon" toast | 12:34 | Purple toast: "Exciting events are coming soon!" (most likely from the Themes/events button). | The reference's Themes/events feature appears **not to be functional**. |
| Store | 12:38–12:44, 12:52; `Store_screen.PNG` | **Starter Pack** with a limited-offer timer (01:59:54 counting down): remove forced ads, offline play, 50 diamonds, 300 coins, **379.00** (real money). **Diamonds**: 5 **FREE**, 25 for 75.00, 60 for 149.00. **Coins**: 25 **FREE**, 150 for 75.00, 350 for 149.00. | Soft and premium currency; "FREE" packs (very likely rewarded ads); real-money packs ⚠ (platform check). |
| No Ads popup | 12:46–12:48 | AD-TV icon. "Remove Ads Between Levels", "Remove All Banner Ads", "Offline play", "Get 150 Coins", **349.00**; text button **"Continue with ads"**. | Shows that the reference has **interstitials between levels and banner ads**. |

## 2. Gameplay HUD and flow (same in every level)

- **Top-left:** coin and diamond counters; No-Ads button.
- **Top-centre:** tool strip with Prev (✓), **Cur** (large, green frame) and Next, plus a stage progress bar with %. When a stage reaches 100%, Cur gets a ✓ (≈1 s) and the strip slides to the next tool.
- **Top-right:** pause.
- **Bottom: tool-variant cards (3).** The labels are "Equipped", "Free", a coin price (5 / 10 / 15 / 25) or a diamond price (5). **The variants are not always skins of one tool.** Some are different tools for the same job (hand scrub brush vs. **cordless drill brush**; cloth vs. sponge vs. eraser; lance vs. pistol nozzle). In the video the player switched to the drill brush mid-stage (05:08–05:10, 07:20). The cards appear only on some stages.
- **Tool following:** the tool sprite follows the pointer and stays slightly above the finger. When idle it rests at the bottom centre. Sprayers and lances are drawn with a hose to the bottom edge.
- **Hints:** a white glove hand demonstrates the gesture (10:04 drill holes, 10:28 attach wheel; screenshots also show drag-to-beaker and ↔ swipe).
- **Outlines:** green solid outlines mark chunks or items to remove (00:12, 02:36, 06:28, 04:20). Green dashed circles mark spot targets (05:28–05:48).
- **Camera:** zooms or reframes per stage (chair seat close-up at 04:44; cannon carriage close-ups at 09:36–10:30; Rushmore reframing).
- **Completion:** the restored object gets a short sparkle or confetti moment in the scene (01:00, 06:08 with smoke puffs, 10:34, 12:08). Then the **"Completed" card** appears over a dimmed scene with confetti: picture of the restored object, "Reward: +N", **Home** (yellow), **Claim 2x** (green, ad badge), and the text button **"Get +N"** underneath.
  - **"Get +N" flies coins into the counter and proceeds straight to the next shelf object** (01:02–01:10).
  - **Home** returns to the menu (04:04–04:12, 07:56–08:04).
- **Banner ad:** a banner at the **bottom of the screen is present almost all the time**: gameplay, menu, loading, store. Screenshots also show a banner at the top of the Completed screen.
- **Mid-level loading screens** at 05:04, 07:04–07:08, 09:28–09:32 and 11:20–11:24, roughly every 2 minutes of play, between two stages. Most likely an **ad break** (interstitial) that was cut from the recording or hidden behind the loading screen. The ad itself is not visible.

## 3. Level breakdowns

### L-A · Soccer ball — complete (video 00:06–01:04, reward +15)

| # | Time | Stage / tool | Interaction and visuals | Variants |
|---|---|---|---|---|
| 1 | 00:06–00:16 | **Chisel**: break the mud crust | Dragging over the crust breaks off chunks. A chunk that is about to drop gets a green outline, then falls with physics. Reveals a dirty yellow/blue ball. | — |
| 2 | 00:16–00:22 | **Dry brush** | Reveal with brush strokes. | — |
| 3 | 00:24–00:34 | **Foam sprayer** (red sprayer with tank) | A spray jet adds a white foam layer. | Equipped / Free / Free |
| 4 | 00:36–00:42 | **Round scrub brush** | Foam turns into swirls and dirt dissolves. | Free / Free / Equipped |
| 5 | 00:44–00:52 | **Pressure washer lance** | The jet rinses foam off; the result is wet and shiny with droplets. | lance variants |
| 6 | 00:54–00:58 | **Cloth** | Wipes off the droplets. | blue / green / orange |
| ✔ | 01:00–01:04 | Completed | Sparkles and confetti; card shows +15; "Get +15" flies coins and goes to the next object. | |

### L-B · Rug — complete (video 01:10–02:20, reward +15)

| # | Time | Stage / tool | Notes |
|---|---|---|---|
| 1 | 01:10–01:20 | **Pressure washer**: rinse the dry dirt | Dirty water spreads onto the floor tiles. Variants: Equipped / Free / Free. |
| 2 | 01:24–01:30 | **Squeegee**: push out the water | Strip-wise reveal. |
| 3 | 01:32–01:40 | **Foam sprayer** | The whole rug is covered in foam. |
| 4 | 01:44–01:52 | **Scrub brush** | Variants: Equipped / 15 coins / 5 diamonds. |
| 5 | 01:56–02:00 | **Pressure washer** | Reveals the clean **green** patterned rug. |
| 6 | 02:04–02:12 | **Squeegee** | Variants: Equipped / 15 / 15 coins. |
| ✔ | 02:16–02:20 | Completed, +15 | |

### L-C · Golden ball trophy — complete (video 02:24–04:04, reward +20)

| # | Time | Stage / tool | Notes |
|---|---|---|---|
| 1 | 02:24–02:44 | **Chisel**: break the dried crust | Chunks are outlined in green and fall off; reveals a dull gold surface. |
| 2 | 02:48–03:00 | **Dry brush** (long bristle brush) | Variants: Equipped / 10 coins / … |
| 3 | 03:04–03:08 | **Small round detail brush** on the base | |
| 4 | 03:12–03:20 | **Water spray nozzle** (red): wet the object | Water mist. |
| 5 | 03:24–03:28 | **Foam sprayer** | |
| 6 | 03:32–03:40 | **Scrub brush** | Variants: Equipped / 10 / 15 coins. |
| 7 | 03:44–03:48 | **Pressure washer** | Reveals shiny gold. |
| 8 | 03:52–04:00 | **Cloth / sponge** (dry off) | Variants: cloth / sponge (5 coins) / eraser (10 coins); switched to the sponge. |
| ✔ | 04:04 | Completed, +20 | Home → menu. |

### L-D · Chair — complete (video 04:20–06:12, reward +20)

| # | Time | Stage / tool | Notes |
|---|---|---|---|
| 1 | 04:20–04:28 | **Trash bin**: drag junk into the bin | Outlined jersey, can, banana peel, shoe and bottle; the bin is at the bottom. |
| 2 | 04:32–04:40 | **Duster**: whole chair | A dust cloud puff follows the duster. Variants: Equipped / 10 / 15 coins. |
| 3 | 04:44–04:52 | **Duster**: seat close-up (camera zoom) | Reveals a moldy, stained seat. |
| 4 | 04:56–05:02 | **Foam spray can** (yellow aerosol) | Foam covers the seat. |
| — | 05:04 | Mid-level loading screen (ad break?) | |
| 5 | 05:06–05:16 | **Scrub brush → switched to the cordless drill brush** | Variants: hand brush / 10 coins / drill. |
| 6 | 05:20–05:24 | **Cloth**: wipe off the foam | The wipe **reveals a brand-new yellow leather seat** (restoration, not just cleaning). |
| 7 | 05:28–05:40 | **Wood putty + putty knife**: fill the dents | The putty jar appears; dragging the knife over the **4 dashed target circles** leaves grey filler patches. |
| 8 | 05:44–05:52 | **Sandpaper block** (red): sand the patches | |
| 9 | 05:56–06:04 | **Stain sponge** (yellow): wipe on wood stain | The frame turns rich glossy brown. |
| ✔ | 06:08–06:12 | Completed, +20 | Confetti and smoke puffs at the legs. |

### L-E · Sneaker — complete (video 06:20–07:56, reward +20)

| # | Time | Stage / tool | Notes |
|---|---|---|---|
| 1 | 06:20–06:30 | **Chisel**: break the cracked mud crust | Lace chunks are outlined in green; a dust puff accompanies each chunk. Variants: Free / 5 coins / Equipped. |
| 2 | 06:32–06:44 | **Pressure washer** | Variants: lance / **pistol nozzle (15 coins)** / 5 diamonds. |
| 3 | 06:48–07:00 | **Foam sprayer** | Variants: Equipped / 15 / 25 coins (a yellow foam gun was used). |
| — | 07:04–07:08 | Mid-level loading screen (ad break?) | |
| 4 | 07:12–07:28 | **Scrub brush → drill brush** | Swirl patterns in the foam. |
| 5 | 07:32–07:40 | **Pressure washer** | Reveals a white/red/blue sneaker. |
| 6 | 07:44 | **Cloth** | Dry off. |
| 7 | 07:48–07:52 | **Eraser block** (white): final wipe | |
| ✔ | 07:56 | Completed, +20 | Home → menu. |

### L-F · Cannon — complete, longest (video 08:24–10:36, reward +5)

| # | Time | Stage / tool | Notes |
|---|---|---|---|
| 1 | 08:24–08:32 | **Duster** | |
| 2 | 08:36–08:40 | **Foam/rust-remover sprayer** (pink foam) | |
| 3 | 08:44–08:52 | **Round scrub brush** | |
| 4 | 08:56–09:00 | **Pressure washer** | Reveals dark rusty metal. |
| 5 | 09:04–09:12 | **Angle grinder** | Sparks; the barrel turns bright steel. |
| 6 | 09:16–09:24 | **Paint spray gun**: paint the barrel black | |
| — | 09:28–09:32 | Mid-level loading screen (ad break?) | |
| 7 | 09:36–09:44 | **Grinder/sander on the wooden carriage** | Strips the old dark wood to raw pale wood. |
| 8 | 09:48–09:56 | **Orbital polisher**: apply the finish | The wood becomes golden oak. |
| 9 | 10:00–10:16 | **Cordless drill**: drill holes | Hand hint; black holes appear at target points. |
| 10 | 10:18–10:24 | **Attach ring fittings**: drag new iron rings to the holes | |
| 11 | 10:26–10:32 | **Attach wheels**: tap or drag onto the axle | Hand hint at the axle. |
| ✔ | 10:32–10:36 | Completed, +5 | |

### L-G · Stone monument (Mt. Rushmore) — complete (video 10:48–12:12, reward +5)

| # | Time | Stage / tool | Notes |
|---|---|---|---|
| 1 | 10:48–10:56 | **Handheld scrub brush** (blue): remove moss | |
| 2 | 11:00–11:08 | **Long-handle brush** | Removing the grime reveals **graffiti** underneath. |
| 3 | 11:12–11:16 | **Foam sprayer** | |
| — | 11:20–11:24 | Mid-level loading screen (ad break?) | |
| 4 | 11:28–11:36 | **Long electric spin brush** (teal) | Graffiti dissolves. |
| 5 | 11:40–11:52 | **Pressure washer** | |
| 6 | 11:56–12:04 | **Paint roller + bucket** | Dip, then roll to whiten and restore the stone. |
| ✔ | 12:08–12:12 | Completed, +5 | |

### Screenshot-only levels (not in the video)

- **Keyboard** (`Keyboard_tweezers.PNG`): keycap puller/tweezers pull green-outlined dirty keycaps; the stages before and after are unknown.
- **Rusty cleaver** (`Knife_laser_cleaning`, `Nail_item`, `Handle_item`, `Metal_etching`, `Metal_etching2`, `Rust_remove`, `Polishing_item`, `Sharpening_knife`, `New_Nails_handle`), reconstructed: laser → remove rivets → detach handle → blade into a beaker → pour vinegar → steel wool → (? thin tool) → rotary polisher → sharpener (↔ swipe) → new handle → new screws.
- **Swimming pool** (`ThrowOut_trash`, `Water_filtration`, `CleaningOff_individual_dirt`, `Filling_with_clear_water`): drag floating junk to the bin → pump drains the water (hold) → grabber picks up algae clumps → (? scrubbing) → hose fills with clean water.

## 4. Extracted mechanic types (implementation-neutral)

| Type | Seen as | Progress measure |
|---|---|---|
| **Reveal / wipe** (remove a dirt or foam layer) | brushes, drill brush, spin brush, duster, cloth, sponge, eraser, steel wool, laser, pressure washer, squeegee, angle grinder, sander, sandpaper | % of the mask removed |
| **Apply layer** | foam sprayer / foam can, water mist, paint spray gun, paint roller (with a dip source), wood stain sponge, polisher finish, wood putty into spots | % of the area or spots covered |
| **Reveal a new state** (the wipe shows a restored or different layer) | cloth reveals a new leather seat; washer reveals a new colour; grinder reveals bright steel | % coverage |
| **Chunk break-off** | chisel on crust (ball, trophy, sneaker) | chunks removed / total |
| **Drag to target** | trash → bin, blade → beaker, ring fittings → holes, wheels → axle, screws → holes, new handle | items placed / total |
| **Tap / hold outlined targets** | drill holes, rivets, keycaps, algae clumps (grabber) | targets done / total |
| **Hold to fill / drain** | pump, hose | level % |
| **Repeated swipe** | sharpener | swipe count % |

**Tools from the confirmed list seen in the video:** brushes (several kinds, including drill and spin brushes), sponges, pressure washer, foam/soap sprayer, cloths, duster, **grinder** (angle grinder and carriage sander), **drill** (close to the screwdriver), chisel, putty knife (scraper), squeegee, long-handle brush (close to a mop).
**Still not seen anywhere:** **hammer**, a true **screwdriver**, and a **mop**. Tweezers and the laser are seen only in screenshots.
**Extra tools seen** (fit "similar tools where appropriate"): paint spray gun, paint roller, wood putty, sandpaper, wood stain sponge, eraser block, polisher.

## 5. Pacing (measured from the video)

- **Level length: ≈55–130 s** (ball 55, rug 70, rushmore 85, sneaker 95, trophy 100, chair 110, cannon 130) for an experienced player, without ads.
- **Stages per level: 6–12.** **Stage length: ≈4–16 s**, typically 6–10 s. There are no fail states and no timers.
- First levels are short and use only the cleaning set (chisel, brush, foam, scrub, rinse, dry). Later levels add restoration (putty, sanding, painting, assembly).
- **Rewards observed: +15, +15, +20, +20, +20, +5, +5.** Claim 2x is never used in the video. The +5 on the cannon and monument (chosen from deep in the catalogue) suggests the reward isn't simply growing with level index. The exact rule is unknown.
- **Ad cadence in the reference:** a persistent bottom banner, plus a mid-level loading/ad break roughly every 2 minutes of play.

## 6. Style observations (for STYLE-GUIDE later)

- **Objects and backgrounds:** high-detail, semi-realistic renders with strong, satisfying dirt textures (mud crust, foam swirls, rust, moss, graffiti). The clean state is saturated and glossy, often wet with droplets before the final dry stage.
- **Backgrounds** are themed per object (pitch, bathroom tiles, trophy-shelf room, warm interior, grey studio floor, fortress terrace, sky) and kept soft or blurred so the object reads clearly.
- **UI:** glossy, casual and rounded. White cards, a green "selected" frame, green CTA buttons, a yellow Home button, a pastel pink/cream menu, a striped awning on the store, a bubbly logo font.
- **Feedback:** green outlines, a white glove hand, particle puffs (dust, sparks, water mist, foam), confetti and coin fly-to-counter.
