# -*- coding: utf-8 -*-
"""从PDF文本层提取题面（题号→下一题/答案区），构造完整题干+选项"""
import pymupdf, re, json

PDFS = {
    'geom7':  (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二章 几何图形的初步认识（单元重点综合测试）（教师版）.pdf', [12, 15]),
    'cong13': (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第十三章 全等三角形单元重点综合测试（教师版）.pdf', [13, 16]),
    'tri17':  (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第十七章 特殊三角形单元重点综合测试（教师版）.pdf', [14, 16]),
    'func20': (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二十章 函数（单元重点综合测试）（教师版）.pdf', [13, 15]),
    'trig26': (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二十六章 解直角三角形单元重点综合测试（教师版）.pdf', [4, 16]),
    'inv27':  (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二十七章 反比例函数单元重点综合测试（教师版）.pdf', [7, 15]),
}

def blocks(page):
    """返回按 y 排序的文本块(含行内文字与公式)"""
    # 用 words 重组：题号标记=行首带数字标点的 word
    ws = page.get_text('words')
    ws.sort(key=lambda w: (w[1], w[0]))
    return ws

def question_texts(pdf, nums):
    doc = pymupdf.open(pdf)
    found = {}
    for pno in range(doc.page_count):
        page = doc[pno]
        words = blocks(page)
        # 定位题号word
        idxs = []
        for i, w in enumerate(words):
            m = re.match(r'^(\d{1,2})[．.、]', w[4])
            if m and int(m.group(1)) in nums and w[0] < 120:
                idxs.append((i, int(m.group(1))))
        for j, (i, num) in enumerate(idxs):
            # 收集该题文本：从题号行起，直到下一个题号/【答案】/【详解】出现
            lines = []
            k = i
            end = words.__len__()
            for k in range(i, len(words)):
                w = words[k]
                t = w[4]
                if k > i and (re.match(r'^\d{1,2}[．.、]', t) and w[0] < 120):
                    break
                if t.startswith('【答案') or t.startswith('【详解') or t.startswith('【分析') or t.startswith('【知识点'):
                    break
                lines.append(t)
            if num in found:
                continue
            found[num] = ' '.join(lines)
        if len(found) == len(nums):
            break
    doc.close()
    return found

out = {}
for tag, (pdf, nums) in PDFS.items():
    out[tag] = question_texts(pdf, nums)

with open(r'C:\Users\Administrator\AppData\Local\Temp\mzx-qbank\pdf12.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

for tag, d in out.items():
    for n, t in d.items():
        print(f'\n===== {tag} #{n} =====\n{t[:400]}')
