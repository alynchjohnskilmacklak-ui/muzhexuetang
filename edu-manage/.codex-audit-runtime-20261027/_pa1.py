import io, re

# ---------- 1. student-profile.ts ----------
p = 'src/lib/student-profile.ts'
s = io.open(p, encoding='utf-8').read()

# a) select 加 knowledgeCard
old = 'select: { id: true, mood: true, tags: true, lessonContent: true, knowledgePoints: true, summary: true, overallComment: true,'
assert old in s, 'select not found'
s = s.replace(old, 'select: { id: true, mood: true, tags: true, lessonContent: true, knowledgePoints: true, knowledgeCard: true, summary: true, overallComment: true,')

# b) TLItem detail 类型加 knowledgeCard
m = re.search(r"type TLItem = \{[^}]*?detail\?: \{[^}]*?\}\s*\}", s)
assert m, 'TLItem not found'
tl = m.group(0)
if 'knowledgeCard' not in tl:
    new_tl = tl.replace('summary?: string;', 'summary?: string; knowledgeCard?: string | null;')
    if new_tl == tl:
        # fallback: 插到 homework 前
        new_tl = tl.replace('homework?: string[];', 'knowledgeCard?: string | null; homework?: string[];')
    assert new_tl != tl, 'TLItem insert failed'
    s = s.replace(tl, new_tl)

# c) 构建 detail 时带上 knowledgeCard（找 feedback detail 组装处）
m2 = re.search(r"knowledgePoints: f\.knowledgePoints[^\n]*", s)
assert m2, 'build line not found'
s = s.replace(m2.group(0), m2.group(0) + '\n          knowledgeCard: f.knowledgeCard || null,')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('profile patched')
