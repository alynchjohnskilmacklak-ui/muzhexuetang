# -*- coding: utf-8 -*-
import io, os

def read(p):
    try:
        return io.open(p, encoding='utf-8', errors='ignore').read()
    except Exception:
        return ''

def dump_group(label, dirpath, maxfiles=3):
    print('=' * 70)
    print(label, '->', dirpath)
    fs = [f for f in os.listdir(dirpath) if f.endswith(('.tsx', '.ts'))]
    for f in sorted(fs)[:maxfiles]:
        t = read(os.path.join(dirpath, f))
        print('--- %s (len %s)' % (f, len(t)))
        # find api calls and key UI labels
        import re
        apis = sorted(set(re.findall(r'["\'](/api/[a-z0-9/_-]+)["\']', t)))
        if apis:
            print('  apis:', ', '.join(apis[:10]))
        # tabs / buttons / section words
        for m in re.finditer(r'(TabPane|steps|segmented|tab)\s*[\w=]*\s*[:{]', t[:20000]):
            pass
        # print first 80 lines of body after imports
        lines = t.split('\n')
        body = []
        for ln in lines:
            if ln.strip().startswith('import'): continue
            body.append(ln)
        print('  body head:', ' '.join(body)[:400])

dump_group('ADMIN performance', 'src/app/(main)/performance')
dump_group('ADMIN performance/[id]', 'src/app/(main)/performance/[id]')
dump_group('ADMIN classroom-feedback', 'src/app/(main)/classroom-feedback', 4)
dump_group('ADMIN parent-messages', 'src/app/(main)/parent-messages')
dump_group('ADMIN communications', 'src/app/(main)/communications')
