"""Writes project/asset-manifest.json for the Soccer Ball benchmark: exact prompts, requested and
actual model, Higgsfield job IDs, Background Remover jobs, alpha review, runtime paths.
Run after scripts/prepare_assets.py:  python scripts/write_asset_manifest.py
"""
import hashlib
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PROJECT_FOLDER = '21f4df55-05f7-4bef-a8c3-a68d58b70adb'  # Higgsfield project "CleanUp Mini Games – game assets"
CLEAN_JOB = '5ff2b8e2-c11f-4ac0-9504-61eba0b243f9'

P = {}
P['ball-clean'] = "Create a production 2D game sprite for a casual cleaning and restoration mobile game. Subject: a brand-new classic soccer ball with bright sunny yellow leather hexagon panels and royal blue pentagon panels, clean glossy surface, perfectly round, three-quarter front view from a slightly elevated camera, centered in the frame. The entire ball fits in the frame with 14% clear padding on every side. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, gentle ambient occlusion, crisp specular highlights, saturated clean colors, no outlines, no cel shading. Background: plain uniform flat light gray background, no gradient, no floor, no cast shadow on the background. No text, no logos, no labels, no brand marks, no extra objects."
P['bg-pitch-portrait'] = "Premium mobile game gameplay background, portrait 9:16, for a casual cleaning game whose hero object is the attached glossy yellow-and-blue soccer ball. Match the attached ball's rendering style exactly: semi-realistic polished 3D render, soft studio-quality lighting, rich but controlled colors. Do NOT draw the ball itself. Scene: an empty football stadium pitch seen from low player height, looking toward a goal. Upper 25% of the frame: a white goal frame with a softly blurred navy net with correct 3D depth (side netting and back netting visible), behind it softly out-of-focus dark stadium stands with warm floodlight bokeh glows, deep navy evening sky. Lower 75%: a lush, well-kept natural grass pitch with subtle alternating mown stripes running into perspective, fine realistic grass texture, a single crisp white penalty-area line in correct perspective near the goal; the foreground grass becomes gently blurred (shallow depth of field). Lighting: warm evening floodlights from behind the goal, a soft spotlight pool on the grass in the center of the frame where the game object will sit, gentle dark vignette at the edges and a darker top band so white UI elements on top read clearly. Colors: deep emerald and fresh green grass, not neon, cohesive with the ball's yellow and blue. Clean, calm, empty open center area. High-end polished casual mobile game art. No players, no ball, no people, no text, no logos, no advertising boards, no UI elements, no watermark."
P['tool-chisel'] = "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one wood carving chisel standing perfectly vertical, polished steel blade pointing straight up with the flat sharp cutting edge at the very top, short steel ferrule, rounded orange-brown varnished wooden handle at the bottom. Straight front view, slim, centered. The entire tool fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no logos, no hands, no extra objects."
P['tool-dry-brush'] = "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one rectangular wooden cleaning brush seen exactly from the side in horizontal orientation: light honey varnished wooden block body on top with rounded ends, dense dark brown natural bristles pointing straight down along the full length. Centered. The entire brush fits in the frame with 14% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no logos, no hands, no extra objects."
P['tool-foam-sprayer'] = "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one handheld foam sprayer standing perfectly vertical: a short red spray nozzle pointing straight up at the very top, glossy red plastic pump head and grip, a transparent cylindrical plastic tank below it half filled with light blue soapy liquid, a small black hose connector at the bottom. Straight front view, centered. The entire tool fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no logos, no hands, no extra objects."
P['tool-scrub-brush'] = "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one round wooden pot scrub brush (dish brush) seen exactly from the side: a rounded varnished beech-wood knob handle on top, a short cylindrical wooden head, a thin white ring, and a wide skirt of dense stiff gray bristles pointing straight down. Centered. The entire brush fits in the frame with 14% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no logos, no hands, no extra objects."
P['tool-washer-lance'] = "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one pressure washer lance standing perfectly vertical: a thin brushed-steel wand with a small brass spray nozzle tip at the very top, a black rubber grip section in the lower part and a dark gray connector with an orange ring at the bottom end. Straight front view, slim, centered. The entire tool fits in the frame with 10% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no logos, no hands, no hose, no extra objects."
P['tool-cloth'] = "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one neatly folded soft lime-green microfiber cleaning cloth, slightly crumpled with soft rounded folds and a visible fine microfiber texture, three-quarter top view, centered. The entire cloth fits in the frame with 14% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, gentle ambient occlusion, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no logos, no hands, no extra objects."
P['tex-foam'] = "Seamless tileable top-down game texture of thick white soap foam: dense small and medium round bubbles with thin cool gray-blue outlines, soft cool gray shadows between bubbles, wet glossy highlights, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."
P['tex-foam-swirl'] = "Seamless tileable top-down game texture of white soap foam that has been scrubbed with a brush: the foam forms many swirling circular spiral patterns and curved strokes, with a slight beige and pale yellow dirt tint inside the swirls, dense small bubbles, soft cool gray shadows, wet highlights, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."
EDIT = "Edit the reference image. Keep the exact same soccer ball: identical size, position, round silhouette, panel layout, camera angle and framing, and the same plain flat light gray background. "
P['ball-wet'] = EDIT + "Change only the surface: the ball is freshly washed and wet, covered with many clear water droplets of varied sizes and short water streaks, with a stronger wet glossy sheen. Colors stay bright yellow and royal blue. No text, no logos, no cast shadow on the background."
P['ball-stained'] = EDIT + "Change only the surface: the ball is old and grimy, covered with olive-brown grime, dark muddy blotches, smudges and stains over the panels, colors dulled and slightly desaturated but the yellow and blue panels are still recognizable underneath, matte dirty leather. No text, no logos, no cast shadow on the background."
P['ball-dusty'] = EDIT + "Change only the surface: the ball is very dirty and dusty, covered with olive-brown grime and dark stains, and on top of that a matte layer of dry gray-beige dust and fine powdery dirt specks, colors very dull and faded, panels only faintly visible. No text, no logos, no cast shadow on the background."
P['ball-mudcrust'] = "Edit the reference image. Keep the same position, size, camera angle and framing, and the same plain flat light gray background. The soccer ball is now completely encased in a thick layer of dried, cracked brown mud crust with chunky volume, earthy browns, deep cracks, small pebbles and dirt clumps; no ball panels are visible at all. The silhouette stays round, only slightly lumpy at the edge, and the same size as the original ball. Semi-realistic glossy casual mobile game render, soft studio light from the upper left. No text, no logos, no cast shadow on the background."
P['ui-surfaces-sheet'] = "Casual mobile game UI kit sheet. Plain uniform flat medium gray background. Five separate isolated UI surfaces arranged in a loose grid with very wide empty spacing between them, none touching, each fully visible: (1) a large rounded-square tool tile, inner surface a soft beige-peach vertical gradient, thick clean white rim, soft drop shadow, empty center; (2) a small rounded-square tile, warm tan inner surface, white rim, soft drop shadow, empty; (3) a horizontal white capsule counter plate with a subtle light gray bottom edge and soft drop shadow, empty; (4) a white rounded-square button plate with a light gray 3D bottom edge and soft drop shadow, empty; (5) a long horizontal glossy lime-green capsule progress fill bar with a light highlight stripe along the top. Glossy chunky rounded toy-like casual game UI style, flat saturated fills with a lighter top and darker bottom edge, no outlines. Absolutely no text, no letters, no numbers, no icons."
P['ui-buttons-sheet'] = "Casual mobile game UI button kit sheet. Plain uniform flat medium gray background. Three separate isolated empty horizontal rounded-rectangle buttons stacked vertically with very wide empty spacing between them, none touching, each fully visible: (1) a glossy bright green button with a darker green 3D bottom edge and a soft white highlight along the top; (2) a glossy sunny yellow button with a darker golden 3D bottom edge and highlight; (3) a glossy white button with a light gray 3D bottom edge and highlight. Chunky rounded toy-like casual game UI style, corner radius about 25% of the height, soft drop shadow, no outlines. Absolutely no text, no letters, no numbers, no icons on the buttons."
P['ui-icons-sheet'] = "Casual mobile game icon sheet. Plain uniform flat medium gray background. Six separate isolated icons arranged in a 3 by 2 grid with very wide empty spacing between them, none touching, each fully visible: (1) a shiny gold coin with an embossed star and a darker gold rim; (2) a glossy pink-magenta faceted diamond gem with white facet highlights; (3) a pause symbol made of two thick rounded dark navy vertical bars; (4) a chunky white house home symbol with a soft dark navy outline; (5) a round green check badge with a white check mark and a thin white rim; (6) a round red badge with a white play triangle and a thin white rim. Glossy chunky rounded toy-like casual game icon style, consistent lighting from the upper left. Absolutely no text, no letters, no numbers."
P['ui-result-card'] = "Empty casual mobile game reward card, front view, centered. A tall rounded-rectangle card with a clean white body, a thick warm tan rim around it and a soft drop shadow; across the top edge sits a wide peach-colored ribbon banner with a darker peach shaded lower edge and folded ribbon tails that extend beyond both sides of the card. The ribbon and the card body are completely blank. Glossy chunky rounded toy-like casual game UI style, soft studio light, no outlines. Plain uniform flat medium gray background. The whole card including the ribbon tails fits in the frame with 10% clear padding. Absolutely no text, no letters, no numbers, no icons, no pictures."
P['ui-shelf'] = "A single wide empty floating wall shelf for a casual mobile game menu: a long thick plank with a soft cream-white top surface and a slightly darker warm beige front edge, rounded corners, front three-quarter view from slightly above, a soft gentle shadow directly beneath it. Glossy chunky rounded toy-like casual game style, soft studio light. Centered, the whole shelf fits in the frame with 8% clear padding. Plain uniform flat medium gray background. No objects on the shelf, no brackets, no text."
P['fx-sheet'] = "Casual mobile game visual effects sprite sheet. Plain uniform flat medium gray background. Separate isolated small elements arranged in a loose grid with very wide empty spacing between them, none touching, each fully visible: four irregular chunks of dried cracked brown mud crust of different shapes and sizes; three clear glossy water droplets of different sizes; two bright white-yellow four-point sparkle stars. Semi-realistic glossy casual mobile game render, soft studio light from the upper left, no outlines. No text, no numbers."
P['fx-sparkle'] = "Casual mobile game visual effect sprite: one single bright white and pale yellow four-point sparkle star with a crisp solid core and short sharp rays, centered, filling about 60% of the frame, fully visible with clear padding. Glossy casual mobile game style. Background: plain uniform flat dark navy blue background, no gradient, no other objects, no text."

