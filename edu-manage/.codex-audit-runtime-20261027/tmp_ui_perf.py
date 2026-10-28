# -*- coding: utf-8 -*-
import io, os, re

# ---- UI/mobile pattern scan ----
ui_issues = []
for root in ['src/app/(main)', 'src/app/teacher', 'src/app/parent']:
    for dp, _, fs in os.walk(root):
        for f in fs:
            if not f.endswith(('.tsx', '.ts')):
                continue
            p = os.path.join(dp, f)
            t = io.open(p, encoding='utf-8', errors='ignore').read()
            if len(t) < 300:
                continue
            rel = p.replace('src/', '')
            # fixed pixel widths > 380
            for m in re.finditer(r"""width\s*[:=]\s*(?:['"]|")?(\d{4,5})(?:px|['"]|")?""", t):
                w = int(m.group(1))
                if w > 380 and w < 2000:
                    ui_issues.append((rel, 'fixed width %d' % w, t[max(0, m.start() - 60):m.start() + 60].replace('\n', ' ')))
                    break
            # antd Table without scroll x
            if re.search(r'<Table\b', t) and not re.search(r'<Table\b[^>]{0,200}scroll', t):
                # check if scroll defined later
                if 'scroll={{' not in t:
                    ui_issues.append((rel, 'Table without scroll', ''))
            # Modal fixed width
            for m in re.finditer(r'<Modal\b[^>]*width\s*=\s*\{(\d{3,4})\}', t):
                w = int(m.group(1))
                if w > 480:
                    ui_issues.append((rel, 'Modal width %d' % w, ''))
print('--- UI scan issues ---')
seen = set()
for rel, kind, ctx in ui_issues:
    if (rel, kind) in seen:
        continue
    seen.add((rel, kind))
    print('%-44s | %s' % (rel, kind))

# ---- performance scan ----
print()
print('--- Big files (>60KB) ---')
for root in ['src/app/(main)', 'src/app/teacher', 'src/app/parent', 'src/components']:
    for dp, _, fs in os.walk(root):
        for f in fs:
            if not f.endswith(('.tsx', '.ts')):
                continue
            p = os.path.join(dp, f)
            try:
                sz = os.path.getsize(p)
            except Exception:
                continue
            if sz > 60_000:
                print('%-44s %7.1f KB' % (p.replace('src/', ''), sz / 1024))

print()
print('--- High-frequency SWR refresh ---')
for root in ['src/app/(main)', 'src/app/teacher', 'src/app/parent', 'src/components']:
    for dp, _, fs in os.walk(root):
        for f in fs:
            if not f.endswith(('.tsx', '.ts')):
                continue
            p = os.path.join(dp, f)
            t = io.open(p, encoding='utf-8', errors='ignore').read()
            for m in re.finditer(r'refreshInterval\s*:\s*(\d{1,5})', t):
                v = int(m.group(1))
                if 0 < v < 5000:
                    print('%-44s refreshInterval=%d' % (p.replace('src/', ''), v))
