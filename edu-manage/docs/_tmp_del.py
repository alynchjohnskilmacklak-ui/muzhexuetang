# -*- coding: utf-8 -*-
import io

p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent\archive\client.tsx'
t = io.open(p, encoding='utf-8-sig').read()

materials_block_start = '          {/* ============ 资料文件 Tab ============ */}'
idx = t.find(materials_block_start)
assert idx > 0, 'materials block start not found'

# 找到该块对应的 </> 前结束位置：跳过 idx 后第一个 '        </>'
tail = '        </>'
tid = t.find(tail, idx)
assert tid > idx, 'closing marker not found'

# 删除 materials 块（从注释到 </> 之前），保留 </> 及之后
t = t[:idx] + t[tid:]

io.open(p, 'w', encoding='utf-8-sig').write(t)
print('deleted materials block, new tail around idx:', idx)
