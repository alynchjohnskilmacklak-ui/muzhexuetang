# -*- coding: utf-8 -*-
import io
t = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent\archive\client.tsx', encoding='utf-8', newline='').read()
for i, l in enumerate(t.split('\n')):
    if '/parent/students/' in l or 'growth-report' in l:
        print(i + 1, l[:150])
