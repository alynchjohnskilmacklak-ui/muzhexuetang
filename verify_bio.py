# -*- coding: utf-8 -*-
import re, collections
p = r"D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\data\practice-sets\biology-questions.ts"
s = open(p, encoding="utf-8").read()
blocks = re.split(r"\n  \{\n", s)
bad = []
secs = 0
for b in blocks:
    m = re.match(r"    id: '(biology-[^']+)'", b)
    if not m:
        continue
    secs += 1
    e = b.count("'EASY'"); md = b.count("'MEDIUM'"); ex = b.count("'EXAM'")
    if not (e == 3 and md == 4 and ex == 3):
        bad.append((m.group(1), e, md, ex))
print("total sections:", secs)
print("bad sections (id, E,M,X):", bad)
ids = re.findall(r"id: '(biology-[^']+)'", s)
print("total id lines:", len(ids), "unique:", len(set(ids)))
c = collections.Counter()
for sid in re.findall(r"    id: '(biology-\d[a-b]-\d+-\d+)'", s):
    c[sid.split("-")[1]] += 1
print("sections per book:", dict(c))
# encoding sanity: read back and check Chinese
print("encoding ok, contains chinese 生物:", "生物" in s, "| 文件大小 bytes:", len(s.encode("utf-8")))
