# -*- coding: utf-8 -*-
import io, re, glob, sys

root = sys.argv[1] if len(sys.argv) > 1 else 'src/app/parent'
files = sorted(glob.glob(root + '/**/*.tsx', recursive=True))
for f in files:
    try:
        t = io.open(f, encoding='utf-8', newline='').read()
    except Exception:
        continue
    apis = sorted(set(re.findall(r'["\'](/api/[a-zA-Z0-9/_{}\[\].-]+)["\']', t)))
    if apis:
        rel = f.replace('\\', '/')
        print(rel)
        for a in apis:
            print('   ', a)
