# -*- coding: utf-8 -*-
import io, sys, urllib.request, hashlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

live = urllib.request.urlopen('https://muzhexuetang.xyz/', timeout=30).read().decode('utf-8')
local = io.open(r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\public\home.html', encoding='utf-8').read()
m1 = hashlib.md5(live.encode()).hexdigest()
m2 = hashlib.md5(local.encode()).hexdigest()
print('线上与本地MD5一致:', m1 == m2)
print('线上MD5:', m1)
print('本地MD5:', m2)
print('---')
checks = [
    'id="phPauseBtn"', 'id="pauseBtn"', 'document.createElement("button")',
    'aria-selected', '--primary-deep:#C2541F', '--ink-faint:#6B5F52',
    'text-wrap:balance', '--radius-lg:24px', '在读硕士授课', '查看第1张',
    '--gain-g:#1E7A33', '.ph-pause-btn', 'pauseBtn.addEventListener'
]
for k in checks:
    print(('OK  ' if k in live else 'MISS'), k, 'x', live.count(k))
