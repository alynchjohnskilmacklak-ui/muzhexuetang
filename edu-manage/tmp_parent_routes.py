# -*- coding: utf-8 -*-
import io, os

root = 'src/app/parent'
for dp, _, fs in os.walk(root):
    if 'page.tsx' not in fs:
        continue
    rel = os.path.relpath(dp, root).replace(os.sep, '/')
    url = '/parent/' + rel if rel != '.' else '/parent'
    p = os.path.join(dp, 'page.tsx')
    try:
        t = io.open(p, encoding='utf-8', errors='ignore').read()
        import re
        m = re.search(r'<Title[^>]*>([^<]{2,28})</Title>', t) or re.search(r'title\s*[:=]\s*["\']([^"\']{2,28})["\']', t)
        title = m.group(1).strip() if m else ''
    except Exception:
        title = ''
    print('%-32s len=%-6s %s' % (url, len(t), title))
