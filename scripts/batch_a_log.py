"""Batch A generation log: appends prompt / job / reference / status records to
reference/batch-a/prompts.json (source for project/asset-manifest.json → batchA).

Usage: python scripts/batch_a_log.py <records.json>   (a JSON list of records)
Record: {key, job, ref?, aspect, prompt, status?, note?}
A record whose key already exists is replaced only if its job differs (re-generation keeps the
old one, renamed <key>@rejected-<n>).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
P = ROOT / 'reference/batch-a/prompts.json'


def main():
    recs = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    data = json.loads(P.read_text(encoding='utf-8')) if P.exists() else {}
    for r in recs:
        k = r['key']
        old = data.get(k)
        if old and old['job'] != r['job']:
            n = sum(1 for x in data if x.startswith(f'{k}@rejected')) + 1
            old['status'] = 'rejected'
            data[f'{k}@rejected-{n}'] = old
        r.setdefault('status', 'completed')
        data[k] = r
    P.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding='utf-8')
    print(len(data), 'records')


if __name__ == '__main__':
    main()
