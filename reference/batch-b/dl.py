"""Download Higgsfield results by URL; the job id in the file name is mapped to its key through
jobs.txt (master <level> -> masters/<level>/clean.png, edit <level/state> -> masters/<level/state>.png,
removal <level> -> cutouts/<level>/clean.png, tool/skin keys likewise)."""
import re, sys, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
jobs = {}
for line in (Path(__file__).parent / 'jobs.txt').read_text(encoding='utf-8').splitlines():
    kind, key, job = line.split()
    jobs[job] = (kind, key)
for url in sys.argv[1:]:
    job = re.search(r'([0-9a-f-]{36})\.png$', url).group(1)
    kind, key = jobs[job]
    if kind == 'master':
        out = ROOT / 'reference/masters' / key / 'clean.png'
    elif kind == 'removal':
        out = ROOT / 'reference/cutouts' / key / ('clean.png' if '/' not in key else '')
        if '/' in key:
            out = ROOT / 'reference/cutouts' / f'{key}.png'
    else:
        out = ROOT / 'reference/masters' / f'{key}.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=120) as r:
        out.write_bytes(r.read())
    print(kind, key, out.stat().st_size)
