# Content matrix — 50 levels (Step 8 plan)

Status: **matrix approved 2026-10-08.** Levels 1–5 approved; **Batch A (levels 6–15) implemented in build #55, waiting for approval** (interpretations of rows 7, 8, 11, 13, 15 in DECISIONS 2026-10-08). Levels 16–50: not started, no art.

Scope rules:
- Every level follows the approved Core Loop: object → sequential cleaning / restoration stages → tools → visible progress → restored object → reward / meta → next object.
- Levels 1–5 stay exactly as approved.
- No real brands, logos, readable text or real-person likenesses.
- Art: Nano Banana 2 only, background removal with Higgsfield Background Remover, same style as levels 1–5. Every record lists the prompt, model, job ID and removal job.

Legend (used in the tables):

| Code | Meaning |
|---|---|
| **B-rev / B-app / B-scr** | `BrushMechanic`: reveal (remove a layer or show the restored state), apply (foam, paint, oil) or scrub (needs foam). |
| **CH** | `ChunkBreakMechanic`: chisel crust, and *peeling* (paint flakes, stickers, old silicone and barnacles as chunks). |
| **DT** | `DragToTargetMechanic`: trash → bin. |
| **SP** | `SpotsMechanic`: dip in a source, then rub into the outlined spots (putty, filler, oil). |
| **PT** | **new** `PointTargets` (§4.1): hold / tap / pull on outlined points. |
| **FL** | **new** `FillLevel` (§4.2): hold to drain or fill a liquid level. |
| **+load** | Brush extension E1: the tool must be dipped into a source (paint tray, can, paste). |
| **+slots** | DragToTarget extension E2: remove a part from the object, or place a new part into its outlined slot. |
| **+zones** | Extension E3: a large object is split into zones and only the active zone is highlighted. |
| **+fx** | Extension E4: power-tool effects (laser beam, sparks, polish shine, paint mist). |
| **Backgrounds** | STUDIO, WORKSHOP, WASH, YARD, PLAZA, VIP, plus specials (§2). |
| **Card families** | Alternative-tool card families (§3), such as foam, scrub, wipe, screw or laser. |
| ★ | Sample level for a new family (§5). |

## 1. Level matrix 1–50

Pacing targets:
- **Levels 1–15 (early): 6–8 stages.** Familiar tools plus one simple restoration idea per level.
- **Levels 16–35 (mid): 8–10 stages.** Cleaning plus repair, with more localized targets.
- **Levels 36–50 (late / premium): 10–12 stages.** Multi-part restoration, replacement, finishing and advanced tools.

There are no timers, fail states or artificial difficulty. A level is longer only because the object really needs more work.

### Implemented (unchanged)

| # | Level / object | Content family | Stages | Main dirty / damaged states | Stage sequence (tool · action) | Tools | Mechanics reused | New mechanic | Background | VIP | Alternative-tool cards | Special art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Soccer Ball | Sports | 6 | mud crust, dust, grime | chisel crust · dry brush · foam · scrub · washer rinse · cloth dry | chisel, dry brush, foam sprayer, scrub brush, washer lance, cloth | CH, B-rev, B-app, B-scr | — | own: pitch | — | foam, scrub, wipe | implemented |
| 2 | Rug | Textile | 6 | mud, dirt, stains | washer · squeegee · foam · scrub · washer · squeegee | washer lance, squeegee, foam sprayer, scrub brush | B-rev, B-app, B-scr | — | own: bathroom tiles | — | foam, scrub | implemented |
| 3 | Golden Ball Trophy | Decorative metal | 8 | crust, dust, grime, tarnish | chisel · dry brush · detail brush · water mist · foam · scrub · washer · cloth | chisel, dry brush, detail brush, mist nozzle, foam sprayer, scrub brush, washer, cloth | CH, B-rev, B-app, B-scr | — | own: trophy room | — | foam, scrub, wipe | implemented |
| 4 | Chair | Furniture | 9 | trash, dust, old seat, dents, worn varnish | trash → bin · duster frame · duster seat · foam can · drill brush · cloth reveals new seat · putty dents · sandpaper · stain sponge | trash bin, duster, foam can, drill brush, cloth, putty knife + tub, sandpaper, stain sponge | DT, B-rev, B-app, B-scr, SP | — | own: warm interior | — | — | implemented |
| 5 | Sneaker | Shoes | 7 | mud crust, mud, grime, scuffs | chisel · washer · foam · drill brush · washer · cloth · eraser | chisel, washer, foam sprayer, drill brush, cloth, eraser | CH, B-rev, B-app, B-scr | — | own: grey studio | — | foam, wipe | implemented |

### Batch A — levels 6–15 (early, 6–8 stages)