# id: (aspect, generation job, background-removal job or None, reference jobs)
JOBS = {
    'ball-clean': ('1:1', CLEAN_JOB, '57f6769b-c864-4ee7-8015-5f6600ca501e', []),
    'bg-pitch-portrait': ('9:16', '758073a2-92d8-41f6-aad1-2fc4daedfb41', None, [CLEAN_JOB]),
    'tool-chisel': ('9:16', 'a46d1c6c-2598-4dde-890b-6b71548faef8', '2a2986c9-68d7-461c-b73a-31b77f713fa1', []),
    'tool-dry-brush': ('3:2', '9b8b3f3b-b1ee-4eb2-8152-6134492abc28', '86460919-5088-4f7c-9694-862d324abd6f', []),
    'tool-foam-sprayer': ('9:16', '450a026b-545b-49d1-bd3c-b1455fb6d9fb', 'd5b57024-f7cc-4085-9e62-6a2564a14abe', []),
    'tool-scrub-brush': ('1:1', '8a846bb8-153a-4e5e-bf3b-63907e0da262', 'daaacee7-38fa-483a-9c47-9dd84d22a4c8', []),
    'tool-washer-lance': ('9:16', '42692379-3210-4013-80c8-7ed6bda96c35', 'beeeeb29-1e34-491d-8887-d4cff0626d75', []),
    'tool-cloth': ('4:3', '3a782fc3-734c-457e-a235-dc15ade01021', '78643b2a-3134-4e0c-bc88-3df1d464b2d8', []),
    'tex-foam': ('1:1', 'af84e1f0-26c2-4483-b192-3f406fdcc4d6', None, []),
    'tex-foam-swirl': ('1:1', '9fca648b-535a-4d3b-b07f-a63340d62f0b', None, []),
    'ball-wet': ('1:1', '19b9776d-5ea7-48a9-9340-44eda9a9bd1e', 'cb83b8d1-764b-41e6-b0dd-202387f3ab1e', [CLEAN_JOB]),
    'ball-stained': ('1:1', 'fea6191c-c5f7-41e1-909e-1b2c5def4a44', '93271530-c680-4ed9-9820-f7ea2ecad1f3', [CLEAN_JOB]),
    'ball-dusty': ('1:1', 'b2ce0212-ed56-4c6e-908b-c0b45f26cb58', '0aaf9823-d025-4634-be7a-31b1b48f9bf8', [CLEAN_JOB]),
    'ball-mudcrust': ('1:1', 'b2365482-d870-4a1c-a84c-70a12ad87d0c', 'd236e6de-71b1-4230-8b80-d22fe2d35ecc', [CLEAN_JOB]),
    'ui-surfaces-sheet': ('1:1', '95b3d503-9489-46d0-805d-eecf916ee8d9', '2fadf7b3-1f6b-4764-b72d-56c0cd0b8ee6', []),
    'ui-buttons-sheet': ('1:1', '80b72ba7-3072-472d-8b30-9bcc99a0a197', 'b5e9bbea-d8ec-4bc0-84f9-120ea865e9ff', []),
    'ui-icons-sheet': ('1:1', 'f40d11de-2da3-4eac-a778-632055cfe193', '46c863f1-f59c-4003-9096-ab70c540220e', []),
    'ui-result-card': ('3:4', '50510bb8-c939-4f41-8a3f-6718e1ad2d22', 'be652969-1de9-4676-93c8-0c2ae64230ea', []),
    'ui-shelf': ('16:9', 'bdacc175-bb5f-48e7-8b62-651abdf11cda', '5441894b-d959-4076-8784-5a07eebd843d', []),
    'fx-sheet': ('1:1', 'dbd27fc4-bcbf-4148-b0c4-05f6e839e775', 'e1e9b28d-17ee-48ab-9654-493268f373f7', []),
    'fx-sparkle': ('1:1', '8a515e30-95ba-4a64-a871-8635537f2dca', '24bd673c-cb04-4fd4-8c35-a8a4632c6570', []),
}

