"""Adds the Step 6 assets (re-drawn tools, material foams) to project/asset-manifest.json."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
P = {
    'shared/tool-mist-nozzle': ('56218069-81e2-48d6-bb1f-bd60f4b0858c', 'c1238a2e-9675-4975-a0b5-f96a044dbb8d', '9:16', "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one garden water mist spray wand standing perfectly vertical and perfectly straight: a small round red mist nozzle head at the very top whose spray opening points STRAIGHT UP toward the top edge of the image (the nozzle face is seen from the side, aligned with the wand axis, not angled), a straight black wand below it, and a black and red pistol trigger grip at the bottom. Straight side view, centered, the whole tool aligned on one vertical line. The entire tool fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No water, no text, no logos, no hands, no hose, no extra objects."),
    'shared/tool-foam-can': ('6506e4e2-903f-4af9-bbf1-64f706b05915', '756f84fe-18af-41f5-af3f-52e474914e45', '9:16', "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one bright yellow aerosol foam spray can standing perfectly vertical, seen from the side, with a white spray actuator cap on top and a thin white spray straw nozzle sticking STRAIGHT UP from the cap, so the spray opening is at the very top of the image and points straight up toward the top edge. Glossy cylindrical yellow metal can with no label text. Straight side view, centered. The entire can fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No foam, no text, no letters, no logos, no hands, no extra objects."),
    'shared/tool-drill-brush': ('c44e45c5-c54b-43b2-bf8b-be12ceae9a57', '31493798-c39c-44de-974b-dbdca66d2125', '9:16', "Create a production 2D game sprite for a casual cleaning mobile game. Subject: one lime-green and black cordless power drill held vertically, seen exactly from the side, with a round green scrubbing brush attachment at the very top whose stiff bristles point STRAIGHT UP toward the top edge of the image (the brush is seen from the side as a short wide cylinder of bristles on top, bristle tips at the top), the drill body below and the battery pack at the bottom. Straight side view, centered, all parts on one vertical line. The entire tool fits in the frame with 12% clear padding on every side, nothing cropped. Style: semi-realistic glossy premium casual mobile game 3D render, soft studio key light from the upper left, crisp specular highlights, no outlines. Background: plain uniform flat light gray background, no gradient, no cast shadow. No text, no logos, no hands, no extra objects."),
    'materials/foam-rug': ('fd18fe19-ca88-4986-9e9a-7d5de5792d38', None, '1:1', "Seamless tileable top-down game texture of soapy foam sitting on top of a shaggy carpet: clumps of white foam with small bubbles caught between soft long carpet fibers, a faint green-gray carpet tint showing between the foam clumps, matte and fluffy, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."),
    'materials/foam-metal': ('f858d6dc-1562-489b-b7bd-708946c060dc', None, '1:1', "Seamless tileable top-down game texture of thin glossy soap suds on polished gold metal: a light layer of small shiny transparent bubbles and wet foam streaks with warm golden reflections showing through the suds, sparkling specular highlights, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."),
    'materials/foam-leather': ('f323d2ad-a216-4e90-a7da-8a699d412714', None, '1:1', "Seamless tileable top-down game texture of thick creamy upholstery cleaning foam on fabric: dense smooth off-white creamy foam with very fine micro bubbles, soft rounded mounds, a slight warm beige tint, matte satin look, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."),
    'materials/foam-sneaker': ('ebed0d1a-6878-44b6-903f-2ce6eaf21d85', None, '1:1', "Seamless tileable top-down game texture of bright white shoe-cleaning lather on sneaker mesh fabric: dense fluffy pure white lather with medium bubbles and a faint cool-gray mesh weave pattern visible underneath, crisp clean look, filling the entire frame evenly from edge to edge. Flat even lighting, no vignette, no objects, no text. Semi-realistic glossy casual mobile game render."),
}


def sha(p):
    return hashlib.sha256((ROOT / p).read_bytes()).hexdigest()


out = []
for gid, (job, bg, ar, prompt) in P.items():
    e = {
        'id': gid, 'status': 'completed', 'prompt': prompt,
        'provider': 'Higgsfield MCP (https://mcp.higgsfield.ai/mcp)', 'higgsfieldProjectFolder': '21f4df55-05f7-4bef-a8c3-a68d58b70adb',
        'requestedModel': 'nano_banana_2', 'actualModel': 'nano_banana_flash (backend reported by the service for nano_banana_2 jobs)',
        'parameters': {'resolution': '2k', 'aspect_ratio': ar}, 'jobId': job, 'generatedAt': '2026-10-04',
        'masterPath': f'reference/masters/{gid}.png', 'masterSha256': sha(f'reference/masters/{gid}.png'),
        'exportCommand': 'python scripts/prepare_levels.py',
    }
    if bg:
        e['backgroundRemoval'] = {'toolName': 'remove_background', 'model': 'image_background_remover', 'status': 'completed', 'inputJobId': job, 'operationJobId': bg, 'cutoutPath': f'reference/cutouts/{gid}.png', 'outputSha256': sha(f'reference/cutouts/{gid}.png'), 'alphaReview': {'status': 'PASS'}}
    else:
        e['backgroundRemoval'] = {'status': 'not_needed', 'reason': 'full-bleed material texture, masked per object in prepare_levels.py'}
    out.append(e)

man = json.loads((ROOT / 'project/asset-manifest.json').read_text(encoding='utf-8'))
man['step6'] = {
    'updated': '2026-10-04',
    'reason': 'Step 6 bug review: tools re-drawn so the nozzle / brush head points at the object; material-specific foams',
    'replaces': {
        'shared/tool-mist-nozzle': 'reference/rejected/shared/tool-mist-nozzle-v1.png (nozzle head angled sideways)',
        'shared/tool-foam-can': 'reference/rejected/shared/tool-foam-can-v1.png (spray cap faced the viewer)',
        'shared/tool-drill-brush': 'reference/rejected/shared/tool-drill-brush-v1.png (brush disc faced the viewer)',
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