| # | Level / object | Content family | Stages | Main dirty / damaged states | Stage sequence (tool · action) | Tools | Mechanics reused | New mechanic / extension | Background | VIP | Alternative-tool cards | Special art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6 | Rain Boots | Shoes / textile | 6 | dried mud crust, wet mud, grass stains | chisel crust · washer · foam · scrub · washer · cloth | existing only | CH, B-* | — | WASH | — | foam, scrub, wipe, rinse | pair of boots as one object |
| 7 | Cast-Iron Frying Pan | Kitchen / rusted metal | 7 | burnt crust, grease, rust spots | putty knife scrapes burnt crust · foam degreaser · scrub · **steel wool** rust spots · washer · cloth dry · sponge oil seasoning (apply sheen) | + steel wool | CH, B-* | — (first steel wool) | WASH | — | foam, scrub, wipe, rust | oil-sheen layer |
| 8 | Painted Wooden Crate | Painted wood | 7 | dust, flaking old paint, bare grey wood | duster · **scraper** peels paint flakes · sandpaper · cloth · **paint brush** paints the slats · detail brush (corners) · stain sponge varnish | + wide scraper, paint brush | B-rev, CH (peel), B-rev (painted state) | — (first peel and paint; no dip) | WORKSHOP | — | scrape, sand, wipe | flake chunk map; painted state |
| 9 | Rusty Toolbox | Rusted metal / workshop | 7 | junk inside, dust, rust, faded paint | rags / bolts → bin · duster · pink rust-remover foam · **wire brush** · **angle grinder** to bright steel · **spray gun** red paint · cloth | + wire brush, grinder, spray gun | DT, B-* | +fx (sparks, paint mist) | WORKSHOP | — | foam, rust, grind, spray | bright-steel and painted states |
| 10 | Bathroom Sink & Faucet | Bathroom | 7 | hair / soap junk, soap scum, limescale, dull chrome | junk → bin · foam · scrub · detail brush faucet limescale · mist rinse · cloth · **polisher** chrome shine | + polisher | DT, B-* | +fx (shine) | WASH | — | foam, scrub, wipe, polish | chrome shine layer |
| 11 ★ | **Desk Fan** | Household electronics | 8 | dusty grille, greasy blades, yellowed body | **screwdriver** unscrews 4 grille screws · lift grille off to the tray · duster blades · foam · scrub · cloth · grille back into its slot · screwdriver screws in | + screwdriver | B-* | **PT (hold)**, **+slots** | STUDIO | — | foam, scrub, wipe, **screw** | separate grille sprite (dirty / clean), screw sprites, slot ghost |
| 12 ★ | **Garden Bench** | Outdoor furniture | 8 | leaves, flaking green paint, grey wood, rusty iron frame | leaves → bin · scraper peels paint on slats · sandpaper slats · wire brush rust on the frame (frame zone) · cloth · **roller + tray** paints the slats · **paint brush + can** paints the frame black · stain sponge varnish (slats) | + roller / tray, paint can | DT, CH (peel), B-* | **+load**, **+zones** | YARD | — | scrape, sand, rust, **roll** | 2 zone masks; paint tray and can |
| 13 | Keyboard | Electronics | 7 | dirty keycaps, crumbs, dust, sticky spill | **keycap puller** removes dirty keycaps · **air blower** crumbs · detail brush between switches · **cotton swab** sticky spill · cloth frame · new keycaps into their slots · cloth final | + keycap puller, air blower, swab | B-* | PT (pull), +slots | STUDIO | — | wipe | keycap set sprites (dirty / new) |
| 14 | Dented Watering Can | Outdoor metal | 7 | dents, rust, dirt | **hammer** taps dents out · wire brush · foam · scrub · washer · cloth · spray gun green paint | + hammer | B-* | PT (tap), +fx | YARD | — | **hammer**, rust, foam, spray | 3 dent states per dent |
| 15 | Porcelain Vase | Decorative | 7 | cobwebs, dust, grime in the relief, chips | duster · water mist · foam · detail brush relief · washer (mist) · cloth · putty fills chips + paint brush touch-up (one SP stage with paint stamps) | existing + paint brush | B-*, SP | — | STUDIO | — | foam, wipe | chip spots |

### Batch B — levels 16–25 (mid, 8–10 stages)

