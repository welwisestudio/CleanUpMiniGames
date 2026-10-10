"""Tool variety pass (Nano Banana 2, standard resolution, paid): new functional tools, alternative
tools (material / gold edits of approved tool masters) and more cosmetic skins (recolour edits of the
approved base tool masters — same silhouette, orientation, framing → the base cutout alpha and
working point are reused, no background removal).
Run: python variety.py -> JSON requests [{key, kind, params}]"""
import json

from tools import T
from skins import SKIN

FOLDER = '21f4df55-05f7-4bef-a8c3-a68d58b70adb'

# new functional tools (generated + 1 Background Remover each)
NEW = {
    'shared/tool-wheel-brush': ('car wash', "one long wheel and rim cleaning brush standing perfectly vertical: a long soft cylindrical brush head of dense gray synthetic bristles at the very top, a short neck and a slim black and blue rubber handle going straight down. Straight side view, centered.", 'brush', 12, 'crisp highlights', 'No text, no logos, no hands, no extra objects.'),
    'shared/tool-stone-brush': ('cleaning and restoration', "one stiff stone cleaning hand brush held upright with the bristles pointing straight up at the very top: a wide row of coarse tan natural-fiber bristles set in a dark oiled wooden block, and a short sturdy wooden handle going straight down. Straight front view, centered.", 'brush', 12, 'crisp highlights', 'No text, no logos, no hands, no extra objects.'),
    'shared/tool-upholstery-brush': ('cleaning', "one upholstery and fabric brush held upright with the bristles pointing straight up at the very top: a wide oval head of soft dense dark-blue bristles on a light wooden back, and a short rounded wooden handle going straight down. Straight front view, centered.", 'brush', 12, 'soft highlights', 'No text, no logos, no hands, no extra objects.'),
    'shared/tool-toothbrush': ('cleaning', "one cleaning detail toothbrush standing perfectly vertical with the small bristle head at the very top, the stiff white and mint-green bristles facing the viewer, and a slim transparent mint-green handle going straight down. Straight front view, centered.", 'brush', 14, 'crisp highlights', 'No text, no logos, no hands, no toothpaste, no extra objects.'),
    'shared/tool-soft-brush': ('electronics cleaning', "one soft electronics dusting brush standing perfectly vertical: a wide flat soft brush of fine light-gray goat hair at the very top, a silver metal ferrule and a slim matte black handle going straight down. Straight front view, centered.", 'brush', 12, 'soft highlights', 'No text, no logos, no hands, no extra objects.'),
    'shared/tool-brass-brush': ('restoration', "one brass wire detail brush standing perfectly vertical: a narrow head of shiny golden brass wire bristles at the very top, and a long slim varnished wooden handle going straight down. Straight side view, centered.", 'brush', 12, 'crisp highlights', 'No text, no logos, no hands, no extra objects.'),
    'shared/tool-polishing-cloth': ('cleaning', "one neatly folded fine microfiber polishing cloth in soft lavender purple, a thick soft square pad with a subtle velvet texture and a stitched hem, seen from the front, centered.", 'cloth', 14, 'soft highlights', 'No text, no logos, no hands, no extra objects.'),
    'shared/tool-dish-sponge': ('cleaning', "one rectangular kitchen dish sponge: a thick yellow foam sponge with a green scouring pad layer on top, seen from a slight three-quarter angle, centered.", 'sponge', 14, 'soft highlights', 'No text, no logos, no hands, no soap, no extra objects.'),
    'shared/tool-deck-brush': ('cleaning', "one wide deck scrubbing brush on a pole standing upright: a very wide rectangular orange brush block with stiff dark bristles pointing straight up at the very top, mounted on a long straight wooden pole going straight down. Straight front view, centered, the brush head wide and horizontal.", 'brush', 10, 'crisp highlights', 'No water, no text, no logos, no hands, no extra objects.'),
}

# edits of approved masters (no removal: the base cutout alpha is reused) — alternatives + skins
BASE = {
    'pool': ('7835da60-c8ee-4c87-b1a3-9cf088627e4a', 'telescopic pool brush'),
    'squeegee': ('25604c9b-21b4-4b5b-ac8f-871f52aa5476', 'squeegee'),
    'mitt': ('e0b15617-75c0-4bf4-ab5f-4401f4996608', 'wash mitt'),
    'washer': ('42692379-3210-4013-80c8-7ed6bda96c35', 'pressure washer lance'),
    'scrub': ('8a846bb8-153a-4e5e-bf3b-63907e0da262', 'scrub brush'),
    'foam': ('450a026b-545b-49d1-bd3c-b1455fb6d9fb', 'foam sprayer'),
    'screw': ('52fd17ec-bd4e-4b7a-91be-e80c3c259d18', 'screwdriver'),
    'hammer': ('93161e16-b5ca-4e8f-acf6-946769af0244', 'claw hammer'),
    'grinder': ('7865abf5-0b15-4618-aab2-2caaa085cdcb', 'angle grinder'),
    'polisher': ('2ddae8db-4ecc-4023-8ed3-68e3b438f28c', 'rotary polishing machine'),
    'laser': ('ed86e03d-e6c0-4b89-879b-e7a456f7346f', 'laser cleaning gun'),
    'roller': ('eff89575-8843-4a04-8750-ceac5702b18b', 'paint roller'),
    'spraygun': ('6ae53d4b-21ee-4256-9918-e0e02d5533e8', 'paint spray gun'),
    'wire': ('b8812d51-6714-42c6-8ecc-e55f37ddce92', 'wire brush'),
    'cloth': ('3a782fc3-734c-457e-a235-dc15ade01021', 'cleaning cloth'),
    'detail': ('961681e1-d4ad-4228-98b7-6c23fc7d65bf', 'detail brush'),
}

