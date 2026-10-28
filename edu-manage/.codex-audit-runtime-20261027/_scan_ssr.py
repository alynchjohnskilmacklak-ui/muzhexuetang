# -*- coding: utf-8 -*-
import io, re, glob, sys

root = sys.argv[1] if len(sys.argv) > 1 else 'src/app/parent'
files = sorted(glob.glob(root + '/**/page.tsx', recursive=True))
for f in files:
    try:
        t = io.open(f, encoding='utf-8', newline='').read()
    except Exception:
        continue
    rel = f.replace('\\', '/')
    imports = re.findall(r'import\s+.*?\n', t)
    funcs = re.findall(r'(?:export default async function|export default function)\s+(\w+)', t)
    libs = re.findall(r'from\s+["\'](@/lib/[^"\']+)["\']', t)
    if funcs or libs:
        print(rel, '|', funcs, '|', list(set(libs))[:6])
