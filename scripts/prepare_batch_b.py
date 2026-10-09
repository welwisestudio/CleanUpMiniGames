"""Step 8 Batch B: runtime assets for levels 16–50, the new background families (PLAZA, GARAGE,
VIP, SHORE), the new tools and the cosmetic tool skins.

Inputs:  reference/masters/<level>/{clean,<edit>}.png   (Nano Banana 2, standard resolution)
         reference/cutouts/<level>/clean.png             (Higgsfield Background Remover, 1 per object)
         reference/masters/shared/skin-*.png             (Nano Banana 2 recolour edits of tool masters)
         reference/cutouts/shared/tool-*.png             (new tools, Background Remover)
Outputs: public/assets/<level>/*, public/assets/backgrounds/bg-<family>-*.webp, public/assets/shared/*
         src/content/generated/levelMeta.js     (merged: bounds, regions, points, layer stack, tools)
         src/content/generated/batchBAssets.js  (runtime registry: per-level lazy assets + boot set)

The layer stack of every level is defined HERE (one source): the level configs build their layers
from LEVEL_META.levels[id].stack and only define the stages (src/content/levels/batchB/).
Run: python scripts/prepare_batch_b.py [level ...|tools|skins|backgrounds]
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
import prepare_levels as PL  # noqa: E402
import batch_b_core as K  # noqa: E402

ROOT = PL.ROOT
M, C, PUB = PL.M, PL.C, PL.PUB
OBJ = PL.OBJ
REG = ROOT / 'src/content/generated/batchBAssets.js'
REG_A = ROOT / 'src/content/generated/batchAAssets.js'
meta = PL.meta
assets = {}  # level -> {key: url}
boot = {}  # textures needed at boot (menu thumbnails, new tools, skins)
THUMB = 320  # light menu thumbnails (Batch B)

# ---- level specs ------------------------------------------------------------------------
# stack: bottom -> top above the static clean layer; entries (id, source, region, initial)
#   source: ('edit', state) | ('dull', img, amount) | ('wet', img) | ('dusty', img, strength)
#           | ('grime', img, amount) | ('img', name)        img = 'clean', an edit or an earlier layer id
#   region: None = the whole object; initial: 'full' (default) | 'chunks'
#   'FOAM' inserts the foam pair (scrubbed, foam; initially empty) for the foam / scrub stages
# images: composites built before the stack, ('over', base, top, region)
# points: name -> [(fx, fy), ...] share of the object bounds, snapped into `snap` region (or object)
S = {}


def spec(level, bg, states, stack, regions=(), foam=None, foam_region=None, images=(), points=None, poly=None, gems=None):
    S[level] = dict(bg=bg, states=states, stack=stack, regions=list(regions), foam=foam, foam_region=foam_region, images=list(images), points=points or {}, poly=poly, gems=gems)


L = lambda i, src, reg=None, init='full': (i, src, reg, init)  # noqa: E731
FOAM = 'FOAM'

# 16 · swimming pool (environment-like object; YARD)
spec('swimming-pool', 'yard', ['murky', 'empty-dirty', 'empty-clean'],
     [L('empty-clean', ('edit', 'empty-clean'), 'water'), L('empty-dirty', ('edit', 'empty-dirty'), 'water'), FOAM,
      L('murky', ('edit', 'murky'), 'water'), L('deck-dirty', ('grime', 'clean', 0.5), 'deck')],
     regions=[('water', ('diff', 'clean', 'murky', 0.1, 2)), ('deck', ('not', 'water'))],
     foam='ceramic', foam_region='water',
     points={'leaves': ([(0.35, 0.4), (0.55, 0.32), (0.45, 0.6), (0.65, 0.55), (0.3, 0.62)], 'water')})
# 17 · leather jacket (STUDIO)
spec('leather-jacket', 'studio', ['dirty', 'dry'],
     [L('dull', ('dull', 'clean', 0.35)), L('dry', ('edit', 'dry')), L('dirty', ('edit', 'dirty')), FOAM, L('dusty', ('dusty', 'dirty', 0.5))],
     foam='leather', points={'junk': ([(0.3, 0.35), (0.7, 0.55), (0.45, 0.75), (0.6, 0.25)], None)})
# 18 · rusty cleaver (WORKSHOP)
spec('rusty-cleaver', 'workshop', ['rusty', 'bare'],
     [L('smudge', ('dull', 'clean', 0.25)), L('edge-dull', ('dull', 'clean', 0.7), 'edge'), L('bare', ('edit', 'bare')),
      L('rusty', ('edit', 'rusty')), L('dusty', ('dusty', 'rusty', 0.5))],
     regions=[('blade', ('gray', 0.22, 0.2, 1.0)), ('edgeband', ('rows', 0.78, 1.0)), ('handle', ('not', 'blade')), ('edge', ('and', 'blade', 'edgeband'))])
# 19 · toaster (WASH)
spec('toaster', 'wash', ['greasy'],
     [L('smudge', ('dull', 'clean', 0.35)), L('wet', ('wet', 'clean')), L('greasy', ('edit', 'greasy')), FOAM, L('dusty', ('dusty', 'greasy', 0.45))],
     foam='degreaser', points={'dents': ([(0.27, 0.5), (0.47, 0.68)], None)})
# 20 · coir doormat (YARD)
spec('coir-doormat', 'yard', ['dirty'],
     [L('wet', ('wet', 'clean')), L('dirty', ('edit', 'dirty')), L('crust', ('edit', 'dirty'), 'crust', 'chunks'), FOAM, L('dusty', ('dusty', 'dirty', 0.65))],
     regions=[('crust', ('diff', 'clean', 'dirty', 0.3, 2))], foam='rug',
     points={'leaves': ([(0.3, 0.4), (0.6, 0.35), (0.45, 0.65), (0.75, 0.6)], None),
             'beat': ([(fx, fy) for fy in (0.32, 0.68) for fx in (0.22, 0.5, 0.78)], None)})
# 21 · garden grill (YARD)
spec('garden-grill', 'yard', ['rusty', 'crust'],
     [L('wet', ('wet', 'clean')), L('grime', ('grime', 'clean', 0.55)), L('rusty', ('edit', 'rusty')), FOAM, L('crust', ('edit', 'crust'), 'grate', 'chunks')],
     regions=[('grate', ('diff', 'clean', 'crust', 0.12, 3)), ('body', ('not', 'grate'))], foam='degreaser',
     points={'junk': ([(0.3, 0.55), (0.7, 0.5), (0.5, 0.8)], None)})
# 22 · bathtub (WASH)
spec('bathtub', 'wash', ['murky', 'empty-dirty', 'empty-clean'],
     [L('empty-clean', ('edit', 'empty-clean'), 'water'), L('chrome-dull', ('dull', 'clean', 0.55), 'chrome'), L('wet', ('wet', 'emptyfull')),
      L('empty-dirty', ('edit', 'empty-dirty')), FOAM, L('murky', ('edit', 'murky'), 'water')],
     regions=[('water', ('diff', 'clean', 'murky', 0.08, 2, 'largest')), ('top', ('rows', 0.0, 0.25)), ('feet', ('rows', 0.8, 1.0)), ('ends', ('or', 'top', 'feet')),
              ('enamel', ('gray', 0.08, 0.84, 1.0)), ('ends2', ('minus', 'ends', 'enamel')), ('chrome', ('minus', 'ends2', 'water'))],
     images=[('emptyfull', ('over', 'clean', 'empty-clean', 'water'))], foam='ceramic',
     points={'junk': ([(0.35, 0.4), (0.6, 0.45), (0.5, 0.35)], 'water')})
# 23 · retro radio (STUDIO)
spec('retro-radio', 'studio', ['dirty'],
     [L('dull', ('dull', 'clean', 0.4)), L('dirty', ('edit', 'dirty')), L('lint', ('dusty', 'dirty', 0.8), 'grille'), L('dusty', ('dusty', 'dirty', 0.45))],
     regions=[('grille', ('cols', 0.08, 0.52)), ('body', ('not', 'grille'))],
     points={'screws': ([(0.06, 0.08), (0.94, 0.08), (0.06, 0.92), (0.94, 0.92)], None)})
# 24 · stone lion (PLAZA)
spec('stone-lion', 'plaza', ['dirty', 'crust'],
     [L('wet', ('wet', 'clean')), L('dirty', ('edit', 'dirty')), L('moss', ('edit', 'dirty'), 'moss'), FOAM, L('crust', ('edit', 'crust'), 'crust', 'chunks')],
     regions=[('crust', ('diff', 'clean', 'crust', 0.12, 3)), ('moss', ('hue', 60, 160, 0.22, 0.12, 'dirty'))], foam='ceramic',
     points={'leaves': ([(0.3, 0.3), (0.65, 0.4), (0.45, 0.7), (0.75, 0.75)], None)})
# 25 · wooden dresser (WORKSHOP)
spec('wooden-dresser', 'workshop', ['old', 'sanded'],
     [L('dull', ('dull', 'clean', 0.4)), L('sanded', ('edit', 'sanded'), 'body'), L('sawdust', ('dusty', 'sanded', 0.55), 'body'),
      L('old', ('edit', 'old')), L('dusty', ('dusty', 'old', 0.5))],
     regions=[('knobs', ('hue', 30, 60, 0.4, 0.45)), ('body', ('not', 'knobs'))],
     points={'junk': ([(0.3, 0.08), (0.6, 0.06), (0.8, 0.1)], None)})
# 26 · aquarium (STUDIO)
spec('aquarium', 'studio', ['murky', 'empty-dirty', 'empty-clean'],
     [L('empty-clean', ('edit', 'empty-clean'), 'tank'), L('smudge', ('dull', 'emptyfull', 0.4), 'tank'), L('silt', ('grime', 'emptyfull', 0.45), 'tank'),
      L('empty-dirty', ('edit', 'empty-dirty'), 'tank'), L('murky', ('edit', 'murky'), 'tank'), L('dusty', ('dusty', 'clean', 0.55), 'stand')],
     regions=[('tank', ('diff', 'clean', 'murky', 0.1, 2)), ('stand', ('not', 'tank')), ('decorband', ('rows', 0.5, 0.85)), ('decor', ('and', 'tank', 'decorband')), ('glass', ('minus', 'tank', 'decor'))],
     images=[('emptyfull', ('over', 'clean', 'empty-clean', 'tank'))],
     points={'leaves': ([(0.3, 0.3), (0.55, 0.25), (0.7, 0.35), (0.42, 0.4)], 'tank')})
# 27 · backpack (STUDIO)
spec('backpack', 'studio', ['dirty'],
     [L('dull', ('dull', 'clean', 0.3)), L('wet', ('wet', 'clean')), L('dirty', ('edit', 'dirty')), L('stains', ('edit', 'dirty'), 'stains'), FOAM, L('dusty', ('dusty', 'dirty', 0.5))],
     regions=[('stains', ('diff', 'clean', 'dirty', 0.28, 3))], foam='rug',
     points={'junk': ([(0.3, 0.3), (0.7, 0.35), (0.5, 0.65), (0.35, 0.8)], None),
             'beat': ([(0.35, 0.3), (0.65, 0.3), (0.35, 0.6), (0.65, 0.6), (0.5, 0.82)], None)})
# 28 · kitchen stove (WASH)
spec('kitchen-stove', 'wash', ['greasy', 'crust'],
     [L('dull', ('dull', 'clean', 0.35)), L('wet', ('wet', 'clean')), L('greasy', ('edit', 'greasy')), FOAM, L('crust', ('edit', 'crust'), 'crust', 'chunks')],
     regions=[('crust', ('diff', 'clean', 'crust', 0.12, 3)), ('cooktop', ('rows', 0.0, 0.38))], foam='degreaser',
     points={'junk': ([(0.3, 0.15), (0.7, 0.2), (0.5, 0.55)], None)})
# 29 · lawn mower (GARAGE)
spec('lawn-mower', 'garage', ['muddy', 'rusty'],
     [L('dull', ('dull', 'clean', 0.4)), L('grime', ('grime', 'clean', 0.5)), L('rusty', ('edit', 'rusty')), FOAM, L('mud', ('edit', 'muddy'), 'mud', 'chunks')],
     regions=[('mud', ('diff', 'rusty', 'muddy', 0.16, 4))], foam='metal',
     points={'leaves': ([(0.55, 0.45), (0.7, 0.5), (0.4, 0.6)], None), 'dents': ([(0.16, 0.6), (0.3, 0.68), (0.42, 0.75)], None)})
# 30 · street sign (PLAZA)
spec('street-sign', 'plaza', ['rusty', 'bare'],
     [L('dull', ('dull', 'clean', 0.3), 'plate'), L('bare', ('edit', 'bare')), L('rusty', ('edit', 'rusty')), L('dusty', ('dusty', 'rusty', 0.5))],
     regions=[('platec', ('hue', 35, 70, 0.4, 0.4)), ('plate', ('fill', 'platec')), ('platefill', ('grow', 'plate', 4)), ('post', ('not', 'platefill'))],
     points={'junk': ([(0.4, 0.25), (0.6, 0.4)], 'plate'), 'bolts': ([(0.5, 0.08), (0.5, 0.42)], None)})
# 31 · table lamp (STUDIO)
spec('table-lamp', 'studio', ['tarnished'],
     [L('dull', ('dull', 'clean', 0.25), 'base'), L('tarnished', ('edit', 'tarnished')), L('lint', ('dusty', 'tarnished', 0.8), 'shade'), FOAM, L('dusty', ('dusty', 'tarnished', 0.4))],
     regions=[('shade', ('rows', 0.0, 0.47)), ('base', ('not', 'shade'))], foam='metal', foam_region='base',
     points={'junk': ([(0.3, 0.85), (0.7, 0.85)], None)})
# 32 · rowboat (SHORE)
spec('rowboat', 'shore', ['dirty', 'bare'],
     [L('dull', ('dull', 'clean', 0.4)), L('bare', ('edit', 'bare')), L('sawdust', ('dusty', 'bare', 0.55)), L('dirty', ('edit', 'dirty')),
      L('wet-dirty', ('wet', 'dirty')), L('grime', ('grime', 'dirty', 0.45)), L('barnacles', ('edit', 'dirty'), 'hull', 'chunks')],
     regions=[('hull', ('rows', 0.55, 1.0))],
     points={'leaves': ([(0.35, 0.35), (0.55, 0.3), (0.7, 0.38), (0.45, 0.42)], None)})
# 33 · game controller (STUDIO)
spec('game-controller', 'studio', ['dirty'],
     [L('dull', ('dull', 'clean', 0.35)), L('wet', ('wet', 'clean', )), L('dirty', ('edit', 'dirty')), L('scuff', ('grime', 'dirty', 0.5), 'grips'),
      L('gunk', ('grime', 'dirty', 0.6), 'detail'), L('lint', ('dusty', 'dirty', 0.75), 'detail'), L('dusty', ('dusty', 'dirty', 0.45))],
     regions=[('grips', ('hue', 240, 320, 0.15, 0.3)), ('drows', ('rows', 0.15, 0.62)), ('dcols', ('cols', 0.18, 0.82)), ('detail', ('and', 'drows', 'dcols'))],
     points={'junk': ([(0.3, 0.3), (0.7, 0.35), (0.5, 0.6)], None)})
# 34 · iron gate (PLAZA)
spec('iron-gate', 'plaza', ['rusty', 'bare'],
     [L('dull', ('dull', 'clean', 0.35)), L('bare', ('edit', 'bare')), L('grit', ('dusty', 'bare', 0.5)), L('rusty', ('edit', 'rusty')), L('dusty', ('dusty', 'rusty', 0.45))],
     regions=[('tips', ('rows', 0.0, 0.13)), ('bars', ('not', 'tips'))],
     points={'leaves': ([(0.3, 0.75), (0.55, 0.8), (0.75, 0.7), (0.45, 0.6)], None)})
# 35 · sofa (STUDIO)
spec('sofa', 'studio', ['stained'],
     [L('dull', ('dull', 'clean', 0.3)), L('wet', ('wet', 'clean')), L('stained', ('edit', 'stained')), L('stains', ('edit', 'stained'), 'stains'), FOAM, L('dusty', ('dusty', 'stained', 0.55))],
     regions=[('stains', ('diff', 'clean', 'stained', 0.25, 3))], foam='rug',
     points={'junk': ([(0.25, 0.45), (0.5, 0.5), (0.75, 0.45), (0.4, 0.3)], None),
             'beat': ([(fx, fy) for fy in (0.3, 0.6) for fx in (0.2, 0.5, 0.8)], None)})
# 36 · stone fountain (PLAZA)
spec('stone-fountain', 'plaza', ['murky', 'empty-dirty', 'empty-clean'],
     [L('empty-clean', ('edit', 'empty-clean'), 'water'), L('spout-dull', ('dull', 'clean', 0.55), 'spout'), L('wet', ('wet', 'emptyfull')),
      L('empty-dirty', ('edit', 'empty-dirty')), L('moss', ('edit', 'empty-dirty'), 'moss'), FOAM, L('murky', ('edit', 'murky'), 'water')],
     regions=[('water', ('diff', 'clean', 'murky', 0.1, 2)), ('spout', ('rows', 0.0, 0.14)), ('moss', ('hue', 60, 160, 0.25, 0.15, 'empty-dirty'))],
     images=[('emptyfull', ('over', 'clean', 'empty-clean', 'water'))], foam='ceramic',
     points={'leaves': ([(0.3, 0.5), (0.5, 0.55), (0.7, 0.5), (0.45, 0.25)], 'water')})
# 37 · vintage motorcycle (GARAGE)
spec('vintage-motorcycle', 'garage', ['dirty', 'rusty'],
     [L('dull', ('dull', 'clean', 0.4)), L('wet', ('wet', 'clean')), L('grime', ('grime', 'clean', 0.5)), L('rusty', ('edit', 'rusty')), FOAM, L('dirty', ('edit', 'dirty'))],
     regions=[('chrome', ('gray', 0.16, 0.5, 1.0)), ('paint', ('not', 'chrome'))], foam='degreaser',
     points={'junk': ([(0.35, 0.3), (0.6, 0.35)], None)})
# 38 · pocket watch (VIP)
spec('pocket-watch', 'vip', ['tarnished'],
     [L('dull', ('dull', 'clean', 0.22), 'case'), L('scratch', ('dull', 'clean', 0.6), 'glass'), L('tarnished', ('edit', 'tarnished')),
      L('chain-grime', ('grime', 'tarnished', 0.55), 'chain'), FOAM, L('dusty', ('dusty', 'tarnished', 0.45))],
     regions=[('glass', ('gray', 0.14, 0.72, 1.0)), ('glassf', ('grow', 'glass', 2)), ('case', ('not', 'glassf')), ('chainrows', ('cols', 0.7, 1.0)), ('chain', ('and', 'case', 'chainrows'))],
     foam='metal', foam_region='case')
# 39 · upright piano (VIP)
spec('upright-piano', 'vip', ['old'],
     [L('dull', ('dull', 'clean', 0.4), 'body'), L('wet', ('wet', 'clean'), 'body'), L('old', ('edit', 'old')), L('grime', ('grime', 'old', 0.55), 'keys'),
      L('lint', ('dusty', 'old', 0.8), 'keys'), L('dusty', ('dusty', 'old', 0.5))],
     regions=[('keylight', ('gray', 0.2, 0.62, 1.0)), ('keyrows', ('rows', 0.4, 0.68)), ('keys0', ('and', 'keyrows', 'keylight')), ('keys', ('grow', 'keys0', 4)), ('body', ('not', 'keys'))],
     points={'junk': ([(0.3, 0.12), (0.55, 0.1), (0.75, 0.14)], None)})
# 40 · knight armor (VIP)
spec('knight-armor', 'vip', ['rusty'],
     [L('straps-dry', ('dull', 'clean', 0.6), 'straps'), L('dull', ('dull', 'clean', 0.4), 'steel'), L('wet', ('wet', 'clean')), L('grime', ('grime', 'clean', 0.5)),
      L('rusty', ('edit', 'rusty')), FOAM, L('dusty', ('dusty', 'rusty', 0.45))],
     regions=[('straps', ('hue', 12, 40, 0.38, 0.15)), ('steel', ('not', 'straps'))], foam='metal',
     points={'dents': ([(0.5, 0.28), (0.43, 0.66), (0.57, 0.66)], None)})
# 41 · cannon (SHORE)
spec('cannon', 'shore', ['rusty', 'bare'],
     [L('dull', ('dull', 'clean', 0.4)), L('bare', ('edit', 'bare')), L('sawdust', ('dusty', 'bare', 0.55), 'wood'), L('rusty', ('edit', 'rusty')), L('dusty', ('dusty', 'rusty', 0.45))],
     regions=[('iron', ('gray', 0.3, 0.0, 0.55)), ('wood', ('not', 'iron')), ('top', ('rows', 0.0, 0.5)), ('barrel', ('and', 'iron', 'top')), ('rims', ('minus', 'iron', 'barrel'))],
     points={'leaves': ([(0.3, 0.7), (0.5, 0.75), (0.7, 0.65)], None)})
# 42 · shower cabin (WASH)
spec('shower-cabin', 'wash', ['dirty'],
     [L('dull', ('dull', 'clean', 0.35), 'fixtures'), L('wet', ('wet', 'clean')), L('dirty', ('edit', 'dirty')), L('mold', ('edit', 'dirty'), 'mold'),
      L('lime', ('grime', 'dirty', 0.5), 'fixtures'), FOAM],
     regions=[('mold', ('dark', 0.32, 'dirty')), ('tray', ('rows', 0.86, 1.0)), ('glass', ('not', 'tray')), ('fixtures', ('rows', 0.0, 0.3))], foam='ceramic',
     points={'junk': ([(0.35, 0.85), (0.55, 0.88), (0.7, 0.84)], None)})
# 43 · bicycle (GARAGE)
spec('bicycle', 'garage', ['muddy'],
     [L('dull', ('dull', 'clean', 0.35)), L('wet', ('wet', 'clean')), L('grime', ('grime', 'clean', 0.5)), L('rust', ('edit', 'muddy'), 'metal'), FOAM, L('muddy', ('edit', 'muddy'))],
     regions=[('metal', ('gray', 0.16, 0.35, 1.0))], foam='degreaser',
     points={'leaves': ([(0.78, 0.18), (0.82, 0.25)], None), 'bolts': ([(0.42, 0.25), (0.74, 0.22)], None)})
# 44 · rider statue (PLAZA)
spec('rider-statue', 'plaza', ['patina'],
     [L('haze', ('dull', 'clean', 0.25), 'bronze'), L('dull', ('dull', 'clean', 0.5), 'bronze'), L('wet', ('wet', 'clean')), L('patina', ('edit', 'patina')),
      L('moss', ('edit', 'patina'), 'moss'), FOAM],
     regions=[('plinth', ('rows', 0.55, 1.0)), ('bronze', ('not', 'plinth')), ('mossc', ('hue', 60, 160, 0.25, 0.12, 'patina')), ('moss', ('and', 'mossc', 'plinth'))],
     foam='ceramic', foam_region='plinth', points={'leaves': ([(0.3, 0.85), (0.5, 0.9), (0.7, 0.86)], None)})
# 45 · chandelier (VIP)
spec('chandelier', 'vip', ['dusty'],
     [L('dull', ('dull', 'clean', 0.25), 'brass'), L('smudge', ('dull', 'clean', 0.5), 'crystals'), L('grime', ('grime', 'clean', 0.5), 'brass'),
      L('old', ('edit', 'dusty')), FOAM, L('dust', ('dusty', 'dusty', 0.4)), L('cobweb', ('dusty', 'dusty', 0.85), 'top')],
     regions=[('brass', ('hue', 28, 62, 0.3, 0.3)), ('crystals', ('not', 'brass')), ('top', ('rows', 0.0, 0.45))], foam='metal', foam_region='brass')
# 46 · royal throne (VIP)
spec('royal-throne', 'vip', ['old'],
     [L('velvet-haze', ('dull', 'clean', 0.3), 'velvet'), L('dull', ('dull', 'clean', 0.22), 'frame'), L('sockets', ('edit', 'old'), 'gems'), L('old', ('edit', 'old'), 'nogems'), L('grime', ('grime', 'old', 0.45), 'frame'),
      L('velvet-dust', ('dusty', 'old', 0.75), 'velvet'), L('dusty', ('dusty', 'old', 0.4))],
     # crest stones: green / blue (gemc) and red (redc) inside the crest band; the velvet is red below it
     regions=[('redc', ('hue', 335, 20, 0.35, 0.18)), ('gemc', ('hue', 70, 300, 0.4, 0.25)), ('crest', ('rows', 0.0, 0.2)), ('stones', ('or', 'gemc', 'redc')),
              ('gems0', ('and', 'stones', 'crest')), ('gems', ('grow', 'gems0', 3)), ('velvet', ('minus', 'redc', 'gems')), ('nogems', ('not', 'gems')),
              ('framev', ('not', 'velvet')), ('frame', ('minus', 'framev', 'gems'))],
     points={'junk': ([(0.4, 0.62), (0.6, 0.6)], 'velvet')}, gems=True)
# 47 · stone patio (environment-like; YARD) — slabs: polygon outline (the remover kept only the bistro set)
spec('stone-patio', 'yard', ['dirty'],
     [L('unsealed', ('dull', 'clean', 0.3), 'slabs'), L('wet', ('wet', 'clean'), 'slabs'), L('primer', ('dull', 'clean', 0.75), 'furniture'),
      L('dirty', ('edit', 'dirty')), L('moss', ('edit', 'dirty'), 'moss'), FOAM],
     regions=[('furniture', ('alpha',)), ('slabs', ('not', 'furniture')), ('mossc', ('hue', 60, 160, 0.3, 0.15, 'dirty')), ('moss', ('and', 'mossc', 'slabs'))],
     foam='ceramic', foam_region='slabs', poly=[(512, 221), (999, 516), (999, 538), (512, 840), (25, 537), (25, 516)],
     points={'leaves': ([(0.25, 0.5), (0.45, 0.7), (0.7, 0.55), (0.6, 0.8), (0.35, 0.35)], 'slabs')})
# 48 · carousel horse (PLAZA)
spec('carousel-horse', 'plaza', ['old', 'primer'],
     [L('dull', ('dull', 'clean', 0.25)), L('primer', ('edit', 'primer')), L('sawdust', ('dusty', 'primer', 0.5)), L('old', ('edit', 'old'), None, 'chunks'),
      L('grime', ('grime', 'old', 0.45)), FOAM, L('dusty', ('dusty', 'old', 0.45))],
     regions=[('gold', ('hue', 36, 58, 0.45, 0.45)), ('goldg', ('grow', 'gold', 2)), ('body', ('not', 'goldg'))], foam='ceramic',
     points={'junk': ([(0.35, 0.3), (0.6, 0.6)], None)})
# 49 · vintage tractor (GARAGE)
spec('vintage-tractor', 'garage', ['muddy', 'bare'],
     [L('dull', ('dull', 'clean', 0.4)), L('bare', ('edit', 'bare'), 'body'), L('grime', ('grime', 'clean', 0.5), 'tires'), FOAM, L('muddy', ('edit', 'muddy'))],
     regions=[('tires', ('dark', 0.24)), ('tiresg', ('grow', 'tires', 2)), ('body', ('not', 'tiresg'))], foam='rubber', foam_region='tires',
     points={'leaves': ([(0.4, 0.25), (0.6, 0.3), (0.5, 0.45)], None), 'dents': ([(0.62, 0.32), (0.8, 0.36)], 'body')})
# 50 · vintage car (GARAGE, finale)
spec('vintage-car', 'garage', ['dirty', 'primer'],
     [L('dull', ('dull', 'clean', 0.4), 'body'), L('primer', ('edit', 'primer')), L('sawdust', ('dusty', 'primer', 0.5), 'body'), L('dirty', ('edit', 'dirty')), L('dusty', ('dusty', 'dirty', 0.5))],
     regions=[('chrome', ('gray', 0.14, 0.55, 1.0)), ('chromeg', ('grow', 'chrome', 2)), ('body', ('not', 'chromeg'))],
     points={'junk': ([(0.35, 0.35), (0.6, 0.3)], None), 'dents': ([(0.3, 0.6), (0.55, 0.62), (0.75, 0.6)], 'body')})

BG = {'plaza', 'garage', 'vip', 'shore'}


# ---- helpers -----------------------------------------------------------------------------
def reg_key(level, name, path):
    assets.setdefault(level, {})[f'{level}-{name}'] = path


def save_layer(level, name, img, q=88):
    PL.save_webp(img, PUB / level / f'{name}.webp', q)
    PL.review(level, name, img)
    reg_key(level, name, f'assets/{level}/{name}.webp')


def soft(m, sigma=1.2, inside=None):
    f = ndimage.gaussian_filter(m.astype(np.float32), sigma)
    return f * inside if inside is not None else f


def over(base, top, m):
    out = base.copy()
    out.alpha_composite(PL.mask_layer(top, m))
    return out


def build(src, imgs, a):
    kind = src[0]
    if kind == 'edit' or kind == 'img':
        return imgs[src[1]]
    base = imgs[src[1]]
    if kind == 'dull':
        return K.dull(base, a, src[2] if len(src) > 2 else 0.42)
    if kind == 'wet':
        return K.wet(base, a)
    if kind == 'dusty':
        return K.dusty(base, a, src[2] if len(src) > 2 else 0.6)
    if kind == 'grime':
        return K.grime(base, a, src[2] if len(src) > 2 else 0.55)
    raise ValueError(kind)


DENT_SIZE = 112  # object units (= the hammer stage target size in kit.js)


def dent_decal(src, x, y, size, seed=0):
    """A dent made from the surface itself: the patch under (x, y), darkened in a crescent on the
    upper-left inner wall (shadow), brightened on the lower-right rim (light catches the far wall),
    softly squeezed toward the centre, with a soft round alpha."""
    s = int(size)
    x0, y0 = int(x - s / 2), int(y - s / 2)
    patch = np.array(src.crop((x0, y0, x0 + s, y0 + s)).convert('RGBA')).astype(np.float32)
    yy, xx = np.mgrid[0:s, 0:s].astype(np.float32)
    cx = cy = (s - 1) / 2
    dx, dy = (xx - cx) / (s / 2), (yy - cy) / (s / 2)
    r = np.sqrt(dx * dx + dy * dy)
    # radial pinch: sample closer to the centre inside the dent (the surface looks pushed in)
    k = np.clip(1 - r, 0, 1) * 0.18
    sx = np.clip(cx + (xx - cx) * (1 - k), 0, s - 1).astype(int)
    sy = np.clip(cy + (yy - cy) * (1 - k), 0, s - 1).astype(int)
    rgb = patch[sy, sx, :3] / 255
    side = (dx * -0.7 + dy * -0.7)  # +1 toward the upper-left
    inner = r < 0.72
    # inner wall: deep shadow on the upper-left (the light comes from the upper left), lit lower-right
    wall = np.clip(r / 0.72, 0, 1) ** 1.5
    shade = np.where(inner, 1 - 0.62 * wall * np.clip(side + 0.35, 0, 1.3) - 0.12 * (1 - r), 1.0)
    lit = np.where(inner, 0.32 * wall * np.clip(-side + 0.1, 0, 1), 0.0)
    # crease: a thin dark ring where the metal bends, and a bright outer rim lower-right
    crease = np.clip(1 - np.abs(r - 0.72) / 0.06, 0, 1)
    rim = 0.45 * np.clip(1 - np.abs(r - 0.82) / 0.08, 0, 1) * np.clip(-side + 0.2, 0, 1)
    rgb = rgb * (shade * (1 - 0.45 * crease))[..., None] + (lit + rim)[..., None]
    rgb = np.clip(rgb, 0, 1)
    a = np.clip((0.98 - r) / 0.12, 0, 1) * (patch[:, :, 3] / 255)
    return Image.fromarray(np.dstack([rgb * 255, a * 255]).astype(np.uint8), 'RGBA')


_fam_bg = {}


def family_bg(fam):
    if fam not in _fam_bg:
        _fam_bg[fam] = Image.open(M / 'backgrounds' / f'bg-{fam}.png').convert('RGB')
    return _fam_bg[fam]


def run_level(level):
    sp = S[level]
    imgs, clean_a, reg = K.register(level, sp['states'], sp['poly'])
    if sp['poly']:
        # remover alpha on the same canvas transform as the polygon-extended alpha
        ra = K.source_alpha(level)
        pa = K.source_alpha(level, sp['poly'])
        H, W = pa.shape
        x0, y0, x1, y1 = PL.bbox(pa)
        s = OBJ * PL.FILL / max(x1 - x0, y1 - y0)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        im = Image.fromarray((ra * 255).astype(np.uint8), 'L').resize((round(W * s), round(H * s)), Image.LANCZOS)
        can = Image.new('L', (OBJ, OBJ), 0)
        can.paste(im, (round(OBJ / 2 - cx * s), round(OBJ / 2 - cy * s)))
        rr = Image.new('RGBA', (OBJ, OBJ), (0, 0, 0, 0))
        rr.putalpha(can)
        imgs['_remover'] = rr
    regions = {}
    for name, rs in sp['regions']:
        regions[name] = K.region(rs, imgs, clean_a, regions)
    for name, (_, b, t, r) in sp['images']:
        imgs[name] = over(imgs[b], imgs[t], soft(regions[r], 1.0, clean_a))
    soft_regions = {k: soft(v, 1.0, clean_a) for k, v in regions.items()}
    out = {'clean': imgs['clean']}
    stack = []
    for entry in sp['stack']:
        if entry == FOAM:
            area = soft_regions[sp['foam_region']] if sp['foam_region'] else clean_a
            PL.foam_layers(level, area, 0.18, sp['foam'])
            reg_key(level, 'foam', f'assets/{level}/tex-foam-full.webp')
            reg_key(level, 'foam-scrubbed', f'assets/{level}/tex-foam-scrubbed-full.webp')
            stack += [['scrubbed', 'empty', 'foam-scrubbed'], ['foam', 'empty', 'foam']]
            continue
        lid, src, rname, init = entry
        full = build(src, imgs, clean_a)
        imgs[lid] = full
        layer = PL.mask_layer(full, soft_regions[rname]) if rname else full
        # every state stays inside the clean silhouette (edits share the master alpha already)
        arr = np.array(layer).astype(np.float32)
        arr[:, :, 3] = np.minimum(arr[:, :, 3], clean_a * 255)
        out[lid] = Image.fromarray(arr.astype(np.uint8), 'RGBA')
        stack.append([lid, init, lid])
    for name, img in out.items():
        save_layer(level, name, img)
    # region masks (stage zones, fill areas)
    rb = {}
    for name, m in soft_regions.items():
        if name.endswith('g') and name[:-1] in soft_regions:
            continue
        PL.save_mask(m, PUB / level / f'{name}-mask.png', 512)
        reg_key(level, f'{name}-mask', f'assets/{level}/{name}-mask.png')
        if m.max() > 0.5:
            rb[name] = PL.bounds_of(m)
    PL.save_mask(clean_a, PUB / level / 'mask.png', 256)
    reg_key(level, 'mask', f'assets/{level}/mask.png')
    PL.outside_png(clean_a, PUB / level / 'mask-outside.png')
    reg_key(level, 'mask-outside', f'assets/{level}/mask-outside.png')
    # points (share of the object bounds, snapped onto the object / a region)
    x0, y0, x1, y1 = PL.bounds_of(clean_a)
    pts = {}
    for name, (lst, snap) in sp['points'].items():
        mask = regions[snap] if snap else clean_a > 0.5
        core = ndimage.binary_erosion(mask, iterations=12)
        if core.sum() > 500:
            mask = core
        res = []
        for fx, fy in lst:
            x, y = x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy
            xi, yi = int(min(OBJ - 1, max(0, x))), int(min(OBJ - 1, max(0, y)))
            if not mask[yi, xi]:
                xi, yi = PL.nearest_on(mask, x, y)
            res.append([xi, yi])
        pts[name] = res
    extra = {}
    if sp['gems']:
        comps = K.components(regions['gems'], min_area=60, max_n=6)
        gl = []
        for i, (area, cx, cy, size, sl, m) in enumerate(sorted(comps, key=lambda t: t[1])):
            full = np.zeros_like(clean_a, bool)
            full[sl] = m
            full = ndimage.binary_dilation(full, iterations=2)
            ys, xs = np.where(full)
            bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            piece = PL.mask_layer(imgs['clean'], soft(full, 0.8)).crop((bx0, by0, bx1, by1))
            PL.save_webp(piece, PUB / level / f'gem-{i + 1}.webp')
            reg_key(level, f'gem-{i + 1}', f'assets/{level}/gem-{i + 1}.webp')
            gl.append([int((bx0 + bx1) / 2), int((by0 + by1) / 2), int(max(bx1 - bx0, by1 - by0))])
        extra['gems'] = gl
    # menu thumbnails (dirty = every initially visible layer) and the result picture
    first = imgs['clean'].copy()
    for lid, init, _ in stack:
        if init != 'empty':
            first.alpha_composite(out[lid])
    # Step 9: dent decals made from the object's OWN starting surface (a patch of the first visible
    # state with concave shading: dark crescent toward the light, highlight on the far rim), so a
    # dent reads on every material; hammering fades the decal and reveals the untouched surface
    if 'dents' in pts:
        for i, (x, y) in enumerate(pts['dents']):
            d = dent_decal(first, x, y, DENT_SIZE, seed=i)
            PL.save_webp(d, PUB / level / f'dent-{i + 1}.webp', 92)
            reg_key(level, f'dent-{i + 1}', f'assets/{level}/dent-{i + 1}.webp')
    PL.save_webp(PL.fit(PL.crop_padded(first, 0.02), THUMB), PUB / level / 'thumb.webp', 84)
    PL.save_webp(PL.fit(PL.crop_padded(imgs['clean'], 0.02), THUMB), PUB / level / 'thumb-clean.webp', 84)
    boot[f'{level}-thumb'] = f'assets/{level}/thumb.webp'
    boot[f'{level}-thumb-clean'] = f'assets/{level}/thumb-clean.webp'
    PL.result_picture(level, family_bg(sp['bg']), imgs['clean'], 0.62)
    reg_key(level, 'result-picture', f'assets/{level}/result-picture.webp')
    for o in ('portrait', 'landscape'):
        assets[level][f'bg-{sp["bg"]}-{o}'] = f'assets/backgrounds/bg-{sp["bg"]}-{o}.webp'
    m = meta['levels'].setdefault(level, {})
    m.clear()
    m.update({'bounds': [x0, y0, x1, y1], 'registration': reg, 'stack': stack, 'regions': rb, 'points': pts, 'bg': sp['bg'], **extra})


# ---- shared sprites reused from Batch A levels ----------------------------------------------
REUSE = {
    'leaves': ['garden-bench-leaf-1', 'garden-bench-leaf-2', 'garden-bench-leaf-3', 'garden-bench-leaf-4', 'garden-bench-leaf-5'],
    'junk': ['toolbox-junk-rag', 'toolbox-junk-bag', 'toolbox-junk-glove', 'bathroom-sink-junk-soap', 'bathroom-sink-junk-tissue', 'bathroom-sink-junk-tube', 'bathroom-sink-junk-brush', 'bathroom-sink-junk-swabs', 'toolbox-junk-bolt', 'toolbox-junk-wire'],
    'screws': ['desk-fan-screw'],
    'dents': ['watering-can-dent-1', 'watering-can-dent-2', 'watering-can-dent-3'],
    'paint': ['garden-bench-paint-can', 'garden-bench-paint-tray'],
}


def add_reused():
    txt = REG_A.read_text(encoding='utf-8')
    a = json.loads(txt[txt.index('= {') + 2:txt.rindex('}') + 1])
    urls = {k: v for lv in a.values() for k, v in lv.items()}
    for level in S:
        for keys in REUSE.values():
            for k in keys:
                assets.setdefault(level, {})[k] = urls[k]


# ---- backgrounds ---------------------------------------------------------------------------
def run_backgrounds():
    out = PUB / 'backgrounds'
    out.mkdir(parents=True, exist_ok=True)
    for fam in sorted(BG):
        img = family_bg(fam)
        s = max(1080 / img.width, 1920 / img.height)
        p = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
        x, y = (p.width - 1080) // 2, (p.height - 1920) // 2
        p.crop((x, y, x + 1080, y + 1920)).save(out / f'bg-{fam}-portrait.webp', 'WEBP', quality=82, method=6)
        h = round(img.width * 9 / 16)
        y0 = min(round(img.height * PL.LANDSCAPE_TOP), img.height - h)
        img.crop((0, y0, img.width, y0 + h)).resize((1920, 1080), Image.LANCZOS).save(out / f'bg-{fam}-landscape.webp', 'WEBP', quality=82, method=6)


# ---- tools and skins -----------------------------------------------------------------------
NEW_TOOLS = [('tool-laser', 'top'), ('tool-spray-bottle', 'top'), ('tool-steam-cleaner', 'top'), ('tool-pump', 'top'), ('tool-hose', 'top'),
             ('tool-skimmer-net', 'top-center'), ('tool-whetstone', 'top-center'), ('tool-carpet-beater', 'top-center'), ('tool-mop', 'top-center'),
             # Step 9 polish pass
             ('tool-pool-brush', 'top-center'), ('tool-wash-mitt', 'top-center'), ('tool-crevice-brush', 'top')]


def run_tools():
    for name, rule in NEW_TOOLS:
        PL.tool(name, Image.open(C / 'shared' / f'{name}.png').convert('RGBA'), rule)
        boot[name] = f'assets/shared/{name}.webp'


# skin -> base tool cutout (the Background Remover cutout of the tool master the skin was edited from)
SKIN_BASE = {
    'washer': C / 'soccer-ball/tool-washer-lance.png', 'scrub': C / 'soccer-ball/tool-scrub-brush.png', 'foam': C / 'soccer-ball/tool-foam-sprayer.png',
    'screw': C / 'shared/tool-screwdriver.png', 'hammer': C / 'shared/tool-hammer.png', 'grinder': C / 'shared/tool-angle-grinder.png',
    'polisher': C / 'shared/tool-polisher.png', 'laser': C / 'shared/tool-laser.png',
}


def run_skins():
    for p in sorted((M / 'shared').glob('skin-*.png')):
        sid = p.stem[5:]
        base = Image.open(SKIN_BASE[sid.split('-')[0]]).convert('RGBA')
        rgb = Image.open(p).convert('RGB')
        a = base.split()[-1].resize(rgb.size, Image.LANCZOS)
        img = rgb.copy()
        img.putalpha(a)
        # the exact crop / fit of the base tool (prepare_assets.py / prepare_levels.tool): the skin
        # keeps the base's normalized working point
        bx = PL.bbox(np.array(a).astype(np.float32) / 255, 0.06)
        out = PL.fit(PL.crop_padded(img, 0.05, bx), 768)
        PL.save_webp(out, PUB / 'shared' / f'skin-{sid}.webp')
        PL.review('skins', sid, out)
        boot[f'skin-{sid}'] = f'assets/shared/skin-{sid}.webp'


STEPS = {'backgrounds': run_backgrounds, 'tools': run_tools, 'skins': run_skins}


def main():
    only = set(sys.argv[1:])
    for k, fn in STEPS.items():
        if not only or k in only:
            fn()
            print('done', k, flush=True)
    for level in S:
        if not only or level in only:
            run_level(level)
            print('done', level, flush=True)
    add_reused()
    # read the generated files only now (several workers may run on disjoint level sets; each
    # merges its own levels into what is on disk at the end)
    old = {}
    if PL.META_JS.exists():
        txt = PL.META_JS.read_text(encoding='utf-8')
        old = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
    old_reg = {'levels': {}, 'boot': {}}
    if REG.exists():
        txt = REG.read_text(encoding='utf-8')
        old_reg['levels'] = json.loads(re.search(r'BATCH_B_ASSETS = (\{.*?\});\n', txt, re.S).group(1))
        old_reg['boot'] = json.loads(re.search(r'BATCH_B_BOOT = (\{.*?\});\n', txt, re.S).group(1))
    for key in ('levels', 'tools', 'ui', 'sprites'):
        merged = dict(old.get(key, {}))
        merged.update(meta[key])
        meta[key] = merged
    PL.META_JS.write_text('// GENERATED by scripts/prepare_levels.py, prepare_batch_a.py and prepare_batch_b.py — do not edit by hand.\nexport const LEVEL_META = ' + json.dumps(meta, indent=1) + ';\n', encoding='utf-8')
    lv = dict(old_reg['levels'])
    for k, v in assets.items():
        lv[k] = {**lv.get(k, {}), **v}
    bt = {**old_reg['boot'], **boot}
    REG.write_text('// GENERATED by scripts/prepare_batch_b.py — do not edit by hand.\n'
                   '// Levels 16–50: art loaded when the level opens (levelId -> { textureKey: url }) and the boot set\n'
                   '// (light menu thumbnails, new tools, cosmetic skins).\n'
                   'export const BATCH_B_ASSETS = ' + json.dumps(lv, indent=1) + ';\n'
                   'export const BATCH_B_BOOT = ' + json.dumps(bt, indent=1) + ';\n', encoding='utf-8')


if __name__ == '__main__':
    main()