| # | Level / object | Content family | Stages | Main dirty / damaged states | Stage sequence (tool · action) | Tools | Mechanics reused | New mechanic / extension | Background | VIP | Alternative-tool cards | Special art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 16 ★ | **Swimming Pool** | Outdoor water (large) | 9 | floating junk, murky green water, algae clumps, limescale on the steps, dirty tiles | **skimmer net** drags floating junk to the bin · **pump** drains the water (hold) · **grabber** picks algae clumps · chisel limescale crust on the steps · foam tiles · long-handle scrub brush · washer rinse · cloth dries the coping · **hose** fills clean water (hold) | + skimmer net, pump, grabber, hose, long brush | DT, CH, B-* | **FL (drain / fill)**, PT (pull) | special: pool deck | — | foam, scrub, rinse | pool basin is the object; water layers (murky / clean) plus a level edge; floating junk |
| 17 | Leather Jacket | Clothing / leather | 8 | dust, grime, scuffs, cracked dry leather | duster · foam leather cleaner · detail brush seams · cloth · eraser scuffs · sponge applies conditioner (sheen) · new zipper pull into its slot · polisher buff | existing + polisher | B-*, DT (+slots) | — | STUDIO | — | foam, wipe, polish | conditioned-leather state |
| 18 ★ | **Rusty Cleaver** | Rusted metal / kitchen | 10 | heavy rust, loose old rivets, cracked handle, dull edge | **laser** rust off the blade · **hammer + punch** knock out the old rivets · old handle off to the bin · steel wool fine rust · polisher blade shine · **sharpener** along the edge (sparks) · new handle into its slot · new rivets into the holes · hammer sets the rivets · cloth oil | + laser, punch, sharpener | B-*, DT (+slots) | **+fx (laser, sparks, shine)**, PT (tap) | WORKSHOP | — | **laser**, rust, polish, hammer | blade without handle; handle sprites; edge region; per the reference cleaver |
| 19 | Toaster | Kitchen electronics | 8 | crumb tray, grease, burnt slots, dull chrome, broken knob | crumb tray out to the bin · foam degreaser · scrub · detail brush slots · cloth · polisher chrome · new knob into its slot · screwdriver tightens it | existing + polisher, screwdriver | B-*, +slots, PT | — | WASH | — | foam, scrub, wipe, polish, screw | chrome shine layer |
| 20 | Wooden Rocking Horse | Decorative toy / painted | 9 | dust, flaking paint, cracks, bare wood | duster · scraper peels paint · sandpaper · putty cracks · sandpaper · roller + tray paints the body · paint brush + can paints the mane (mane zone) · new rope reins into the slots · stain sponge varnish | existing new set | CH, B-*, SP, +load, +zones, +slots | — | STUDIO | — | scrape, sand, roll | 2 zones; reins sprite |
| 21 | Garden Grill | Outdoor / rusted metal | 9 | ash, burnt crust on the grates, rust, peeling paint | ash → bin · scraper burnt crust (CH) · wire brush grates · grinder rust on the lid · foam degreaser · scrub · washer · spray gun black heat paint · new grate into its slot | existing new set | DT, CH, B-*, +slots | — | YARD | — | scrape, rust, grind, foam, spray | grate sprite |
| 22 | Bathtub | Bathroom (large) | 9 | grey water, bath toys, soap scum, mouldy old silicone, dirty grout | pump drains the grey water · toys → bin · foam · scrub · scraper old silicone (CH) · detail brush grout · washer · silicone gun lays a new bead (B-app along the edge) · hose fills clean water | + silicone gun | FL, DT, CH, B-* | — | special: tub fills the scene (WASH tiles around it) | — | foam, scrub, rinse | silicone-edge region; water layers |
| 23 | Retro Radio | Household electronics | 10 | dust, sticky case, dirty inside, faded wood | duster · screwdriver back-panel screws · panel off to the tray · air blower inside · detail brush · foam case · scrub · cloth · polisher wood case · panel back + screwdriver | existing new set | B-*, PT, +slots | — | STUDIO | — | foam, scrub, wipe, screw, polish | back-panel sprite; no text on the dial |
| 24 | Stone Lion Statue | Stone statue | 9 | moss, grime, lime crust, cracks | scrub brush moss · washer · chisel lime crust · foam · **spin brush** · washer · putty mortar in the cracks (SP) · sandpaper patch · cloth | + spin brush | B-*, CH, SP | — | PLAZA | — | scrub, foam, rinse | moss and crust layers |
| 25 | Wooden Dresser | Furniture | 10 | junk in the drawers, dust, old varnish, dents, missing knobs | junk → bin · duster · drawers out to the floor (+slots) · scraper old varnish (CH) · sandpaper · putty dents · sandpaper · stain sponge · drawers back · new knobs + screwdriver | existing new set | DT, CH, B-*, SP, +slots, PT | — | STUDIO | — | scrape, sand, screw | drawer sprites; knob sprites |

### Batch C — levels 26–35 (mid, 8–10 stages)

