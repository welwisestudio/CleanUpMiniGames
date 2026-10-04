# Project brief

Status: **CP0: all game-design decisions recorded, waiting for checkpoint approval.** Updated 2026-10-04 (rev. 3: final Step 0 decisions).

Working title: **CleanUp Mini Games** (a working name, not final branding).

| What the game designer sets | Description |
|---|---|
| Concept | A 2D collection of cleaning and restoration mini-games, inspired by Perfect Makeover / cleaning-ASMR references. The player picks a dirty or broken object and restores it step by step with different tools until it looks new. |
| Core Loop | **Object selection → sequential cleaning / restoration actions with different tools → object completion → reward → next object.** |
| Base mechanics (confirmed) | Multi-stage cleaning/restoration of an object · a different tool for each stage · touch/drag as the main input · visible progress for the current stage · sequential transition between tools · highlighted/outlined interaction zones where needed · a completion state showing the restored object · a reward after completing the object. |
| Tools (confirmed list) | Different brushes · sponges · water pressure washer / water gun · foam / soap-water cleaning · different cloths · duster · grinder · screwdriver · hammer · laser · chisel / scraper · mop / squeegee · tweezers · similar cleaning/restoration tools where appropriate. |
| First levels | **Approved 2026-10-04:** 1 Soccer Ball · 2 Rug · 3 Golden Ball Trophy · 4 Chair · 5 Sneaker (stage sequences below, from the reference video). |
| Object access | **All objects/levels are available from the start**, like in the reference. No sequential unlocking. (In the reference, "Get +N" goes to the next object on the shelf and Home returns to the menu.) |
| Win / loss | Win: the object is fully cleaned/restored. **There is no failure/loss state.** |
| Pace and duration | Not fixed. It depends on the player; pacing follows the references. Measured in the reference video: **6–12 stages per object, ≈4–16 s per stage, ≈55–130 s per object** (experienced player, no ads). See `REFERENCE-BREAKDOWN.md` §5. |
| Monetization and meta | **Confirmed systems (2026-10-04):** coins · diamonds · alternative tool versions purchasable with in-game currency · store · **Claim 2x** via rewarded ad · free rewards/currency via rewarded ad · **No Ads**. **Not in scope for now:** Themes. **Implementation rule:** no real ads now. At the monetization/meta step (Step 7) ads run only through the dev adapter. The real YouTube Playables SDK is integrated only at the final platform stage (Step 11). Prices, reward amounts and placements are set at Step 7 and tuned at the balance step. Real-money purchases, banners and the exact form of No Ads depend on platform capabilities (see the monetization design below). |
| References | `reference/input/`: 36 annotated screenshots + **`Reference_gameplay.mp4`** (12:59, silent, 7 complete levels plus menu, settings, store and No Ads). Breakdown with timecodes: `project/REFERENCE-BREAKDOWN.md`. Use them for mechanics, interaction behaviour, gameplay UI composition, pacing, progression flow, reward presentation and general style. **Do not reuse copyrighted assets from the reference game.** |
| Scope: first version / expansion plan | First checkpoint content: the 5 approved levels. The full v1 object count is **not set yet**; it will be agreed before content scaling (Step 8). |
| Special constraints | All graphics come from Higgsfield MCP, **Nano Banana 2 only** (`nano_banana_2`), with no substitute model. Sprite transparency comes from Higgsfield Background Remover via MCP. Own assets only. |

GitHub repository: https://github.com/welwisestudio/CleanUpMiniGames.git (local: `C:\Users\Admin\Documents\GitHub\CleanUpMiniGames`, branch `main`, in sync with `origin/main` at `23fe1ef`).

Accepted baseline: Phaser, browser, mouse/touch, adaptive UI; YouTube Playables SDK is integrated **at the final stage through a separate platform layer** (dev adapter until then). Graphics: Nano Banana 2 via Higgsfield MCP `https://mcp.higgsfield.ai/mcp`. Background removal: Higgsfield Background Remover via MCP (`remove_background`, available, checked 2026-10-04). After the game exists, every result is shown as a fresh localhost build.

