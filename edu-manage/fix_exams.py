# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html'
c = open(p, encoding='utf-8').read()

# 1. EXAMS 扩充多年度
old_e = 'const EXAMS=["2026 中考","2026 上学期期末","2026 地生会考","2026 高考"];'
new_e = 'const EXAMS=["2025 中考","2026 中考","2024 高考","2025 高考","2026 高考","2026 上学期期末","2026 地生会考"];'
assert old_e in c, 'EXAMS not found'
c = c.replace(old_e, new_e)

# 2. 小班考试类型（全科四科）：中考800 / 高考750 / 期末600，不含地生
old_sm = 'const exam=(type==="小班"?["2026 中考","2026 高考","2026 上学期期末"]:EXAMS)[Math.floor(Math.random()*(type==="小班"?3:EXAMS.length))];'
new_sm = 'const exam=(type==="小班"?["2025 中考","2026 中考","2024 高考","2025 高考","2026 高考","2026 上学期期末"]:EXAMS)[Math.floor(Math.random()*(type==="小班"?6:EXAMS.length))];'
assert old_sm in c, 'small exam not found'
c = c.replace(old_sm, new_sm)

open(p, 'w', encoding='utf-8').write(c)
print('完成')
