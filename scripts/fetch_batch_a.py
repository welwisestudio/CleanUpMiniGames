"""Batch A (levels 6–15): download finished Higgsfield results into reference/.

Usage: python scripts/fetch_batch_a.py <kind> <key>=<url> [...]
  kind = masters | cutouts
  key  = <group>/<name> (e.g. rain-boots/clean) → reference/<kind>/<group>/<name>.png
Also records the result URL in reference/batch-a/ledger.json (urls / cutoutUrls).
"""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEDGER = ROOT / 'reference/batch-a/ledger.json'


def main():
    kind = sys.argv[1]
    led = json.loads(LEDGER.read_text(encoding='utf-8'))
    bucket = led.setdefault('urls' if kind == 'masters' else 'cutoutUrls', {})
    for arg in sys.argv[2:]:
        key, url = arg.split('=', 1)
        out = ROOT / 'reference' / kind / f'{key}.png'
        out.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=120) as r:
            out.write_bytes(r.read())
        bucket[key] = url
        print('saved', out.relative_to(ROOT), out.stat().st_size)
    LEDGER.write_text(json.dumps(led, indent=1, ensure_ascii=False), encoding='utf-8')


if __name__ == '__main__':
    main()