| # | Level / object | Content family | Stages | Main dirty / damaged states | Stage sequence (tool · action) | Tools | Mechanics reused | New mechanic / extension | Background | VIP | Alternative-tool cards | Special art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 26 | Aquarium | Household water | 10 | floating food / leaves, green water, algae on the glass, dirty decor | junk → bin · pump drains · grabber lifts the plastic plants out · scraper algae off the glass (B-rev) · sponge scrub glass · washer rinses the gravel · plants back into the slots · hose fills · cloth outer glass · mist + squeegee | existing new set | DT, FL, PT (pull), B-*, +slots | — | STUDIO | — | scrub, rinse, wipe | water layers; plant sprites; no live fish |
| 27 | Old Suitcase | Textile / leather | 9 | dust, grime, travel stickers, tarnished brass corners, broken handle | duster · foam · scrub · scraper peels stickers (CH) · cloth · polisher brass corners · old handle off · new handle into its slot · screwdriver | existing new set | CH, B-*, +slots, PT | — | STUDIO | — | foam, scrub, wipe, polish, screw | sticker chunks (no text) |
| 28 | Kitchen Stove | Kitchen (multi-zone) | 10 | grates, burnt crust, grease, dull steel, dirty knobs | grates off to the tray · scraper burnt crust · foam degreaser · scrub · steel wool burner rings · cloth · polisher steel top · knobs off / new knobs into their slots · grates back · cloth | existing new set | CH, B-*, +slots, +zones | — | WASH | — | scrape, foam, scrub, rust, polish | grate and knob sprites |
| 29 | Lawn Mower | Workshop / mechanical | 10 | grass crust under the deck, mud, rust, dull blade, worn paint | chisel grass crust · washer · foam · scrub · wire brush rust · grinder deck · sharpener blade · spray gun deck paint · new spark plug into its slot · screwdriver tighten | existing new set | CH, B-*, +slots, PT, +zones | — | YARD | — | rinse, foam, rust, grind, spray | blade zone |
| 30 | Mailbox | Outdoor / painted | 8 | loose flag, dents, rust, peeling paint | screwdriver flag off · hammer dents · scraper peeling paint · grinder rust · foam · washer · spray gun red · flag back + screw | existing new set | PT (hold, tap), CH, B-*, +slots | — | YARD | — | hammer, scrape, grind, spray, screw | flag sprite; no house number |
| 31 | Marble Bust | Stone / decorative | 9 | cobwebs, moss, grime, graffiti marks, chipped nose | duster · scrub moss · foam · spin brush graffiti · washer · putty chip (SP) · sandpaper · detail brush · polisher marble shine | existing new set | B-*, SP | +fx | PLAZA (VIP-ready) | candidate | scrub, foam, polish | generic classical face (no real person) |
| 32 | Wooden Rowboat | Outdoor large (multi-zone) | 10 | leaves, bilge water, barnacles, peeling hull paint, broken oars | leaves → bin · pump bilge water · scraper barnacles (CH) · washer · scraper peeling hull paint · sandpaper · roller hull paint (hull zone) · paint brush stripe (stripe zone) · new oars into their slots · stain sponge varnish seats | existing new set | DT, FL, CH, B-*, +load, +zones, +slots | — | special: SHORE (lakeside dock) | — | scrape, sand, roll | 3 zone masks; oar sprites |
| 33 | Game Controller | Electronics | 9 | sticky shell, dust inside, worn stick cap | screwdriver back shell · shell off · air blower · swab · detail brush · new stick cap into its slot · shell back · screwdriver · cloth | existing new set | PT, +slots, B-* | — | STUDIO | — | screw, wipe | generic design, no logos / buttons with letters |
| 34 | Iron Garden Gate | Outdoor / rusted (multi-zone) | 10 | vines, rust, seized hinges, peeling paint | scraper / chisel vines (CH) · wire brush · laser rust on the scrolls · grinder hinges · foam · washer · oil the hinges (SP) · spray gun black · paint brush + can gold tips · new padlock into its slot | existing new set | CH, B-*, SP, +load, +zones, +slots | — | YARD | — | rust, laser, grind, spray | scroll detail zone |
| 35 | Sofa | Furniture / textile | 9 | crumbs and coins under the cushions, dust, stains, worn fabric | cushions off to the floor · crumbs / junk → bin · dry brush · foam · scrub · washer extraction · squeegee · eraser spot stains · cushions back | existing | DT, B-*, +slots | — | STUDIO | — | foam, scrub, rinse | cushion sprites |

### Batch D — levels 36–45 (late, 10–12 stages)

| # | Level / object | Content family | Stages | Main dirty / damaged states | Stage sequence (tool · action) | Tools | Mechanics reused | New mechanic / extension | Background | VIP | Alternative-tool cards | Special art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 36 | Stone Fountain | Stone / water (multi-zone) | 11 | leaves, murky water, algae clumps, lime crust, moss, cracks, tarnished spout | leaves → bin · pump drains · grabber algae · chisel lime crust · scrub moss · foam · spin brush · washer · putty cracks · polisher brass spout · hose fills | existing new set | DT, FL, PT, CH, B-*, SP, +zones | — | PLAZA | — | scrub, foam, rinse, polish | 2 basins; water layers |
| 37 | Vintage Motorcycle | Workshop / vehicle (multi-zone) | 12 | mud crust, grime, rusty exhaust, dull chrome, faded tank, torn seat, broken mirror | chisel mud · washer · foam · drill brush · grinder exhaust rust · polisher chrome · spray gun tank · paint brush pinstripe (zone) · old seat off / new seat · new mirror into its slot · screwdriver · cloth wax | existing new set | CH, B-*, +load, +zones, +slots, PT | — | VIP | **VIP** | foam, scrub, grind, polish, spray, screw | generic design, no badges |
| 38 | Antique Pocket Watch | Decorative / mechanical | 11 | grime, tarnish, dusty gears, cracked glass, bent hands | screwdriver back · back off · air blower · swab gears · laser tarnish · polisher gold case · cracked glass off / new glass · new hands into their slots · back on · screwdriver · cloth | existing new set | PT, +slots, B-* | +fx | VIP | **VIP** | laser, polish, screw | open-case state; dial without numbers or with plain marks |
| 39 | Upright Piano | Furniture (multi-zone) | 11 | dust, stained keys, scratched varnish, dents, wobbly leg | duster · swab keys · eraser key stains · cloth · scraper old varnish · sandpaper · putty dents · stain sponge · polisher lacquer · old leg off / new leg · screwdriver | existing new set | B-*, CH, SP, +zones, +slots, PT | — | STUDIO | — | wipe, scrape, sand, polish, screw | key zone; leg sprite |
| 40 | Knight Armor | Rusted metal / decorative | 11 | dust, heavy rust, dents, dull steel, rotten straps | duster · laser helmet rust · hammer dents · grinder breastplate · wire brush joints · foam · washer · polisher steel shine · old straps off / new leather straps · hammer rivets · cloth | existing new set | B-*, PT (tap), +slots | +fx | WORKSHOP | — | laser, hammer, grind, rust, polish | strap sprites |
| 41 | Cannon (reference L-F) | Outdoor / metal + wood (multi-zone) | 12 | dust, grime, rusty barrel, dark old wood carriage, missing rings, missing wheels | duster · pink rust-remover foam · scrub · washer · grinder barrel · spray gun black barrel · sander carriage (zone) · polisher wood finish · drill holes (PT hold) · ring fittings into the holes · wheels onto the axle · cloth | existing new set | B-*, PT, +slots, +zones | +fx | PLAZA | — | foam, scrub, grind, spray, polish | barrel / carriage zones; ring and wheel sprites |
| 42 | Shower Cabin | Bathroom (large) | 12 | soap scum on the glass, dirty tiles and grout, limescale, mouldy silicone, broken shower head | squeegee glass · foam · scrub tiles · detail brush grout · chisel limescale (CH) · steel wool chrome · washer · scraper old silicone · silicone gun new bead · old head off / new shower head · screwdriver · polisher chrome | existing new set | B-*, CH, +slots, PT, +zones | — | special: cabin fills the scene | — | foam, scrub, rinse, polish, screw | glass zone vs tile zone |
| 43 | Fire Hydrant | Outdoor / painted | 10 | stickers, dents, rust, peeling paint, missing bolt caps | scraper stickers · hammer dents · scraper peeling paint · grinder rust · foam · washer · spray gun red · paint brush + can white cap (zone) · new bolt caps · screwdriver | existing new set | CH, PT, B-*, +load, +zones, +slots | — | YARD | — | scrape, hammer, grind, spray, screw | no text on the caps |
| 44 | Horse-Rider Statue (monument, after reference L-G) | Stone / bronze monument (multi-zone) | 11 | moss, grime hiding graffiti, lime crust, cracks, green bronze patina, grey plinth | scrub brush moss · long-handle brush grime (graffiti appears) · foam · spin brush graffiti · washer · chisel lime crust · putty cracks · roller + bucket whitewash plinth · laser bronze patina · polisher bronze · cloth | existing new set | B-*, CH, SP, +load, +zones | +fx | PLAZA | — | scrub, foam, rinse, laser, polish | generic fictional rider, no real person; graffiti without readable words |
| 45 | Crystal Chandelier | Decorative (premium) | 11 | cobwebs, dusty crystals, tarnished brass, burnt-out bulbs | duster · grabber crystals off to the tray · mist · foam frame · detail brush · polisher brass · old bulbs out / new bulbs into the sockets · crystals rinsed (washer on the tray) · crystals back into their slots · mist · cloth | existing new set | B-*, PT (pull), +slots | +fx | VIP | **VIP** | wipe, polish | crystal sprites; glow when finished |