ALT = {  # functional alternatives (material / gold editions)
    'shared/tool-gold-pool-brush': ('pool', "a polished shiny gold brush head and a gold-plated telescopic pole, white bristles."),
    'shared/tool-pro-squeegee': ('squeegee', "a professional squeegee: a bright orange handle and frame with a thick black rubber blade."),
    'shared/tool-gold-squeegee': ('squeegee', "a polished shiny gold handle and frame with a black rubber blade."),
    'shared/tool-microfiber-mitt': ('mitt', "a gray and charcoal two-tone microfiber mitt with fine dense microfiber loops and a black cuff."),
    'shared/tool-wool-mitt': ('mitt', "a premium creamy white lambswool mitt with long soft natural wool fibers and a tan leather cuff."),
}

SKINS = {  # cosmetic recolours
    # one more skin for each existing skin family
    'washer-black': ('washer', "a premium matte black gun body and wand with polished chrome accents."),
    'scrub-blue': ('scrub', "a glossy royal blue back with white bristles."),
    'foam-retro': ('foam', "retro cream and cherry red body with chrome details."),
    'screw-pink': ('screw', "a transparent bubblegum pink handle, the same chrome shaft."),
    'hammer-black': ('hammer', "a satin black steel head and a matte black rubber grip with a thin orange stripe."),
    'grinder-black': ('grinder', "a premium matte black and graphite motor body and battery with orange accents, the same disc."),
    'polisher-retro': ('polisher', "retro mint green and cream body with a cream wool pad."),
    'laser-neon': ('laser', "a glossy neon green and black body with a green lens."),
    # new skin families
    'roller-red': ('roller', "a glossy fire-red handle and frame, the same white roller sleeve."),
    'roller-candy': ('roller', "playful candy colors: pink handle, mint frame and a white roller sleeve."),
    'roller-neon': ('roller', "a neon yellow handle and black frame, the same white roller sleeve."),
    'spraygun-red': ('spraygun', "a glossy fire-red gun body with a chrome nozzle and a clear paint cup."),
    'spraygun-black': ('spraygun', "a premium matte black gun body with gold accents and a clear paint cup."),
    'spraygun-neon': ('spraygun', "a glossy neon cyan and white gun body with a clear paint cup."),
    'wire-red': ('wire', "a glossy fire-red wooden handle, the same steel wire bristles."),
    'wire-industrial': ('wire', "an industrial safety-yellow and black handle, the same steel wire bristles."),
    'wire-candy': ('wire', "a bubblegum pink handle with mint stripes, the same steel wire bristles."),
    'cloth-pink': ('cloth', "a soft bubblegum pink microfiber cloth."),
    'cloth-blue': ('cloth', "a soft sky blue microfiber cloth."),
    'cloth-purple': ('cloth', "a soft violet purple microfiber cloth with a gold stitched hem."),
    'squeegee-red': ('squeegee', "a glossy fire-red handle and frame with a black rubber blade."),
    'squeegee-neon': ('squeegee', "a neon green handle and frame with a black rubber blade."),
    'squeegee-chrome': ('squeegee', "a polished chrome handle and frame with a black rubber blade."),
    'pool-red': ('pool', "a glossy fire-red brush head and a red and white pole, white bristles."),
    'pool-neon': ('pool', "a neon green brush head and a black pole, white bristles."),
    'pool-pink': ('pool', "a bubblegum pink brush head and a white pole, white bristles."),
    'mitt-pink': ('mitt', "a fluffy bubblegum pink chenille mitt with a magenta cuff."),
    'mitt-yellow': ('mitt', "a fluffy sunny yellow chenille mitt with an orange cuff."),
    'mitt-purple': ('mitt', "a fluffy violet purple chenille mitt with a dark purple cuff."),
    'detail-red': ('detail', "a glossy fire-red handle, the same bristles."),
    'detail-blue': ('detail', "a glossy royal blue handle, the same bristles."),
    'detail-gold': ('detail', "a polished gold handle, the same bristles."),
}