RUNTIME = {
    'ball-clean': ['soccer-ball/ball-clean.webp', 'soccer-ball/mask-outside.png', 'soccer-ball/result-picture-soccer-ball.webp'],
    'ball-wet': ['soccer-ball/ball-wet.webp'],
    'ball-stained': ['soccer-ball/ball-stained.webp'],
    'ball-dusty': ['soccer-ball/ball-dusty.webp', 'soccer-ball/thumb-soccer-ball.webp'],
    'ball-mudcrust': ['soccer-ball/ball-mudcrust.webp'],
    'bg-pitch-portrait': ['soccer-ball/bg-pitch-portrait.webp', 'soccer-ball/bg-pitch-landscape.webp', 'soccer-ball/result-picture-soccer-ball.webp'],
    'tex-foam': ['soccer-ball/tex-foam-full.webp', 'soccer-ball/stamp-foam.webp', 'soccer-ball/tex-foam-scrubbed-full.webp'],
    'tex-foam-swirl': ['soccer-ball/tex-foam-scrubbed-full.webp'],
    'ui-surfaces-sheet': ['ui/ui-tile-large.webp', 'ui/ui-tile-small.webp', 'ui/ui-btn-square.webp', 'ui/ui-pill.webp', 'ui/ui-progress-fill.webp'],
    'ui-buttons-sheet': ['ui/ui-btn-green.webp', 'ui/ui-btn-yellow.webp', 'ui/ui-btn-white.webp'],
    'ui-icons-sheet': ['ui/icon-coin.webp', 'ui/icon-diamond.webp', 'ui/icon-pause.webp', 'ui/icon-home.webp', 'ui/icon-check.webp', 'ui/icon-ad.webp'],
    'ui-result-card': ['ui/ui-result-card.webp'],
    'ui-shelf': ['ui/ui-shelf.webp'],
    'fx-sheet': [f'soccer-ball/fx-chunk-{i}.webp' for i in range(1, 6)] + ['soccer-ball/fx-drop-1.webp', 'soccer-ball/fx-drop-2.webp'],
    'fx-sparkle': ['soccer-ball/fx-sparkle.webp'],
}
for t in ['chisel', 'dry-brush', 'foam-sprayer', 'scrub-brush', 'washer-lance', 'cloth']:
    RUNTIME[f'tool-{t}'] = [f'soccer-ball/tool-{t}.webp']

