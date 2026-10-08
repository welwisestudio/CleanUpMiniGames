import json, sys
r = json.load(open('edits.json', encoding='utf-8'))
start = int(sys.argv[1])
with open('jobs.txt', 'a', encoding='utf-8') as f:
    for i, job in enumerate(sys.argv[2:]):
        f.write(f"edit {r[start + i]['key']} {job}\n")
print('ok')
