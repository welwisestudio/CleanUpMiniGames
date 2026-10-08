"""Levels 16–50: state edits of the clean masters (Nano Banana 2, standard resolution, paid).
Every edit keeps the master's geometry, so it reuses the master's Background-Remover alpha
(no extra removal; edits are pixel-aligned with their master, see DECISIONS 2026-10-08).
Prompt = EDIT.format(N=noun, C=change). Run: python edits.py [level ...] -> JSON requests."""
import json
import sys
from pathlib import Path

EDIT = ("Edit the reference image. Keep the exact same {N}: identical size, position, silhouette, every part, camera angle and framing, "
        "and the same plain flat light gray background. Change only the surface: {C} No text, no cast shadow on the background.")

# level -> (noun, {state: change})
EDITS = {
    'swimming-pool': ('swimming pool', {
        'murky': "the pool is full of murky dark green dirty water with floating scum, the pool floor is not visible through the water.",
        'empty-dirty': "the pool is completely drained with no water at all: the tile walls and floor are covered with green algae, black mold spots, brown dirt and white limescale lines.",
        'empty-clean': "the pool is completely drained with no water at all: clean light blue mosaic tile walls and floor, spotless.",
    }),
    'leather-jacket': ('leather jacket', {
        'dirty': "the leather is dirty: brown mud splashes, gray grime and dark stains all over, dull and matte.",
        'dry': "the jacket is clean but old and dry: dull matte faded leather with fine cracks, creases and light scuffs, no shine.",
    }),
    'rusty-cleaver': ('cleaver', {
        'rusty': "the blade is covered with thick orange-brown rust and pitting, the wooden handle is grimy, gray and weathered, the rivets are dull and dark.",
        'bare': "the blade is bare freshly ground matte gray steel with fine circular grinding marks and no rust, the handle is raw dry pale sanded wood, the rivets are dull.",
    }),
    'toaster': ('toaster', {
        'greasy': "the toaster is greasy and dirty: brown grease splatters, burnt crumbs, sticky fingerprints and dull cloudy chrome.",
    }),
    'coir-doormat': ('doormat', {
        'dirty': "the mat is caked with dried mud, sand, crumbs, dead leaf bits and dark dirt, the fibers matted and dull.",
    }),
    'garden-grill': ('barbecue grill', {
        'rusty': "the body is faded with orange rust patches and grease stains, the cooking grate is dark and rusty with burnt grease.",
        'crust': "the cooking grate is completely covered with a thick black burnt carbon crust with cracks; everything else unchanged.",
    }),
    'bathtub': ('bathtub', {
        'murky': "the tub is filled with murky gray soapy dirty water with floating scum, the bottom is not visible.",
        'empty-dirty': "the tub is completely drained with no water: a dark grime ring, yellow soap scum, rust stains under the faucet and dirty feet, cloudy chrome.",
        'empty-clean': "the tub is completely drained with no water: clean glossy white enamel inside, spotless.",
    }),
    'retro-radio': ('radio', {
        'dirty': "the radio is old and dirty: sticky grime, faded scratched wood, a dirty stained fabric grille, yellowed knobs and dull finish.",
    }),
    'stone-lion': ('lion statue', {
        'dirty': "the statue is covered with green moss, black grime streaks, lichen spots and dirt.",
        'crust': "thick lumpy white-gray limestone crust patches cover the pedestal and the lion's paws; everything else unchanged.",
    }),
    'wooden-dresser': ('dresser', {
        'old': "the dresser is old and worn: scratched dull faded varnish, white water rings, grime and dark tarnished knobs.",
        'sanded': "the wood is raw freshly sanded pale bare wood with no varnish, the knobs are dull brass.",
    }),
    'aquarium': ('aquarium', {
        'murky': "the water is cloudy murky green, green algae covers the inside of the glass, the plants and rocks are barely visible.",
        'empty-dirty': "the aquarium is drained with no water: green algae smeared on the glass, dirty brown gravel, slimy plants and grimy rocks.",
        'empty-clean': "the aquarium is drained with no water: clean clear glass, clean gravel, plants and rocks.",
    }),
    'backpack': ('backpack', {
        'dirty': "the backpack is dirty: mud splashes, green grass stains, ink stains and gray grime, faded fabric.",
    }),
    'kitchen-stove': ('stove', {
        'greasy': "the stove is greasy: burnt grease splatters and brown stains on the cooktop, crusted spills, dirty knobs and a smudged oven window.",
        'crust': "thick black burnt-on food crust covers the cooktop around the burners; everything else unchanged.",
    }),
    'lawn-mower': ('lawn mower', {
        'muddy': "the mower is caked with mud and dried grass clippings on the deck and wheels.",
        'rusty': "the deck paint is gone: rusty bare metal deck and handle with orange rust, faded and dull.",
    }),
    'street-sign': ('sign', {
        'rusty': "the sign is old: faded peeling yellow paint with rust streaks, rust spots and dirt, the post is rusty.",
        'bare': "all the paint is gone: the sign plate is bare dull gray metal with no color and no symbol, the post is bare gray metal.",
    }),
    'table-lamp': ('lamp', {
        'tarnished': "the brass base and stem are dark tarnished with green-brown patina, the lampshade is dusty yellowed with stains.",
    }),
    'rowboat': ('rowboat', {
        'dirty': "the boat is weathered: green algae and barnacles on the hull, peeling cracked paint, grime and dead leaves inside.",
        'bare': "the hull is sanded bare pale wood with no paint, the seats and rim are raw sanded wood.",
    }),
    'game-controller': ('game controller', {
        'dirty': "the controller is dirty: sticky grime, greasy fingerprints, dust packed in the seams and dirty sticks and buttons.",
    }),
    'iron-gate': ('gate', {
        'rusty': "the gate is heavily rusted with orange-brown rust, flaking black paint and dirt.",
        'bare': "all paint is gone: the gate is bare ground dull gray metal with no rust.",
    }),
    'sofa': ('sofa', {
        'stained': "the sofa is dirty: coffee and juice stains, crumbs, dust, gray grime on the armrests and faded fabric.",
    }),
    'stone-fountain': ('fountain', {
        'murky': "the basins are full of murky green water with floating leaves and scum.",
        'empty-dirty': "the fountain is drained with no water: green moss, black grime and white lime crust in the basins and on the stone, a green tarnished spout.",
        'empty-clean': "the fountain is drained with no water: clean light sandstone basins, spotless.",
    }),
    'vintage-motorcycle': ('motorcycle', {
        'dirty': "the motorcycle is covered with mud splashes, dust and grime.",
        'rusty': "the chrome parts are rusty and dull, the red paint is faded and chipped, the seat is cracked.",
    }),
    'pocket-watch': ('pocket watch', {
        'tarnished': "the gold case and chain are dark tarnished and grimy, the glass over the dial is scratched and cloudy.",
    }),
    'upright-piano': ('piano', {
        'old': "the piano is old: scratched dull lacquer, dust, yellowed keys and grime.",
    }),
    'knight-armor': ('armor', {
        'rusty': "the armor is covered with orange-brown rust patches and grime, the leather straps are dry and cracked.",
    }),
    'cannon': ('cannon', {
        'rusty': "the iron barrel and wheel rims are rusty, the wooden carriage and wheels are gray, cracked and weathered.",
        'bare': "the barrel and rims are bare ground gray steel, the carriage and wheels are raw sanded pale wood.",
    }),
    'shower-cabin': ('shower cabin', {
        'dirty': "soap scum and water spots cloud the glass, limescale on the chrome, black mold in the grout lines and a dirty shower tray.",
    }),
    'bicycle': ('bicycle', {
        'muddy': "the bicycle is muddy: mud splashes on the frame and wheels, a rusty chain, rusty dull rims and handlebars, a dirty saddle.",
    }),
    'rider-statue': ('statue', {
        'patina': "the bronze is covered with green verdigris patina and black streaks, the stone plinth is grimy with moss.",
    }),
    'chandelier': ('chandelier', {
        'dusty': "the chandelier is covered with gray dust and cobwebs, the brass is tarnished and the crystals are cloudy.",
    }),
    'royal-throne': ('throne', {
        'old': "the throne is old: faded dusty stained velvet, chipped flaking gilding showing brown wood, and the gem sockets in the crest are empty with no gems.",
    }),
    'stone-patio': ('patio', {
        'dirty': "the slabs are dirty with green moss in the joints, dark dirt stains and dead leaves, the bistro set is rusty.",
    }),
    'carousel-horse': ('carousel horse', {
        'old': "the paint is chipped and faded, the gilding is flaking, grime and cracks everywhere.",
        'primer': "the horse is sanded and covered with an even matte white primer, no colors and no gold, the pole is dull gray.",
    }),
    'vintage-tractor': ('tractor', {
        'muddy': "the tractor is caked with mud on the wheels and body, the red paint is faded with rust spots.",
        'bare': "the body paint is gone: bare gray metal body and rims, the tires are clean black.",
    }),
    'vintage-car': ('car', {
        'dirty': "the car is dusty and muddy with rust spots, faded dull paint and cloudy chrome.",
        'primer': "the body is sanded down to an even matte gray primer with no color, the chrome parts are dull.",
    }),
}


def master_jobs():
    out = {}
    for line in (Path(__file__).parent / 'jobs.txt').read_text(encoding='utf-8').splitlines():
        kind, key, job = line.split()
        if kind == 'master':
            out[key] = job
    return out


if __name__ == '__main__':
    jobs = master_jobs()
    keys = sys.argv[1:] or list(EDITS)
    req = []
    for k in keys:
        noun, states = EDITS[k]
        for st, ch in states.items():
            req.append({'key': f'{k}/{st}', 'ref': jobs[k], 'prompt': EDIT.format(N=noun, C=ch)})
    print(json.dumps(req, ensure_ascii=False))