### Batch E — levels 46–50 (premium, 11–12 stages)

| # | Level / object | Content family | Stages | Main dirty / damaged states | Stage sequence (tool · action) | Tools | Mechanics reused | New mechanic / extension | Background | VIP | Alternative-tool cards | Special art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 46 | Royal Throne | Furniture (premium) | 12 | dust, dirty velvet, flaking gilding, chipped carving, missing gems, torn cushion | duster · foam velvet · scrub · scraper flaking gilding · sandpaper · putty chips · paint brush + can gold (gilding zone) · polisher gold · old cushion off / new velvet cushion · gems into their slots · screwdriver armrest · cloth | existing new set | B-*, CH, SP, +load, +zones, +slots, PT | — | VIP | **VIP** | foam, scrub, scrape, sand, polish | gem sprites; gold layer |
| 47 | Old Sailboat | Outdoor large (multi-zone) | 12 | leaves, bilge water, barnacles, peeling hull, dirty sail, rusty fittings | leaves → bin · pump bilge · scraper barnacles · washer hull · scraper peeling paint · sandpaper · roller hull paint · foam sail · scrub sail · wire brush fittings · new rope / cleats into the slots · stain sponge deck | existing new set | DT, FL, CH, B-*, +load, +zones, +slots | — | special: SHORE | — | scrape, sand, roll, foam, scrub, rust | 3 zones; sail without symbols |
| 48 | Retro Jukebox | Electronics / decorative | 11 | dust, sticky glass, faded chrome, scratched wood, dead lights | duster · screwdriver front panel · panel off · air blower · swab · foam case · cloth · scraper + sandpaper wood sides · stain sponge · polisher chrome · new bulbs into the sockets · panel back + screwdriver (lights glow) | existing new set | B-*, PT, +slots, +zones | +fx | VIP | candidate | foam, wipe, screw, polish | generic design, no labels; light glow |
| 49 | Vintage Tractor | Workshop / vehicle (multi-zone) | 12 | mud crust, grease, rust, faded paint, flat old tire, broken lamp | chisel mud · washer · foam · drill brush · grinder rust · wire brush wheel rims · spray gun body · paint brush + can rims (zone) · old tire off / new tire · new lamp into its slot · screwdriver · cloth | existing new set | CH, B-*, +load, +zones, +slots, PT | — | YARD | — | rinse, foam, scrub, grind, spray, screw | generic design |
| 50 | Vintage Car (finale) | Vehicle (multi-zone, premium) | 12 | junk inside, mud, grime, rust, dents, faded paint, dull chrome, broken headlights | junk → bin · chisel mud · washer · foam · drill brush · grinder rust · hammer dents · putty body filler (SP) · sandpaper · spray gun body paint · polisher chrome · new headlights + screwdriver | existing new set | DT, CH, B-*, PT, SP, +zones, +slots | +fx | VIP | **VIP** | rinse, foam, scrub, grind, hammer, spray, polish | generic car, no badge or plate text |

