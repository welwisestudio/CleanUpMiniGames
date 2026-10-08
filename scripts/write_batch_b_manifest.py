"""Adds the Step 8 Batch B records (levels 16–50, background families PLAZA / GARAGE / VIP / SHORE,
new tools, cosmetic skins) to project/asset-manifest.json → `batchB`.

Sources: reference/batch-b/jobs.txt (ledger: kind, key, job id, written while generating),
reference/batch-b/{subjects,edits,tools,skins}.py (the exact prompts), reference/masters/** and
reference/cutouts/** (files, hashed here).
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BB = ROOT / 'reference/batch-b'
MAN = ROOT / 'project/asset-manifest.json'
sys.path.insert(0, str(BB))
import subjects  # noqa: E402
import edits  # noqa: E402
import tools  # noqa: E402
import skins  # noqa: E402

BG_PROMPT = ("Premium mobile game gameplay background, portrait 9:16, for a casual cleaning game. Match the attached reference background's rendering quality and mood exactly "
             "(semi-realistic polished 3D render, soft depth of field, calm, a brighter clean central area for the game object, slightly darker top band behind the HUD) but show a different place: {P}")
BG = {
    'bg-plaza': "a sunny old town plaza: softly blurred warm cream and terracotta building facades with arched windows and green shutters and a few potted plants in the upper part, a bright sky at the very top, and light gray cobblestone paving in the lower half seen in perspective, warm afternoon light. Empty plaza, no people, no cars, no text, no signs, no logos, no UI.",
    'bg-garage': "a clean bright restoration garage: a softly blurred light gray wall with a closed white roll-up door, a red tool cabinet and a coiled hose far in the background in the upper part, and a smooth glossy light gray epoxy floor in the lower half seen in perspective, bright overhead light. Empty floor, no vehicles, no people, no text, no logos, no UI.",
    'bg-vip': "an elegant palace hall: softly blurred royal blue walls with gold-trimmed panels, tall arched windows with cream curtains and a warm glow in the upper part, and a polished cream and white marble floor in the lower half seen in perspective, soft golden light. Empty hall, no furniture in the foreground, no people, no text, no logos, no UI.",
    'bg-shore': "a sunny lakeside shore: a bright blue sky and a calm turquoise lake with softly blurred green hills and a small wooden pier far away in the upper part, and smooth light sand with a few pebbles in the lower half seen in perspective, bright summer light. Empty beach, no boats, no people, no text, no logos, no UI.",
}


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None


def master_prompt(level):
    aspect, s = subjects.SUBJECTS[level]
    return subjects.MASTER.format(S=s), aspect


def main():
    lines = [ln.split() for ln in (BB / 'jobs.txt').read_text(encoding='utf-8').splitlines() if ln.strip()]
    masters = {k: j for kind, k, j in lines if kind == 'master'}
    removals = {k: j for kind, k, j in lines if kind == 'removal'}
    entries = []
    common = {'provider': 'Higgsfield MCP (https://mcp.higgsfield.ai/mcp)', 'higgsfieldProjectFolder': '21f4df55-05f7-4bef-a8c3-a68d58b70adb',
              'requestedModel': 'nano_banana_2', 'actualModel': 'nano_banana_flash (service id reported for nano_banana_2 jobs)', 'parameters': {'resolution': 'standard (1k), not 2K'}}
    for kind, key, job in lines:
        if kind == 'removal':
            continue
        e = {'id': key, 'kind': kind, 'jobId': job, **common}
        if kind == 'master':
            e['prompt'], aspect = master_prompt(key)
            e['parameters'] = {**common['parameters'], 'aspect_ratio': aspect}
            e['file'] = f'reference/masters/{key}/clean.png'
            e['backgroundRemoval'] = {'operation': 'Higgsfield Background Remover (remove_background)', 'jobId': removals.get(key), 'file': f'reference/cutouts/{key}/clean.png'}
            if key == 'stone-patio':
                e['backgroundRemoval']['note'] = 'remover kept only the bistro set; slab outline added as a geometric polygon crop (DECISIONS 2026-10-08)'
        elif kind == 'edit':
            lv, st = key.split('/')
            noun, states = edits.EDITS[lv]
            e['prompt'] = edits.EDIT.format(N=noun, C=states[st])
            e['referenceJobs'] = [masters[lv]]
            e['parameters'] = {**common['parameters'], 'aspect_ratio': 'auto (same as the master)'}
            e['file'] = f'reference/masters/{key}.png'
            e['alpha'] = 'master cutout alpha (pixel-aligned edit, no own removal)'
        elif kind == 'tool':
            e['prompt'] = tools.prompt(key)
            e['parameters'] = {**common['parameters'], 'aspect_ratio': '9:16'}
            e['file'] = f'reference/masters/{key}.png'
            e['backgroundRemoval'] = {'operation': 'Higgsfield Background Remover (remove_background)', 'jobId': removals.get(key), 'file': f'reference/cutouts/{key}.png'}
        elif kind in ('skin', 'skinfailed'):
            sid = key.split('skin-')[1]
            base, noun, change = skins.SKINS[sid]
            e['prompt'] = skins.SKIN.format(N=noun, C=change)
            e['referenceJobs'] = [masters.get('shared/tool-laser') if base == 'LASER' else base]
            if base == 'LASER':
                e['referenceJobs'] = [j for k, kk, j in lines if k == 'tool' and kk == 'shared/tool-laser']
            e['parameters'] = {**common['parameters'], 'aspect_ratio': 'auto'}
            e['file'] = f'reference/masters/{key}.png'
            e['alpha'] = 'base tool cutout alpha + the base crop (same working point)'
            if kind == 'skinfailed':
                e['status'] = 'failed at the service (no image); resubmitted'
        elif kind == 'bg':
            name = key.split('/')[1]
            e['prompt'] = BG_PROMPT.format(P=BG[name])
            e['referenceJobs'] = ['758073a2-92d8-41f6-aad1-2fc4daedfb41']
            e['parameters'] = {**common['parameters'], 'aspect_ratio': '9:16'}
            e['file'] = f'reference/masters/{key}.png'
        e.setdefault('status', 'approved for use (AI review on contact sheets)')
        e['sha256'] = sha(ROOT / e['file']) if 'file' in e else None
        entries.append(e)
    ok = [e for e in entries if e['kind'] != 'skinfailed']
    summary = {
        'nb2ImagesGenerated': len(ok),
        'byKind': {k: sum(1 for e in ok if e['kind'] == k) for k in ('master', 'edit', 'tool', 'skin', 'bg')},
        'failedJobs': sum(1 for e in entries if e['kind'] == 'skinfailed'),
        'backgroundRemovals': len(removals),
        'resolution2kUsed': 0,
        'creditsEstimate': {'nb2': f'{len(ok)} × 1.5 = {len(ok) * 1.5}', 'removals': f'{len(removals)} × 1 = {len(removals)}'},
    }
    man = json.loads(MAN.read_text(encoding='utf-8'))
    man['batchB'] = {'updated': '2026-10-08', 'reason': 'Step 8: levels 16–50, background families, new tools, cosmetic skins', 'summary': summary, 'assets': entries,
                     'derived': 'scripts/prepare_batch_b.py (+ batch_b_core.py): registration with the master alpha, procedural dust / wet / dull / grime layers, regions, thumbnails 320 px, result pictures, skins with the base crop'}
    MAN.write_text(json.dumps(man, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(summary, indent=1))


if __name__ == '__main__':
    main()
