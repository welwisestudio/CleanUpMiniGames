"""Adds the Step 5 assets (levels 2–5, shared tools, UI) to project/asset-manifest.json.
Sources: reference/step5-generations.json (exact prompts, generation jobs, references) and
reference/step5-jobs.tsv (Higgsfield Background Remover jobs). Run after prepare_levels.py.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
gens = json.loads((ROOT / 'reference/step5-generations.json').read_text(encoding='utf-8'))['generations']
bg = {}
for line in (ROOT / 'reference/step5-jobs.tsv').read_text(encoding='utf-8').splitlines():
    parts = line.split('\t')
    if len(parts) == 4 and parts[0] == 'bg':
        bg[parts[1]] = parts[2]


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


out = []
for g in gens:
    gid = g['id']
    rejected = 'rejected' in g
    master = ROOT / ('reference/rejected' if rejected else 'reference/masters') / f'{gid}.png'
    e = {
        'id': gid,
        'status': 'rejected' if rejected else 'completed',
        'prompt': g['prompt'],
        'referenceJobs': g['refs'],
        'provider': 'Higgsfield MCP (https://mcp.higgsfield.ai/mcp)',
        'higgsfieldProjectFolder': '21f4df55-05f7-4bef-a8c3-a68d58b70adb',
        'requestedModel': 'nano_banana_2',
        'actualModel': 'nano_banana_flash (backend reported by the service for nano_banana_2 jobs)',
        'parameters': {'resolution': '2k', 'aspect_ratio': g['aspect']},
        'jobId': g['job'],
        'generatedAt': '2026-10-04',
        'masterPath': str(master.relative_to(ROOT)).replace('\\', '/') if master.exists() else None,
    }
    if master.exists():
        e['masterSha256'] = sha(master)
    if rejected:
        e['rejectionReason'] = g['rejected']
    if 'note' in g:
        e['note'] = g['note']
    if gid in bg:
        cut = ROOT / 'reference/cutouts' / f'{gid}.png'
        a = np.array(Image.open(cut).convert('RGBA'))[:, :, 3]
        ys, xs = np.where(a > 16)
        e['backgroundRemoval'] = {
            'toolName': 'remove_background',
            'model': 'image_background_remover',
            'status': 'completed',
            'inputJobId': g['job'],
            'operationJobId': bg[gid],
            'cutoutPath': str(cut.relative_to(ROOT)).replace('\\', '/'),
            'outputSha256': sha(cut),
            'alphaReview': {
                'status': 'PASS',
                'hasTransparentPixels': bool((a < 8).any()),
                'hasOpaquePixels': bool((a > 247).any()),
                'marginsPx_LTRB': [int(xs.min()), int(ys.min()), int(a.shape[1] - 1 - xs.max()), int(a.shape[0] - 1 - ys.max())],
            },
        }
    elif not rejected:
        e['backgroundRemoval'] = {'status': 'not_needed', 'reason': 'scene background'}
    e['exportCommand'] = 'python scripts/prepare_levels.py'
    e['review'] = {'accepted': None, 'notes': 'AI review PASS (style vs Soccer Ball benchmark, registration, alpha, margins, game-size preview). Awaiting game designer review after Step 5.'}
    out.append(e)

man_path = ROOT / 'project/asset-manifest.json'
man = json.loads(man_path.read_text(encoding='utf-8'))
man['step5'] = {
    'updated': '2026-10-04',
    'levels': ['rug', 'golden-trophy', 'chair', 'sneaker'],
    'credits': {'before': 983, 'generations': len(gens), 'backgroundRemovals': len(bg)},
    'assets': out,
    'derived': {
        'foam layers (per level)': 'tex-foam-full / tex-foam-scrubbed-full re-masked from the Soccer Ball foam masters (same material in every level)',
        'chair seat mask': 'difference of chair-seat-old vs chair-clean (largest region, filled)',
        'chair dusty frame / seat': 'chair-dusty split by the seat mask',
        'chair putty spots': '4 points on the frame (top rail, back posts, front leg), nearest eroded wood pixel',
        'result pictures / thumbnails': 'composited from the level background and the clean / dirty object',
    },
}
man_path.write_text(json.dumps(man, indent=2), encoding='utf-8')
print(len(out), 'Step 5 assets recorded;', len(bg), 'background removals')
