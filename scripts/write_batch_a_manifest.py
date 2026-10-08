"""Adds the Step 8 Batch A records (levels 6–15, background families, new tools and card
alternatives) to project/asset-manifest.json → `batchA`.

Sources: reference/batch-a/prompts.json (prompt / job / reference per generation, written while
generating), reference/batch-a/bgremoval.txt (Higgsfield Background Remover operation per cutout),
reference/masters/** and reference/cutouts/** (files, hashed here).
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BA = ROOT / 'reference/batch-a'
MAN = ROOT / 'project/asset-manifest.json'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None


def main():
    prompts = json.loads((BA / 'prompts.json').read_text(encoding='utf-8'))
    bg = {}
    for line in (BA / 'bgremoval.txt').read_text(encoding='utf-8').splitlines():
        if line.strip():
            k, job = line.split()
            bg[k] = job
    entries = []
    for key, r in sorted(prompts.items()):
        base = key.split('@')[0]
        group, name = base.split('/')
        # the boots' clean state was re-derived (clean-v2): its master file is clean-v2.png
        master = ROOT / 'reference/masters' / group / f'{name}.png'
        if r['status'] == 'rejected':
            cand = sorted((ROOT / 'reference/masters' / group).glob(f'{name}-rejected-*.png'))
            master = cand[0] if cand else master
        cut_key = 'rain-boots/clean' if base == 'rain-boots/clean-v2' else base
        cutout = ROOT / 'reference/cutouts' / group / f'{"clean" if base == "rain-boots/clean-v2" else name}.png'
        e = {
            'id': key,
            'status': r['status'],
            'prompt': r['prompt'],
            'referenceJobs': [r['ref']] if r.get('ref') else [],
            'provider': 'Higgsfield MCP (https://mcp.higgsfield.ai/mcp)',
            'higgsfieldProjectFolder': '21f4df55-05f7-4bef-a8c3-a68d58b70adb',
            'requestedModel': 'nano_banana_pro',
            'actualModel': 'reported by the service as nano_banana_2 for these nano_banana_pro jobs',
            'modelDecision': 'designer instruction 2026-10-08: "use nano banana pro" (DECISIONS)',
            'parameters': {'resolution': '2k', 'aspect_ratio': r['aspect']},
            'jobId': r['job'],
            'generatedAt': '2026-10-08',
            'masterPath': str(master.relative_to(ROOT)).replace('\\', '/'),
            'masterSha256': sha(master),
            'exportCommand': 'python scripts/prepare_batch_a.py',
        }
        if r.get('note'):
            e['note'] = r['note']
        if r['status'] == 'completed':
            if cut_key in bg or base in bg:
                e['backgroundRemoval'] = {
                    'toolName': 'remove_background', 'model': 'image_background_remover', 'status': 'completed',
                    'inputJobId': r['job'], 'operationJobId': bg.get(base) or bg.get(cut_key),
                    'cutoutPath': str(cutout.relative_to(ROOT)).replace('\\', '/'), 'outputSha256': sha(cutout),
                }
            elif group in ('backgrounds', 'materials'):
                e['backgroundRemoval'] = {'status': 'not_needed', 'reason': 'full-bleed background / material texture'}
            else:
                e['backgroundRemoval'] = {'status': 'not_used', 'reason': 'state not used at runtime'}
        entries.append(e)
    man = json.loads(MAN.read_text(encoding='utf-8'))
    gens = sum(1 for e in entries)
    rem = sum(1 for e in entries if e.get('backgroundRemoval', {}).get('status') == 'completed')
    man['batchA'] = {
        'updated': '2026-10-08',
        'reason': 'Step 8 Batch A: levels 6–15, shared background families (wash, studio, workshop, yard), Batch A tools and card alternatives',
        'credits': {'generations': gens, 'backgroundRemovals': rem, 'costPerGeneration': 2, 'note': 'see VALIDATION / STATUS for the balance before and after'},
        'export': 'python scripts/prepare_batch_a.py',
        'derived': 'procedural dust films (crate, toolbox, vase, fan guard) from the approved dust-wood material; region masks from state differences / colour; keycap cells from the clean vs removed-keycaps states; repair patches from the clean vase',
        'assets': entries,
    }
    MAN.write_text(json.dumps(man, indent=1, ensure_ascii=False), encoding='utf-8')
    print(gens, 'generations,', rem, 'background removals recorded')


if __name__ == '__main__':
    main()
