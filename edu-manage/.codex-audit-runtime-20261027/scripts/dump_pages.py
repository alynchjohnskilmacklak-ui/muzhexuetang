# -*- coding: utf-8 -*-
import pymupdf

base = r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs'
checks = [
    (base + r'\第十七章 特殊三角形单元重点综合测试（教师版）.pdf', 8, 'tri17 p8'),
    (base + r'\第十七章 特殊三角形单元重点综合测试（教师版）.pdf', 9, 'tri17 p9'),
    (base + r'\第十七章 特殊三角形单元重点综合测试（教师版）.pdf', 11, 'tri17 p11'),
    (base + r'\第二十章 函数（单元重点综合测试）（教师版）.pdf', 15, 'func20 p15'),
]
for pdf, pno, label in checks:
    doc = pymupdf.open(pdf)
    page = doc[pno - 1]
    txt = page.get_text('text')[:150].replace('\n', ' | ')
    print(f'===== {label} =====\n{txt}\n')
    doc.close()