## First levels (1–5 approved 2026-10-04) and later candidates

Levels 1–5 are **approved**. Their stage lists come from the reference video and are the starting design; exact stage details are refined during Steps 2–6. Rows marked "later" are **candidates only**, not approved scope. Object visuals will be our own.

| # | Object | Stage sequence (tools) | Source |
|---|---|---|---|
| 1 | Soccer ball | Chisel (mud crust) → dry brush → foam sprayer → scrub brush → pressure washer → cloth | Video 00:06–01:04, complete |
| 2 | Rug | Pressure washer → squeegee → foam sprayer → scrub brush → pressure washer → squeegee | Video 01:10–02:20, complete |
| 3 | Golden ball trophy | Chisel → dry brush → detail brush → water mist → foam sprayer → scrub brush → pressure washer → cloth/sponge | Video 02:24–04:04, complete |
| 4 | Chair | Trash to bin → duster → duster (seat close-up) → foam can → scrub/drill brush → cloth (reveals new leather) → wood putty into dents → sandpaper → wood stain sponge | Video 04:20–06:12, complete |
| 5 | Sneaker | Chisel → pressure washer → foam sprayer → scrub/drill brush → pressure washer → cloth → eraser | Video 06:20–07:56, complete |
| later | Cannon | Duster → rust-remover foam → scrub brush → washer → angle grinder → spray paint → carriage sander → polisher finish → drill holes → attach rings → attach wheels | Video 08:24–10:36, complete |
| later | Stone monument (**our own generic statue proposed** instead of Mt. Rushmore) | Scrub brush (moss) → long-handle brush → foam → spin brush → washer → paint roller | Video 10:48–12:12, complete |
| later | Rusty cleaver | Laser → rivets → handle off → vinegar soak → steel wool → (?) → polisher → sharpener → new handle → screws | Screenshots only, mostly complete |
| later | Keyboard, swimming pool | Partial sequences | Screenshots only |

The "?" gaps in screenshot-only levels will be proposed from the confirmed tool list and shown for approval when those levels are reached.

## Intended monetization design (record only, not implemented)

| System | Intended design | Implementation stage |
|---|---|---|
| Coins | Soft currency. Earned as the object completion reward; spent on alternative tool versions. | Step 7 (start values), Step 10 (balance) |
| Diamonds | Premium currency. Earned through free rewarded offers in the store; spent on premium tool versions. | Step 7 / 10 |
| Alternative tool versions | 3 cards on tool stages: equipped / free / priced in coins or diamonds. They include different tools for the same job (e.g. drill brush instead of a hand brush). Purchase is permanent. | Step 7 (UI cards can appear earlier as placeholders) |
| Store | In-game currency packs and offers. FREE coin/diamond packs via rewarded ad. | Step 7 |
| Claim 2x | On the Completed card: "Claim 2x" (rewarded ad; double only on a confirmed result) or "Get +N" (base reward, no ad). Granted once per completion. | Step 7 via dev adapter; real SDK at Step 11 |
| Free rewards via rewarded ad | FREE store packs; other placements are agreed at Step 7. | Step 7 / 11 |
| No Ads | Entry point in the menu and HUD, as in the reference. Its exact form (what it removes and how it's obtained) depends on what the platform allows. Real-money purchase is **not assumed**; decide at Step 7 and confirm against current YouTube Playables docs at Step 11. | Step 7 / 11 |
| Interstitials | Not a confirmed system. If used, only between objects, never mid-stage; the decision is made at Step 7. The reference's banners and mid-level ad breaks are **not adopted**. | — |
| Themes | Not in scope. | — |

The AI keeps the following separately: the implementation plan, the STYLE-GUIDE derived from references, technical decisions and STATUS. New mechanics or themes can be proposed after the base is accepted; changes to the Core Loop or direction need the game designer's approval.
