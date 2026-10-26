# -*- coding: utf-8 -*-
import io, re, json
t = io.open('package.json', encoding='utf-8').read()
data = json.loads(t)
deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
for kw in ['zod', 'pdfjs-dist', 'pdfjs', 'sharp', 'mammoth', 'exceljs', 'jszip', 'react-pdf']:
    for k, v in deps.items():
        if kw in k:
            print(k, v)
print('--- all deps with pdf/zod ---')
for k, v in deps.items():
    if 'pdf' in k.lower() or 'zod' in k.lower():
        print(k, v)
