# -*- coding: utf-8 -*-
import io, re, glob, sys

root = sys.argv[1] if len(sys.argv) > 1 else 'src/app/parent'
files = sorted(glob.glob(root + '/**/*.tsx', recursive=True))
for f in files:
    if 'client.tsx' not in f and 'page.tsx' not in f:
        continue
    try:
        t = io.open(f, encoding='utf-8', newline='').read()
    except Exception as e:
        print(f, 'ERR', e)
        continue
    m = re.findall(r'(?:title|placeholder|label|text|header|subtitle|description)[=:]\s*["\']([^"\']{2,40})', t)
    print('==== ' + f)
    seen = set()
    for x in m:
        if x not in seen and not x.startswith('var') and not x.startswith('--') and not x.startswith('http'):
            seen.add(x)
            print('  ', x)
