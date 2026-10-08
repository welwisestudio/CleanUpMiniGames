"""Step 8 levels 16–50: clean-master subjects (Nano Banana 2, standard resolution, paid credits —
designer approval 2026-10-08). The full prompt is MASTER.format(S=subject)."""

MASTER = ("Create a production 2D game sprite for a casual cleaning and restoration mobile game. Subject: {S} "
          "Brand-new or fully restored and spotless. It is the only object in the image. Centered, the entire object fits in the frame "
          "with 10% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, "
          "soft studio key light from the upper left, gentle ambient occlusion, crisp highlights, saturated clean colors, no outlines. "
          "Background: plain uniform flat light gray background, no gradient, no floor, no cast shadow. "
          "No text, no letters, no numbers, no logos, no brand marks, no other objects.")

# level id -> (aspect, subject)
SUBJECTS = {
    'swimming-pool': ('4:3', "a small rectangular in-ground backyard swimming pool seen from a high three-quarter angle from above, light blue mosaic tile walls and floor, white tile edging, a chrome ladder on the right side, a light sandstone coping around the pool, filled with crystal clear turquoise water."),
    'leather-jacket': ('1:1', "a classic brown leather jacket laid flat, front view, closed silver zipper, collar, two zip pockets, soft glossy leather, generic design."),
    'rusty-cleaver': ('4:3', "a heavy chef's meat cleaver lying horizontally, a wide rectangular polished mirror-steel blade on the left with a sharp straight edge at the bottom, a dark rosewood handle on the right fixed with three round brass rivets."),
    'toaster': ('1:1', "a retro two-slot chrome toaster with rounded edges, front three-quarter view from slightly above so both bread slots are visible, a black lever and a round black knob on the side."),
    'coir-doormat': ('4:3', "a rectangular natural coir doormat seen from above at a slight angle, thick bristly golden-brown coconut fibers with a simple dark brown rectangular border band."),
    'garden-grill': ('1:1', "a charcoal barbecue grill cart with the lid open, showing a shiny chrome cooking grate, a matte black enamel body, two side shelves and two wheels, front three-quarter view."),
    'bathtub': ('4:3', "a white freestanding clawfoot bathtub with four chrome feet and a chrome faucet, front three-quarter view from above so the inside is visible, filled with clear water."),
    'retro-radio': ('1:1', "a retro wooden tabletop radio with rounded corners, a woven fabric speaker grille on the left, a dial window with plain tick marks only and two round cream knobs on the right, front three-quarter view."),
    'stone-lion': ('1:1', "a stone lion statue lying calmly on a square stone pedestal, light gray granite, front three-quarter view."),
    'wooden-dresser': ('1:1', "a wooden three-drawer dresser in warm walnut with round brass knobs, four short legs, front three-quarter view."),
    'aquarium': ('4:3', "a rectangular glass home aquarium on a black wooden stand, sand-colored gravel, green plastic plants and gray decorative rocks inside, filled with clear water, a black lid, no fish."),
    'backpack': ('1:1', "a teal canvas backpack standing upright, front view, a front zip pocket, two side pockets, black zippers and padded shoulder straps, generic design."),
    'kitchen-stove': ('1:1', "a white freestanding kitchen stove with four gas burners under black cast-iron grates, a stainless steel cooktop, an oven door with a glass window and five black knobs, front three-quarter view from above."),
    'lawn-mower': ('1:1', "a red push lawn mower with a metal deck, four black wheels, a black handle and a gray grass collection bag, side three-quarter view."),
    'street-sign': ('3:4', "a diamond-shaped yellow metal warning sign with a simple black arrow symbol, mounted with two bolts on a gray galvanized metal post, front view."),
    'table-lamp': ('3:4', "a brass table lamp with a round brass base, a curved brass stem and a cream pleated fabric lampshade, front view."),
    'rowboat': ('4:3', "a small wooden rowboat seen from the side and slightly above, white painted hull with a navy blue stripe, varnished wooden seats and rim, two wooden oars resting inside."),
    'game-controller': ('4:3', "a generic game controller with two analog sticks, a cross-shaped direction pad and four round blank buttons, matte charcoal body with lilac grips, top view at a slight angle."),
    'iron-gate': ('1:1', "an ornate wrought-iron garden gate with curled scrolls and spear-tip finials, glossy black paint with small gold-painted tips, front view."),
    'sofa': ('4:3', "a three-seat fabric sofa in mustard yellow with three seat cushions, three back cushions and wooden legs, front three-quarter view."),
    'stone-fountain': ('1:1', "a two-tier round stone garden fountain with a large lower basin and a small upper bowl, light sandstone, a bronze water spout on top, the lower basin filled with clear water."),
    'vintage-motorcycle': ('4:3', "a classic vintage motorcycle, side view, glossy cherry-red fuel tank, chrome engine, chrome exhaust pipes and mirrors, black leather seat, spoked wheels, generic design."),
    'pocket-watch': ('1:1', "an antique gold pocket watch with the lid open, a white dial with plain tick marks only and ornate black hands, an engraved gold case and a short gold chain."),
    'upright-piano': ('1:1', "an upright piano in glossy black lacquer with white and black keys, a closed music stand, front three-quarter view."),
    'knight-armor': ('3:4', "a full medieval knight armor suit standing on a wooden stand, polished bright steel plates with brown leather straps, front view."),
    'cannon': ('4:3', "an antique black iron cannon on a wooden carriage with two large spoked wooden wheels with iron rims, side view."),
    'shower-cabin': ('3:4', "a modern shower cabin with a clear glass door, white wall tiles, a chrome rain shower head and a chrome mixer, front three-quarter view."),
    'bicycle': ('4:3', "a classic city bicycle, side view, mint-green frame, chrome handlebars and rims, a brown leather saddle and a wicker front basket."),
    'rider-statue': ('1:1', "a bronze equestrian statue of a generic fictional knight in armor riding a rearing horse, on a tall gray stone plinth, front three-quarter view."),
    'chandelier': ('1:1', "an ornate crystal chandelier with polished brass arms, many clear sparkling crystal drops and white candle-style bulbs, front view."),
    'royal-throne': ('3:4', "a royal throne with a carved gilded wooden frame, deep red velvet seat and backrest, and colorful gems set in the top crest, front view."),
    'stone-patio': ('1:1', "a square backyard terrace of light sandstone paving slabs seen from a high three-quarter angle, with a small white wrought-iron bistro table and two chairs in the middle."),
    'carousel-horse': ('1:1', "an ornate wooden carousel horse on a golden pole, painted white with a gilded saddle, a blue bridle and colorful painted flowers, side view."),
    'vintage-tractor': ('4:3', "a small vintage farm tractor, side view, bright red body, big black rear tires with red rims, small front wheels, a black seat and a short exhaust pipe, generic design."),
    'vintage-car': ('4:3', "a classic 1950s style convertible car, side view, glossy turquoise paint, white-wall tires, chrome bumpers and trim, generic design without badges and without a license plate."),
}

if __name__ == '__main__':
    import json
    import sys
    keys = sys.argv[1:] or list(SUBJECTS)
    print(json.dumps([{'key': k, 'aspect': SUBJECTS[k][0], 'prompt': MASTER.format(S=SUBJECTS[k][1])} for k in keys], indent=0, ensure_ascii=False))