NOTES = {
    'bg-pitch-portrait': 'Step 3 revision (CP2 feedback "background looks cheap"): candidate A of 2 (jobs 758073a2-92d8-41f6-aad1-2fc4daedfb41 chosen, 14a9dbab-3e17-4f1b-8856-001d5d7812d2 rejected: flat seam in the top band, smaller goal). Landscape runtime = 16:9 crop of this master (LANDSCAPE_TOP in prepare_assets.py) until a dedicated landscape generation exists. Replaced masters: reference/rejected/soccer-ball/bg-pitch-*-v1.png (jobs 458458ef-d681-4218-875d-59524a25659f, e3680ca5-f0ca-482c-ad09-e8df8afda626).',
    'tex-foam': 'Step 3 revision: also the colour and bubble source of tex-foam-scrubbed-full (the scrubbed state of the same foam).',
    'tex-foam-swirl': 'Step 3 revision: no longer shown as its own image (it read as a different foam). Only its swirl relief and faint beige tint are used to shape tex-foam-scrubbed-full, which keeps the colour and bubbles of tex-foam. Runtime files tex-foam-swirl-full.webp and stamp-swirl.webp removed.',
    'fx-sheet': 'Background Remover dropped the two white sparkle stars (white glow on gray); mud chunks and droplets kept. Sparkle regenerated separately (fx-sparkle) on a dark navy background.',
    'ball-mudcrust': 'Crust cracks follow the panel seams (faint panel pattern visible); accepted as a readable mud-encased ball. Registered with the clean-ball scale so the crust volume extends ~1% beyond the ball.',
    'ui-icons-sheet': 'The pause icon came out as two separate bars; merged into one sprite during slicing.',
    'ui-surfaces-sheet': 'The selected-tile green frame is drawn in code (thin ring with a hollow centre is unreliable for segmentation).',
}