Stage counts:

| Levels | Stage counts |
|---|---|
| 1–5 | 6, 6, 8, 9, 7 |
| 6–15 | 6–8 |
| 16–35 | 8–10 |
| 36–45 | 10–12 |
| 46–50 | 11–12 |

Content-family coverage of the requested themes (level numbers):

| Theme | Levels |
|---|---|
| Rusty knife / cleaver | 18 |
| Swimming pool | 16 |
| Keyboard / electronics | 11, 13, 19, 23, 33, 48 |
| Furniture | 4, 12, 25, 35, 39, 46 |
| Shoes / clothing / textiles | 2, 5, 6, 17, 27, 35, 47 (sail) |
| Bathroom / kitchen | 7, 10, 19, 22, 28, 42 |
| Rusted metal | 9, 14, 18, 21, 34, 40 |
| Painted (strip / repaint) | 8, 12, 20, 30, 43 |
| Stone / statue / monument | 24, 31, 36, 44 |
| Outdoor | 12, 14, 16, 21, 29, 30, 32, 34, 36, 41, 43, 47, 49 |
| Workshop / mechanical | 9, 29, 37, 38, 49 |
| Household | 11, 23, 26 |
| Decorative | 3, 15, 20, 31, 38, 45 |
| Large multi-zone | 16, 22, 28, 32, 36, 37, 39, 41, 42, 44, 47, 49, 50 |

## 2. Background families (levels 6–50)

Levels 1–5 keep their own backgrounds. For levels 6–50:
- One compact family set is used, one portrait and one landscape NB2 image per family.
- Each family is soft and blurred so the object reads clearly, the same rule as levels 1–5.
- There is no text and no logos.

| Family | Look | Used by | Images |
|---|---|---|---|
| **STUDIO** (cleaning studio) | Light blue-grey studio wall and floor, soft top light, a faint cleaning-shelf blur | 11, 13, 15, 17, 20, 23, 25, 26, 27, 33, 35, 39 | 2 |
| **WORKSHOP** | Warm wooden workbench, pegboard with blurred tools, garage light | 8, 9, 18, 40 | 2 |
| **WASH** (bathroom / kitchen) | Light tiles, counter edge, soft window light | 6, 7, 10, 19, 28 | 2 |
| **YARD** (outdoor) | Grass, wooden fence, hedges, sky | 12, 14, 21, 29, 30, 34, 43, 49 | 2 |
| **PLAZA** (park / monument) | Stone paving, hedges, trees, a distant fortress-terrace feel (reference L-F / L-G) | 24, 31, 36, 41, 44 | 2 |
| **VIP** (premium studio) | Dark plum velvet, gold spotlight cone, subtle sparkles. Only for VIP-marked levels; presentation only, no VIP monetization in this step | 37, 38, 45, 46, 48, 50 (31 optional) | 2 |
| *special:* **SHORE** | Wooden lake dock, water | 32, 47 | 2 |
| *special:* pool deck / tub / cabin | The object fills the scene (pool basin, bathtub, shower). The background is the surrounding deck or tiles generated together with the object | 16, 22, 42 | per level |

In total the reusable families need 14 images, plus the specials for levels 16, 22 and 42.

Other reused material:
- Tool sprites, UI, foam and stamp textures, particles (drops, sparkles, chunks), the trash bin, the putty tub and the result-card frame.
- Material differences stay visible: rust vs steel, wood vs paint, glass, chrome, stone and velvet each get their own state layers per object.

## 3. Tool families and alternative-tool cards

### 3.1 New tools (each with a clear job)

| Tool | Job | Mechanic | Seen in reference | First use |
|---|---|---|---|---|
| Steel wool | Fine rust and burnt rings on metal | B-rev | cleaver | 7 |
| Wide scraper | Peel flaking paint, stickers, old silicone, barnacles | CH (peel) | putty knife / cleaver | 8 |
| Paint brush (+ can) | Paint small zones and trims | B-rev painted state (+load from 12) | stain sponge / roller | 8 |
| Wire brush | Loose rust on iron frames and joints | B-scr / B-rev | — | 9 |
| Angle grinder | Rust or old paint down to bright metal or raw wood (sparks) | B-rev +fx | cannon | 9 |
| Spray gun | Even paint coat on metal (mist) | jet B-rev painted state +fx | cannon | 9 |
| Polisher | Shine on chrome, steel, gold, marble or lacquer | B-rev shine +fx | cannon | 10 |
| Screwdriver | Unscrew / screw parts (hold on the screw) | PT hold | — (requested) | 11 |
| Roller + tray | Large flat zones of paint (dip, then roll) | B-rev +load | monument | 12 |
| Keycap puller | Pull keycaps | PT pull | keyboard | 13 |
| Air blower | Dust and crumbs out of electronics without water | jet B-rev | — | 13 |
| Cotton swab | Sticky spills in tiny gaps | B-rev | — | 13 |
| Hammer (+ punch) | Flatten dents, knock rivets out and set them | PT tap | — (requested) | 14 |
| Skimmer net | Floating junk out of water | DT | pool | 16 |
| Pump | Drain water (hold) | FL | pool | 16 |
| Grabber | Pick algae clumps or loose parts | PT pull | pool | 16 |
| Hose | Fill clean water (hold) | FL | pool | 16 |
| Laser cleaner | Precise rust or tarnish removal (beam, glow, smoke) | jet B-rev +fx | cleaver | 18 |
| Sharpener | Grind a new edge along the blade | B-rev on the edge strip +fx sparks | cleaver | 18 |
| Silicone gun | Lay a new bead along a seam | B-app on an edge region | — | 22 |
| Spin brush (long) | Graffiti and grime on stone | B-scr | monument | 24 |

