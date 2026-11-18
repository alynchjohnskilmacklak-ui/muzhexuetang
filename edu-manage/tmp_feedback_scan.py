# -*- coding: utf-8 -*-
import io, os, re

def read(p):
    try:
        return io.open(p, encoding='utf-8', errors='ignore').read()
    except Exception:
        return ''

# focus files: admin student/family/schedule + teacher feedback + upload
files = []
for root in ['src/app/(main)', 'src/app/teacher', 'src/app/api/upload/route.ts', 'src/app/api/students/[id]/link-parent/route.ts', 'src/app/api/students/route.ts']:
    if os.path.isfile(root):
        files.append(root)
        continue
    for dp, _, fs in os.walk(root):
        if dp.count(os.sep) - root.count(os.sep) > 3:
            continue
        for f in fs:
            if f.endswith(('.tsx', '.ts')) and ('client' in f or f == 'page.tsx'):
                files.append(os.path.join(dp, f))

KEYWORDS = ['学生', '学员', '家长', '绑定', '上传', '提交', '保存', '创建', '新建', '请假', '补课', '取消', '排课', '发布', '导入', '发送', '解绑', '删除']
issues = []
for p in files:
    t = read(p)
    if len(t) < 200:
        continue
    # pattern: res.ok check missing after fetch POST
    for m in re.finditer(r'await\s+fetch\(([^)]{0,120})\)', t):
        pass
    # find fetch POST/PUT/DELETE calls and the following 3 lines
    for m in re.finditer(r"fetch\(\s*['\"]([^'\"]+)['\"]\s*,\s*\{[^}]{0,200}?method:\s*['\"](POST|PUT|DELETE)['\"]", t, re.S):
        url, method = m.group(1), m.group(2)
        seg = t[m.end():m.end() + 400]
        has_ok = 'res.ok' in seg or 'response.ok' in seg
        has_catch = '.catch(' in seg
        has_toast = 'toast' in seg or 'message.' in seg
        if not has_ok:
            issues.append((p, method, url[:60], 'NO res.ok check', seg[:160].replace('\n', ' ')))
print('total files:', len(files))
print('POST/PUT/DELETE without res.ok check:', len(issues))
seen = set()
for p, method, url, kind, ctx in issues[:40]:
    key = (p, url)
    if key in seen: continue
    seen.add(key)
    print('-' * 10)
    print('FILE:', p.replace('src/', ''))
    print('  %s %s | %s' % (method, url, kind))
    print('  ctx:', ctx)
