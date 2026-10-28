# -*- coding: utf-8 -*-
import os, shutil, glob

def rm_tree(p):
    try:
        if os.path.isdir(p) and not os.path.islink(p):
            shutil.rmtree(p, ignore_errors=True)
            return True
    except Exception:
        pass
    return False

def rm_files(p):
    try:
        if os.path.isfile(p):
            os.remove(p)
            return True
    except Exception:
        pass
    return False

freed = 0
def size(p):
    try:
        return os.path.getsize(p)
    except Exception:
        return 0

# 1. user TEMP
t = os.environ.get('TEMP', r'C:\Users\Administrator\AppData\Local\Temp')
cnt = 0
for root, dirs, files in os.walk(t):
    for f in files:
        p = os.path.join(root, f)
        sz = size(p)
        try:
            os.remove(p); freed += sz; cnt += 1
        except Exception:
            pass
    for d in dirs:
        p = os.path.join(root, d)
        try:
            shutil.rmtree(p, ignore_errors=True)
        except Exception:
            pass
print('TEMP cleaned, files:', cnt)

# 2. Docker Desktop run-* backup dirs
local = r'C:\Users\Administrator\AppData\Local'
for d in glob.glob(os.path.join(local, 'run*')):
    # skip active docker run dir? none named exactly 'run' with active docker
    if os.path.basename(d) == 'run':
        continue
    if rm_tree(d):
        print('removed', d)

# 3. Windows Temp
wt = r'C:\Windows\Temp'
for root, dirs, files in os.walk(wt):
    for f in files:
        p = os.path.join(root, f)
        try:
            os.remove(p)
        except Exception:
            pass
    for d in dirs:
        shutil.rmtree(os.path.join(root, d), ignore_errors=True)
print('Windows Temp cleaned')

import ctypes
free = ctypes.c_ulonglong(0)
total = ctypes.c_ulonglong(0)
ctypes.windll.kernel32.GetDiskFreeSpaceExW('C:\\', ctypes.byref(free), ctypes.byref(total), None)
print('C free now: %.2f GB' % (free.value / 1024**3))