These were rejected as tools added only for variety:
- **Vacuum cleaner:** the duster and dry brush already do this job.
- **Heat gun:** the scraper already peels.
- **Glue:** parts snap into slots instead.

**Drill (holes):** this is the electric screwdriver sprite with a drill bit, used on the PT hold stage (cannon, level 41).

### 3.2 Card families (base free · coins · premium)

Rules:
- The Step 7 rules apply unchanged: same job, same mechanic, and only small handling modifiers, with the radius or hold time at most 10 % better.
- Every stage is completable with the base tool.
- Prices are placeholders until the Step 10 balance pass.

| Family | Stage job | Base (free) | Coins | Premium | Art reuse |
|---|---|---|---|---|---|
| foam *(existing)* | foam | foam sprayer | foam gun 15 | foam cannon (ad) | — |
| scrub *(existing)* | scrub | scrub brush | oval brush 15 | drill brush 5◆ | — |
| wipe *(existing)* | dry / wipe | cloth | sponge 10 | magic eraser 3◆ | — |
| **rinse** | washer rinse | washer lance | turbo lance 20 | gold washer gun (ad) | 2 new sprites |
| **rust** | wire brush / steel wool | wire brush | steel wool pad 10 | wire-wheel drill 5◆ | drill-brush body + wire head (NB2 edit) |
| **scrape** | peel / scrape | wide scraper | putty knife (existing art) 10 | heated scraper 4◆ | putty knife reused |
| **sand** | sanding | sandpaper | sanding block 10 | orbital sander 5◆ | the sander is shared with grind |
| **grind** | grind to bright metal / wood | angle grinder | orbital sander 25 | gold grinder (ad) | sander shared |
| **polish** | shine | polisher | orbital polisher 20 | gold polisher 6◆ | — |
| **spray** | spray paint | spray gun | airbrush 20 | paint cannon (ad) | — |
| **roll** | roller paint (+load) | roller | wide roller 15 | foam roller 4◆ | — |
| **screw** | PT hold screws | screwdriver | electric screwdriver 20 | gold impact driver 5◆ | the electric screwdriver also serves as the drill |
| **hammer** | PT tap | hammer | rubber mallet 15 | golden hammer (ad) | — |
| **laser** | laser rust / tarnish | laser cleaner | wide-head laser 30 | pro laser 6◆ | — |

**No cards:** chisel, keycap puller, grabber, skimmer net, pump, hose, sharpener, swab, air blower, silicone gun, trash and parts. Each of these tools does a single job, and alternatives would only be decoration.

**Art budget for the cards:** about 22 new alternative sprites, generated per batch only for the families that batch uses. Each ad-unlock card uses the existing `tool-unlock` placement.

## 4. New reusable mechanics and extensions

### 4.1 `PointTargets` (new mechanic)

**Why the existing mechanics don't cover it:**
- Brush, ChunkBreak and Spots all measure tool *movement*, and holding still or tapping deliberately adds nothing. That rule exists to prevent cheating.
- Screwdrivers, hammers, pullers and grabbers act *on a point*:
  - holding on a screw turns it out;
  - each tap of a hammer flattens a dent one step;
  - holding on a keycap lifts it off.
- DragToTarget only moves loose items. It cannot first loosen a part that is fixed to the object.

**How it works:**
- The stage lists outlined target points from content data. Each point has a mode:
  - `hold` takes N ms with the working point on the target;
  - `tap` takes N separate taps;
  - `pull` is a hold, then the part flies to a tray or bin.
- Each target has visual states, such as a screw rising and spinning, then popping out, or a dent going through 3 flattening states.
- The same mode also runs in reverse for reinstalling, for example screwing a screw in.
- Progress is completed targets divided by the total.
- Tool cards may change hold time or taps by at most 10 %.
- The anti-cheat rule stays: the working point must be inside the target ring, and taps outside a target do nothing.

**Used by levels:**

| Mode | Levels |
|---|---|
| hold | 11, 19, 23, 25, 27, 29, 30, 33, 37, 38, 39, 41, 42, 43, 46, 48, 49, 50 |
| tap | 14, 18, 30, 40, 43, 50 |
| pull | 13, 16, 26, 36, 45 |

### 4.2 `FillLevel` (new mechanic)

**Why the existing mechanics don't cover it:**
- Coverage mechanics measure painted area. Draining a pool or filling it with clean water is a single **level** that rises or falls while the player holds the pump or hose.
- Brushing the water surface would feel wrong and would not read as draining.

**How it works:**
- The player holds the tool on its hotspot (the hose end or the pump intake). Pointer movement is not needed, but the tool must stay on the hotspot.
- While held, the level changes at a configured rate.
- The water layer is clipped at the level line, with a moving wave edge. Floating items ride on the surface.
- `mode`: `drain` (murky → empty) or `fill` (empty → clean).
- Progress is the level as a percentage, with a soft finish at 97 %.

