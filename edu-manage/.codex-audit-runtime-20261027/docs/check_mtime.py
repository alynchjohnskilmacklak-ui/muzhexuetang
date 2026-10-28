# -*- coding: utf-8 -*-
import io, sys, os, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
base = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage'
files = [
    r'src\components\Common\PdfCanvasViewer.tsx',
    r'src\components\Parent\HoursLeaderboard.tsx',
    r'src\app\parent\archive\client.tsx',
    r'src\components\Parent\ParentLessonPreview.tsx',
    r'src\components\Parent\ParentLessonPreviewHistory.tsx',
]
for f in files:
    p = os.path.join(base, f)
    st = os.stat(p)
    print(datetime.datetime.fromtimestamp(st.st_mtime).strftime('%m-%d %H:%M:%S'), ' ', f)
print()
print('镜像构建时间: 15:16 (tar) / 15:31 (tar.gz)')
