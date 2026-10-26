# -*- coding: utf-8 -*-
import io, os, re

def read(p):
    try:
        return io.open(p, encoding='utf-8', errors='ignore').read()
    except Exception:
        return ''

def extract_title(t):
    # try Title/h1/strong text patterns
    m = re.search(r'<Title[^>]*>([^<]{2,30})</Title>', t)
    if m: return m.group(1).strip()
    m = re.search(r'<h1[^>]*>([^<]{2,30})</h1>', t)
    if m: return m.group(1).strip()
    m = re.search(r'title\s*[:=]\s*["\']([^"\']{2,30})["\']', t)
    if m: return m.group(1).strip()
    m = re.search(r'heading\s*[:=]\s*["\']([^"\']{2,30})["\']', t)
    if m: return m.group(1).strip()
    m = re.search(r'placeholder\s*[:=]\s*["\']([^"\']{2,40})["\']', t)
    if m: return 'PH:' + m.group(1).strip()
    return ''

def extract_apis(t):
    return sorted(set(re.findall(r'["\'](/api/[a-z0-9/_-]+)["\']', t)))

def extract_components(t):
    comps = set()
    for m in re.finditer(r'import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+[\'"][^\'"]*/(?:components|ui|widgets)[^\'"]*[\'"]', t):
        for name in m.group(1).split(','):
            name = name.strip()
            if name and name[0].isupper():
                comps.add(name)
    return sorted(comps)

pages = []
roots = [
    ('teacher', 'src/app/teacher'),
    ('admin', 'src/app/(main)'),
]
for label, root in roots:
    if not os.path.isdir(root):
        continue
    for dp, _, fs in os.walk(root):
        if 'page.tsx' not in fs:
            continue
        rel = os.path.relpath(dp, root).replace(os.sep, '/')
        url = ('/teacher/' + rel) if label == 'teacher' else ('/' + rel if rel != '.' else '/')
        t = read(os.path.join(dp, 'page.tsx'))
        pages.append({
            'url': url,
            'title': extract_title(t),
            'len': len(t),
            'apis': extract_apis(t),
        })

for p in sorted(pages, key=lambda x: x['url']):
    apis = ', '.join(p['apis'][:4])
    print('%-28s len=%-6s | %s | %s' % (p['url'], p['len'], p['title'][:24] or 'NO-TITLE', apis[:90]))
