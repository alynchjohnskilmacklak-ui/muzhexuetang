# -*- coding: utf-8 -*-
import io
path = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent\archive\client.tsx'
t = io.open(path, encoding='utf-8', newline='').read()
old = "formatter: function (p: any) { return p.value ? String(p.value[1]) + '%' : '' }, labelLayout: { hideOverlap: true }"
new = "formatter: '{c}%', labelLayout: { hideOverlap: true }"
print('found', old in t)
t = t.replace(old, new, 1)
io.open(path, 'w', encoding='utf-8', newline='').write(t)
print('formatter patched')