**Used by levels:** 16, 22, 26, 32 (bilge), 36, 47 (bilge).

### 4.3 Extensions of existing mechanics (no new mechanic)

| Ext. | Extends | What changes | Why not a new mechanic | Used by |
|---|---|---|---|---|
| **E1 +load** | BrushMechanic | Optional `source` (paint tray, can, paste), borrowed from Spots: dip to load, the load is used up with distance, and an empty tool paints nothing (with a hint back to the source) | Painting is already Brush reveal of a painted state (chair stain stage); only the dip is new | 12, 20, 32, 34, 37, 43, 44, 46, 47, 49 |
| **E2 +slots** | DragToTargetMechanic | Removing a part sends it from the object to the tray or bin. Placing a part means dragging a new one from the tray to its outlined ghost slot, where it snaps and is drawn into the stack | Same drag / drop / ease-back rules; only per-item targets are added | 11, 13, 17, 18, 19, 20, 21, 23, 25–30, 32–35, 37–43, 45–50 |
| **E3 +zones** | Stage regions + LevelScene | A large object is split into named zones. During a stage, the inactive zones are dimmed slightly and the hint points into the active zone. There is no camera zoom; the whole object stays visible, as in the reference | Regions already exist per stage; only the highlight and authoring are added | 12, 20, 28, 29, 32, 34, 36, 37, 39, 41–44, 46, 47, 49, 50 |
| **E4 +fx** | ToolController / jet styles | New effects: `laser` beam (short glowing line plus smoke puffs), `sparks` (grinder, sharpener), `shine` sweep (polisher), `paint` mist (spray gun) | Pure presentation on Brush reveal | 9, 10, 14, 18, 31, 38, 40, 41, 44, 45, 48, 50 |

Sharpening is Brush reveal over a thin edge strip with sparks, so it does not need a new "swipe count" mechanic. Peeling is ChunkBreak with flake chunk maps.

## 5. Sample set (implement first, after approval)

There is one sample per new family. Each sample is a full level built at its final slot number, so no work is thrown away.

| Sample | Level | Validates | Representative stages |
|---|---|---|---|
| **S1** | **11 Desk Fan** | **PointTargets (hold)** remove and reinstall, **E2 slots** remove and place, **screw** card family | stage 1 unscrew 4 screws · stage 2 grille off · stage 7 grille into its slot · stage 8 screws in |
| **S2** | **12 Garden Bench** | **E1 load** (roller + tray, brush + can), **E3 zones** (slats vs frame), peel with the scraper, **roll** card family | stage 2 peel · stage 4 frame zone · stage 6 roller dip / paint · stage 7 brush + can |
| **S3** | **16 Swimming Pool** | **FillLevel** drain and fill, **PointTargets (pull)** grabber, special scene background | stage 2 drain · stage 3 algae · stage 9 fill |
| **S4** | **18 Rusty Cleaver** | **E4 fx** (laser beam, sharpener sparks, polish shine), **PointTargets (tap)** hammer rivets, **laser** card family | stage 1 laser · stage 2 / 9 hammer · stage 6 sharpen · stage 7 new handle |

Implementation plan (after approval):

1. **Engine work:**
   - `PointTargets` and `FillLevel` with unit tests;
   - E1–E4 inside the existing mechanics, keeping levels 1–5 byte-identical in behaviour;
   - card families screw, roll and laser;
   - catalog validation for the new parameters.
2. **Hub for 50 levels:** the menu currently shows 5 slots. It needs a scrolling or paged level grid, with display order kept separate from level IDs and progress-chest steps unchanged.
3. **Sample art:** NB2 only, about 55 generations and 40 background removals in total:
   - S1: object states and grille, screwdriver set;
   - S2: bench states, zone masks, roller / tray / can, YARD backgrounds;
   - S3: pool scene, water layers, pump / hose / grabber / net;
   - S4: cleaver states and parts, laser / punch / hammer / sharpener, WORKSHOP backgrounds.
4. **Build S1 → S2 → S3 → S4:**
   - each sample gets data tests, one real mouse pass and one real touch pass with focused checks;
   - all four are shown together for review: menu slots 11, 12, 16 and 18 open directly in a dev build;
   - **Checkpoint: sample approval.**
5. **Batches after approval.** Each batch gets art, assembly, focused validation (data, a phone-touch and desktop-mouse pass per new level, and screenshots), then a review and approval.

| Batch | Levels | Remaining after samples | Mostly reuses |
|---|---|---|---|
| A | 6–15 | 8 | samples S1 / S2 |
| B | 16–25 | 8 | S3 / S4 |
| C | 26–35 | 10 | |
| D | 36–45 | 10 | |
| E | 46–50 | 5 | |

If a sample is rejected, scaling stops for every level that depends on its family until the cause is fixed.

## 6. Risks and open questions

- **Build size.** Levels 1–5 take about 1.4 MB of art each, and the current dist is 9.9 MB. 50 levels at that rate is about 70 MB.
  - Plan: load art per level at level start (not all at boot), and keep backgrounds shared through the families.
  - The current YouTube Playables size limits must be checked against the live documentation before Step 11.
- **Stage length.** Late levels with 12 stages run about 120–150 s, matching the reference cannon at 130 s. The real lengths will be checked during balance (Step 10).
- **Reward values per level** are set in the Step 10 balance, not here.
