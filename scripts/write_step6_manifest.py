"""Adds the Step 6 assets (re-drawn tools, material foams; second pass: sideways drill and side-nozzle
foam can) to project/asset-manifest.json."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
P = {
    'shared/tool-mist-nozzle': ('56218069-81e2-48d6-bb1f-bd60f4b0858c', 'c1238a2e-9675-4975-a0b5-f96a044dbb8d', '9:16', "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one garden water mist spray wand standing perfectly vertical and perfectly straight: a small round red mist nozzle head at the very top whose spray opening points STRAIGHT UP toward the top edge of the image (the nozzle face is seen from the side, aligned with the wand axis, not angled), a straight black wand below it, and a black and red pistol trigger grip at the bottom. Straight side view, centered, the whole tool aligned on one vertical line. The entire tool fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No water, no text, no logos, no hands, no hose, no extra objects."),
    'shared/tool-foam-can-v2': ('6506e4e2-903f-4af9-bbf1-64f706b05915', '756f84fe-18af-41f5-af3f-52e474914e45', '9:16', "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one bright yellow aerosol foam spray can standing perfectly vertical, seen from the side, with a white spray actuator cap on top and a thin white spray straw nozzle sticking STRAIGHT UP from the cap, so the spray opening is at the very top of the image and points straight up toward the top edge. Glossy cylindrical yellow metal can with no label text. Straight side view, centered. The entire can fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No foam, no text, no letters, no logos, no hands, no extra objects."),
    'shared/tool-drill-brush-v2': ('c44e45c5-c54b-43b2-bf8b-be12ceae9a57', '31493798-c39c-44de-974b-dbdca66d2125', '9:16', "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one lime-green and black cordless power drill held vertically, seen exactly from the side, with a round green scrubbing brush attachment at the very top whose stiff bristles point STRAIGHT UP toward the top edge of the image (the brush is seen from the side as a short wide cylinder of bristles on top, bristle tips at the top), the drill body below and the battery pack at the bottom. Straight side view, centered, all parts on one vertical line. The entire tool fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no logos, no hands, no extra objects."),
    'materials/foam-rug': ('fd18fe19-ca88-4986-9e9a-7d5de5792d38', None, '1:1', "Seamless tileable top-down game texture of soapy foam sitting on top of a shaggy carpet: clumps of white foam with small bubbles caught between soft long carpet fibers, a faint green-gray carpet tint showing between the foam clumps, matte and fluffy, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."),
    'materials/foam-metal': ('f858d6dc-1562-489b-b7bd-708946c060dc', None, '1:1', "Seamless tileable top-down game texture of thin glossy soap suds on polished gold metal: a light layer of small shiny transparent bubbles and wet foam streaks with warm golden reflections showing through the suds, sparkling specular highlights, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."),
    'materials/foam-leather': ('f323d2ad-a216-4e90-a7da-8a699d412714', None, '1:1', "Seamless tileable top-down game texture of thick creamy upholstery cleaning foam on fabric: dense smooth off-white creamy foam with very fine micro bubbles, soft rounded mounds, a slight warm beige tint, matte satin look, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."),
    'materials/foam-sneaker': ('ebed0d1a-6878-44b6-903f-2ce6eaf21d85', None, '1:1', "Seamless tileable top-down game texture of bright white shoe-cleaning lather on sneaker mesh fabric: dense fluffy pure white lather with medium bubbles and a faint cool-gray mesh weave pattern visible underneath, crisp clean look, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."),
}


def sha(p):
    return hashlib.sha256((ROOT / p).read_bytes()).hexdigest()


# Step 6 second pass (2026-10-05): replace the v2 drill / can (review: Drill_brush_wrong_orientation,
# Foam_sprayer_wrong_orientation, Reference_drill_brush_correct_orientation).
P2 = {
    'shared/tool-drill-brush': ('6cde3106-2bdd-4dcc-b02b-ce889dfa9bf4', '65335f5d-b803-4c59-a961-51f1181e740d', '4:3', "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one lime-green and black cordless power drill seen exactly from the side, lying horizontally like it is being held to scrub a wall on the LEFT: the pistol grip and battery pack point down at the right, the chuck points LEFT, and a round green scrubbing brush attachment is mounted on the chuck at the far LEFT end, with its flat circular face of stiff bristles facing LEFT toward the left edge of the image (bristle tips at the far left, brush seen from the side as a short wide cylinder of bristles). Centered. The entire tool fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no logos, no brand names, no hands, no extra objects."),
    'shared/tool-foam-can': ('bb6f4db4-96dd-4341-abf1-329a83cf1661', '2cfab6a4-188c-4d28-99ca-3bfca8daf77b', '3:4', "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one bright yellow aerosol foam spray can standing upright, seen from the side, with a white spray actuator cap on top whose straight thin white nozzle tube sticks out HORIZONTALLY to the RIGHT, so the spray opening is at the right end of the tube, pointing right. Glossy cylindrical yellow metal can with no label text. Side view, centered. The entire can including the nozzle tube fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No foam, no text, no letters, no logos, no hands, no extra objects."),
    # Step 6 polish (2026-10-05): dust film for the chair frame (review Chair_duster_before_no_visual_change)
    'materials/dust-wood': ('682061f3-3b25-4c32-9e6a-6b888d40392f', None, '1:1', "Seamless tileable top-down game texture of a thick layer of household dust on dark weathered wood: a soft powdery light-gray dust film with fuzzy dust bunnies, fine lint fibers and tiny specks, mostly covering the surface so it looks dull, chalky and dusty, with only faint hints of dark gray wood grain showing through in a few thinner streaks, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."),
}
# Step 6 UI / reward pass (2026-10-06): chests, logo emblem, rewarded-ad button, menu background.
P3 = {
    'shared/ui-chest-timed': ('8fb33204-6028-454c-816b-84c99d570bc4', '7fbf0100-0a91-4eaa-9084-a4001d363d9a', '1:1', "Create a production 2D game icon for a casual cleaning mobile game. Subject: one small cute closed treasure chest, front three-quarter view from slightly above: chunky rounded honey-brown wooden body and domed lid with warm peach-orange painted wooden planks, shiny gold metal corner caps and bands, a round gold lock plate with a small heart-shaped keyhole in the middle of the front. Compact, friendly, toy-like proportions. Centered, the entire chest fits in the frame with 14% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no coins, no glow, no extra objects."),
    'shared/ui-chest-progress': ('27933333-29aa-41a9-b9d8-4bbe7b96ee95', '08e60882-a10d-40eb-bc2d-b8c0ac4b2522', '1:1', "Create a production 2D game icon for a casual cleaning mobile game. Subject: one large premium closed treasure chest, front three-quarter view from slightly above: chunky rounded body and domed lid in glossy mint-green and turquoise enamel, thick polished gold frame bands, gold corner caps and gold studs, a big shiny gold lock plate on the front holding a sparkling round magenta-pink gemstone. Rich, valuable, special-reward look, clearly grander than a small wooden chest. Centered, the entire chest fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no coins, no glow rays, no extra objects."),
    'shared/ui-logo-emblem': ('ae612815-72e5-4ffd-8e24-c81371039615', '87c93c55-4687-4a45-bb01-b05a4b933b98', '1:1', "Create a production 2D game logo emblem without any text for a casual cleaning and restoration mobile game. Subject: a round chunky badge emblem: a cream-white disc with a thick glossy peach-orange rim and a thin gold outer ring; inside it a cheerful yellow cleaning sponge with a green scrub layer, a few big shiny soap bubbles and two bright white four-point sparkle stars, plus a small spray of white foam. Bold readable shapes for a game menu header. Centered, the entire emblem fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. Absolutely no letters, no words, no numbers, no text of any kind."),
    'shared/ui-btn-orange': ('e2e51ad3-a9cf-49dd-a8ba-44b9b3254e52', '0be78584-68c8-4ae7-bdce-3f6f2ed0807e', '16:9', "Using the attached button sheet only as the style reference (same glossy chunky shape, same rounded-rectangle proportions, same darker bottom edge, same top highlight band and same rendering), create ONE new empty horizontal button in a vivid warm orange to coral-pink gradient with a darker reddish-orange bottom edge and a soft bright highlight band across its top. Front view, centered, wide horizontal rounded rectangle about 3.2 times wider than tall, fully visible with 12% clear padding on every side. Plain uniform flat medium gray background, no gradient, no cast shadow. Completely empty: no text, no icons, no symbols."),
    'shared/ui-btn-purple': ('289f1b77-80b8-422c-9af6-a3d84c1a32de', 'd6f050dc-6e7e-48a2-a18c-217eb57ad7e0', '16:9', "Using the attached button sheet only as the style reference (same glossy chunky shape, same rounded-rectangle proportions, same darker bottom edge, same top highlight band and same rendering), create ONE new empty horizontal button in a rich vivid purple: a violet-to-purple gradient face (light lilac-violet at the top, deeper royal purple at the bottom), a darker plum-purple bottom edge and a soft bright highlight band across its top. Front view, centered, wide horizontal rounded rectangle about 3.2 times wider than tall, fully visible with 12% clear padding on every side. Plain uniform flat medium gray background, no gradient, no cast shadow, no reflection. Completely empty: no text, no icons, no symbols."),
    'shared/icon-ad-clapper': ('0029610a-533d-4c89-886c-9e582987dc17', '7e58dce9-a0f2-4eda-81a1-a4922a8c95c6', '1:1', "Create a production 2D game icon for a casual mobile game: a watch-video-ad icon. A chunky rounded-square tile in soft light lime green with a slightly darker green rim and a glossy top highlight; on the tile a cute cartoon film clapperboard seen from the front: the hinged clapper bar on top tilted open at an angle with bold diagonal stripes in dark olive green and pale butter yellow, the board body below it pale lavender-white with a rounded dark green play triangle in its center. Bold simple readable shapes for small sizes. Centered, the entire tile fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no letters, no logos, no extra objects."),
    'shared/bg-menu-portrait': ('1dc437a5-ce62-4627-9673-525bf47b76f8', None, '9:16', "Vertical background for the level-select menu of a casual cleaning mobile game: a soft warm pastel cream-peach wall with a subtle large-scale wallpaper pattern of faint lighter diamond lattice lines and tiny soft sparkle dots, gentle warm light falling from the top center fading slightly darker toward the bottom corners, very calm and low contrast so cards and text placed over it stay readable. No objects, no furniture, no shelves, no windows, no people, no text, no logos. Smooth soft painterly casual mobile game background render, even and uncluttered over the whole frame."),
}
REJ = {'shared/tool-foam-can-v2': 'tool-foam-can-v2', 'shared/tool-drill-brush-v2': 'tool-drill-brush-v2', 'shared/ui-logo-emblem': 'ui-logo-emblem', 'shared/bg-menu-portrait': 'bg-menu-portrait'}


def entry(gid, job, bg, ar, prompt, date):
    if gid in REJ:  # superseded in the second pass: files archived in reference/rejected/shared
        master, cut, status = f'reference/rejected/shared/{REJ[gid]}.png', f'reference/rejected/shared/{REJ[gid]}-cutout.png', 'rejected'
    else:
        master, cut, status = f'reference/masters/{gid}.png', f'reference/cutouts/{gid}.png', 'completed'
    e = {
        'id': gid, 'status': status, 'prompt': prompt,
        'provider': 'Higgsfield MCP (https://mcp.higgsfield.ai/mcp)', 'higgsfieldProjectFolder': '21f4df55-05f7-4bef-a8c3-a68d58b70adb',
        'requestedModel': 'nano_banana_2', 'actualModel': 'nano_banana_flash (backend reported by the service for nano_banana_2 jobs)',
        'parameters': {'resolution': '2k', 'aspect_ratio': ar}, 'jobId': job, 'generatedAt': date,
        'masterPath': master, 'masterSha256': sha(master),
        'exportCommand': 'python scripts/prepare_levels.py',
    }
    if bg:
        e['backgroundRemoval'] = {'toolName': 'remove_background', 'model': 'image_background_remover', 'status': 'completed', 'inputJobId': job, 'operationJobId': bg, 'cutoutPath': cut, 'outputSha256': sha(cut), 'alphaReview': {'status': 'PASS'}}
    else:
        e['backgroundRemoval'] = {'status': 'not_needed', 'reason': 'full-bleed material texture, masked per object in prepare_levels.py'}
    return e


out = [entry(gid, *v, '2026-10-04') for gid, v in P.items()]
out2 = [entry(gid, *v, '2026-10-05') for gid, v in P2.items()]
out3 = [entry(gid, *v, '2026-10-06') for gid, v in P3.items()]
for e in out3:
    if e['id'] == 'shared/ui-btn-orange':
        e['references'] = [{'role': 'image_references (style only)', 'jobId': '80b72ba7-3072-472d-8b30-9bcc99a0a197', 'asset': 'soccer-ball/ui-buttons-sheet'}]
        e['crop'] = 'largest alpha component (the soft reflection under the button is dropped); nine-slice l/r = h*0.5, t = h*0.36, b = h*0.44'
    if e['id'] == 'shared/ui-btn-purple':
        e['references'] = [{'role': 'image_references (style only)', 'jobId': '80b72ba7-3072-472d-8b30-9bcc99a0a197', 'asset': 'soccer-ball/ui-buttons-sheet'}]
        e['crop'] = 'saturated (purple) shape only — a grey slab rendered under the lip is dropped — holes filled, largest component; nine-slice like ui-btn-orange; face centre -0.069 h'
    if e['id'] == 'shared/icon-ad-clapper':
        e['references'] = [{'role': 'designer reference (direction only, not copied)', 'file': 'clapperboard ad icon screenshot attached on 2026-10-06'}]
    if e['id'] == 'shared/bg-menu-portrait':
        e['backgroundRemoval'] = {'status': 'not_needed', 'reason': 'full-screen background'}
    if e['id'] in ('shared/bg-menu-portrait', 'shared/ui-logo-emblem'):
        e['rejectedReason'] = 'game designer review 2026-10-06: menu reverted to the approved background and shelf slots; the sponge emblem block is not wanted in the hub'

man = json.loads((ROOT / 'project/asset-manifest.json').read_text(encoding='utf-8'))
man['step6'] = {
    'updated': '2026-10-04',
    'reason': 'Step 6 bug review: tools re-drawn so the nozzle / brush head points at the object; material-specific foams',
    'replaces': {
        'shared/tool-mist-nozzle': 'reference/rejected/shared/tool-mist-nozzle-v1.png (nozzle head angled sideways)',
        'shared/tool-foam-can': 'reference/rejected/shared/tool-foam-can-v1.png (spray cap faced the viewer)',
        'shared/tool-drill-brush': 'reference/rejected/shared/tool-drill-brush-v1.png (brush disc faced the viewer)',
    },
    'pass2': {
        'updated': '2026-10-05',
        'reason': 'Step 6 second review: drill brush must be a side / rear-three-quarter view with the round brush sticking out sideways (Reference_drill_brush_correct_orientation); foam can nozzle must extend sideways so the foam visibly leaves it',
        'replaces': {
            'shared/tool-drill-brush': 'reference/rejected/shared/tool-drill-brush-v2.png (vertical drill, bristles up)',
            'shared/tool-foam-can': 'reference/rejected/shared/tool-foam-can-v2.png (straw straight up; jet ran straight up from the can)',
        },
        'credits': {'generations': 3, 'backgroundRemovals': 2},
        'derivedPolish': {'chair-dusty-frame': 'registered chair-dented frame + light gray dust film; fine detail (lint, specks) = high-pass of materials/dust-wood, wood shading kept (prepare_levels.dust_layer, strength 0.62); replaces the old chair-dusty frame, which differed by only ~10 % brightness'},
        'workingPoints': {'tool-drill-brush': 'centre of the bristle tuft at the left end (prepare_levels rule left-head)', 'tool-foam-can': 'tip of the side nozzle tube (rule right-tip)', 'tool-duster': 'centre of the fluffy head + head size [width, length] (rule head)'},
        'assets': out2,
    },
    'uiRewards': {
        'updated': '2026-10-06',
        'reason': 'Step 6 UI / reward pass: menu polish (logo emblem without text, wallpaper), timed chest, level-progress chest, x3 rewarded-ad button',
        'credits': {'generations': 7, 'backgroundRemovals': 6},
        'export': 'python scripts/prepare_levels.py rewards',
        'reused': 'icon-ad (Step 3 icon sheet), ui-tile-large (level cards), ui-pill, ui-progress-fill, ui-result-card',
        'assets': out3,
    },
    'credits': {'before': 863, 'generations': 7, 'backgroundRemovals': 4, 'note': 'one extra background removal of chair/dents-putty-sheet (job 71f3d559-64b7-4b4e-9cf3-2af8076f46b4) was submitted by mistake and is not used; the putty tub comes from the existing cutout'},
    'assets': out,
    'derived': {
        'scrubbed foams': 'each material foam + the brush-swirl relief of soccer-ball/tex-foam-swirl (prepare_levels.foam_layers)',
        'metal foam': '50 % material suds + 50 % white base foam, so the foamed trophy reads as covered in foam',
        'chair seat mask': 'mustard-yellow leather pixels of chair-clean (hue 30-65 deg, sat > 0.42), closed, filled, dilated 3 px',
        'sneaker scuffs mask': 'pixels darker in sneaker-scuffed than in sneaker-clean (> 12), blobs >= 40 px, dilated 14 px, filled',
        'putty tub': '7th part of reference/cutouts/chair/dents-putty-sheet.png',
    },
}
(ROOT / 'project/asset-manifest.json').write_text(json.dumps(man, indent=2), encoding='utf-8')
print(len(out), 'Step 6 assets recorded')