def sha(p):
    return hashlib.sha256((ROOT / p).read_bytes()).hexdigest()


meta = json.loads(re.search(r'= (\{.*\});', (ROOT / 'src/content/generated/assetMeta.js').read_text(encoding='utf-8'), re.S).group(1))
assets = []
for aid, (ar, job, bg, refs) in JOBS.items():
    master = f'reference/masters/soccer-ball/{aid}.png'
    m = Image.open(ROOT / master)
    e = {
        'id': aid,
        'status': 'completed',
        'prompt': P[aid],
        'referenceFiles': [f'job:{r} (ball-clean master, image_references)' for r in refs],
        'provider': 'Higgsfield MCP (https://mcp.higgsfield.ai/mcp)',
        'higgsfieldProjectFolder': PROJECT_FOLDER,
        'requestedModel': 'nano_banana_2',
        'actualModel': 'nano_banana_flash (backend reported by the service for nano_banana_2 jobs)',
        'parameters': {'resolution': '2k', 'aspect_ratio': ar},
        'jobId': job,
        'generatedAt': '2026-10-04',
        'masterPath': master,
        'masterSize': list(m.size),
        'masterSha256': sha(master),
    }
    if bg:
        cut = f'reference/cutouts/soccer-ball/{aid}.png'
        c = Image.open(ROOT / cut)
        a = np.array(c.convert('RGBA'))[:, :, 3]
        ys, xs = np.where(a > 16)
        review = f'reference/review/soccer-ball/{aid}.png'
        e['cutoutPath'] = cut
        e['backgroundRemoval'] = {
            'required': True,
            'provider': 'Higgsfield MCP',
            'toolName': 'remove_background',
            'model': 'image_background_remover',
            'status': 'completed',
            'inputJobId': job,
            'operationJobId': bg,
            'processedAt': '2026-10-04',
            'outputSize': list(c.size),
            'outputSha256': sha(cut),
            'alphaReview': {
                'status': 'PASS',
                'hasTransparentPixels': bool((a < 8).any()),
                'hasOpaquePixels': bool((a > 247).any()),
                'marginsPx_LTRB': [int(xs.min()), int(ys.min()), int(c.width - 1 - xs.max()), int(c.height - 1 - ys.max())],
                'lightDarkGamePreviewPaths': [review] if (ROOT / review).exists() else [],
                'notes': NOTES.get(aid, ''),
            },
        }
    else:
        e['backgroundRemoval'] = {'required': False, 'status': 'not_needed', 'reason': 'scene background / full-bleed texture'}
        if aid in NOTES:
            e['notes'] = NOTES[aid]
    e['runtimePaths'] = [f'public/assets/{r}' for r in RUNTIME[aid]]
    if aid.startswith('tool-'):
        t = aid[5:]
        e['workingPointNormalized'] = meta['tools'][t]['workingPoint']
        e['runtimeSize'] = meta['tools'][t]['size']
    if aid.startswith('ball-'):
        e['registration'] = meta['registration'][aid[5:]]
    e['exportCommand'] = 'python scripts/prepare_assets.py'
    e['review'] = {'accepted': None, 'notes': 'AI review PASS (style vs references, alpha, margins, no cropping, working point, game-size preview). Awaiting game designer acceptance at CP2.'}
    assets.append(e)