def requests():
    out = []
    for key, (g, s, n, p, h, x) in NEW.items():
        out.append({'key': key, 'kind': 'tool', 'params': {'model': 'nano_banana_2', 'aspect_ratio': '9:16', 'folder_id': FOLDER, 'use_unlim': False,
                                                         'prompt': T.format(G=g, S=s, N=n, P=p, H=h, X=x)}})
    for key, (b, change) in ALT.items():
        job, noun = BASE[b]
        out.append({'key': key, 'kind': 'alt', 'params': {'model': 'nano_banana_2', 'aspect_ratio': 'auto', 'folder_id': FOLDER, 'use_unlim': False,
                                                        'medias': [{'role': 'image_references', 'value': job}], 'prompt': SKIN.format(N=noun, C=change)}})
    for sid, (b, change) in SKINS.items():
        job, noun = BASE[b]
        out.append({'key': f'shared/skin-{sid}', 'kind': 'skin', 'params': {'model': 'nano_banana_2', 'aspect_ratio': 'auto', 'folder_id': FOLDER, 'use_unlim': False,
                                                                          'medias': [{'role': 'image_references', 'value': job}], 'prompt': SKIN.format(N=noun, C=change)}})
    return out


if __name__ == '__main__':
    print(json.dumps(requests(), ensure_ascii=False))


# ---- pass 2 (2026-10-10): functional tools with new interactions (generated + 1 Background Remover each) ----
NEW2 = {
    'shared/tool-sandblaster': ('restoration', "one sandblasting gun standing perfectly vertical with its long straight black ceramic nozzle pointing straight up at the very top: a sturdy dark gray metal gun body with a trigger and pistol grip, and a short thick black abrasive feed hose stub coming out of the bottom. Straight side view, centered.", 'gun', 12, 'crisp highlights', 'No sand, no spray, no text, no logos, no hands, no extra objects.'),
    'shared/tool-wet-vacuum': ('cleaning', "one wet and dry vacuum cleaner wand standing perfectly vertical: a wide flat black nozzle at the very top with its dark rectangular suction slot facing straight up, a straight gray plastic wand, and a short ribbed flexible yellow hose section with a black handle at the bottom. Straight front view, centered.", 'wand', 12, 'crisp highlights', 'No dust, no text, no logos, no hands, no extra objects.'),
    'shared/tool-spin-scrubber': ('cleaning', "one cordless electric spin scrubber standing upright: a round brush head at the very top with its circular face of dense turquoise bristles facing the viewer, seen face-on as a perfect circle, mounted on a long slim white and gray handle going straight down with a small power button. Straight front view, centered.", 'scrubber', 12, 'crisp highlights', 'No water, no foam, no text, no logos, no hands, no extra objects.'),
    'shared/tool-rotary-buffer': ('car care and restoration', "one handheld rotary buffing machine seen from the front: a large round soft white wool buffing pad at the top facing the viewer, seen face-on as a perfect circle, a compact orange and black motor body right behind it, and a straight black rubber grip handle going straight down below. Straight front view, centered.", 'machine', 12, 'soft highlights', 'No polish, no text, no logos, no hands, no extra objects.'),
    'shared/tool-cup-brush': ('restoration', "one cordless power drill with a twisted steel wire cup brush, seen from the front: the round steel wire cup brush at the top faces the viewer, seen face-on as a perfect circle of shiny steel wire bristles, the green and black drill body right behind it and the drill grip with its battery going straight down below. Straight front view, centered.", 'drill', 12, 'crisp highlights', 'No sparks, no text, no logos, no hands, no extra objects.'),
    'shared/tool-razor-scraper': ('cleaning', "one razor blade glass scraper held upright with the blade at the very top: a wide straight thin shiny steel razor blade with its sharp edge horizontal at the top, held in a compact bright blue plastic holder, and a short ergonomic blue and black handle going straight down. Straight front view, centered.", 'scraper', 14, 'crisp highlights', 'No text, no logos, no hands, no extra objects.'),
    'shared/tool-heavy-scraper': ('restoration', "one heavy-duty long-handled scraper standing upright: a wide straight sharpened steel blade with its edge horizontal at the very top, a short steel neck, and a long straight varnished wooden pole handle going straight down with a black rubber grip at the bottom. Straight front view, centered.", 'scraper', 10, 'crisp highlights', 'No text, no logos, no hands, no extra objects.'),
    'shared/tool-telescopic-brush': ('car wash', "one telescopic car wash brush standing upright: a large wide rectangular head of soft fluffy flagged blue and gray bristles at the very top, mounted on a long silver telescopic aluminium pole going straight down with a black foam grip at the bottom. Straight front view, centered, the brush head wide and horizontal.", 'brush', 10, 'soft highlights', 'No water, no foam, no text, no logos, no hands, no extra objects.'),
}


def requests2():
    return [{'key': key, 'kind': 'tool', 'params': {'model': 'nano_banana_2', 'aspect_ratio': '9:16', 'folder_id': FOLDER, 'use_unlim': False,
                                                  'prompt': T.format(G=g, S=s, N=n, P=p, H=h, X=x)}} for key, (g, s, n, p, h, x) in NEW2.items()]
