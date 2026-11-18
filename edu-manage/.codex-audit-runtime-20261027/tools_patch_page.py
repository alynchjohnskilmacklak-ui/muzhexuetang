# -*- coding: utf-8 -*-
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent\archive\page.tsx'
t = open(p, encoding='utf-8', newline='').read()

old = "const initial: { children: typeof children; activeStudentId: string | null; profile: StudentProfile | null } = {"
new = "const initial: { children: typeof children; activeStudentId: string | null; profile: StudentProfile | null; parentId: string } = {"
assert old in t, 'type line not found'
t = t.replace(old, new)

old2 = "    profile: null,\n  }"
new2 = "    profile: null,\n    parentId: userId,\n  }"
assert old2 in t, 'profile line not found'
t = t.replace(old2, new2)

open(p, 'w', encoding='utf-8', newline='').write(t)
print('patched ok')
print(t[t.find('const initial'):t.find('const initial')+230])