out = {
    'updated': '2026-10-04',
    'level': 'soccer-ball',
    'credits': {'before': 1203, 'after': 1106, 'generations': 22, 'backgroundRemovals': 19, 'note': 'Nano Banana 2 at 2k = 2 credits per image (preflight)',
                'step3Revision': {'balanceBefore': 987, 'generations': 2, 'creditsSpent': 4, 'note': 'Two portrait background candidates (preflight 2 credits each).'}},
    'assets': assets,
    'codeDrawn': [
        {'id': 'brush-soft', 'purpose': 'erase brush mask (technical)'},
        {'id': 'fx-dot', 'purpose': 'soft dust / foam particle'},
        {'id': 'fx-rect', 'purpose': 'confetti strip'},
        {'id': 'selected-tile-frame', 'purpose': 'green frame of the current tool tile'},
        {'id': 'jet-stream', 'purpose': 'foam / water jet line'},
        {'id': 'contact-shadow', 'purpose': 'soft ellipse under the ball'},
        {'id': 'coming-soon-slots', 'purpose': 'empty menu slots (no content yet)'},
        {'id': 'loading-bar', 'purpose': 'boot loading bar before assets exist'},
    ],
}
(ROOT / 'project/asset-manifest.json').write_text(json.dumps(out, indent=2), encoding='utf-8')
print(len(assets), 'assets written to project/asset-manifest.json')
