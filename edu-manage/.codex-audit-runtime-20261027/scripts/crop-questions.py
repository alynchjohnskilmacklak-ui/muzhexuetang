# -*- coding: utf-8 -*-
"""从 PDF 按题号定位并裁剪"整题区域"（题干+公式+选项+几何图）为高清 PNG。
用法: python crop-questions.py <pdf> <json输出> --numbers 1,14,15 ...
输出目录: <pdf同名目录>/crops/
"""
import os, sys, json, re
import pymupdf

def find_question_marks(page, text):
    """返回该页所有题号词的位置 [(num, x0,y0,x1,y1)]，支持 '14．' '14.' '14、'"""
    marks = []
    words = page.get_text('words')  # (x0,y0,x1,y1,word,...)
    for w in words:
        m = re.match(r'^(\d{1,2})[．.、]?$', w[4]) or re.match(r'^(\d{1,2})[．.、]', w[4])
        if m and int(m.group(1)) >= 1:
            marks.append((int(m.group(1)), w[0], w[1], w[2], w[3]))
    # 合并同一行相邻词（题号与题干可能分开）
    marks.sort(key=lambda m: (m[2], m[1]))
    merged = []
    for m in marks:
        if merged and abs(merged[-1][2] - m[2]) < 5 and m[1] - merged[-1][3] < 30:
            merged[-1] = (m[0], merged[-1][1], merged[-1][2], max(merged[-1][3], m[3]), max(merged[-1][4], m[4]))
        else:
            merged.append(list(m))
    return merged

def main(pdf, numbers, out_json):
    doc = pymupdf.open(pdf)
    base = os.path.dirname(pdf)
    crop_dir = os.path.join(base, 'crops')
    os.makedirs(crop_dir, exist_ok=True)
    results = {}
    for pno in range(doc.page_count):
        page = doc[pno]
        marks = find_question_marks(page, page.get_text())
        page_h = page.rect.height
        page_w = page.rect.width
        for i, m in enumerate(marks):
            num = m[0]
            if num not in numbers:
                continue
            # 区域：题号行顶部 → 下一题号行顶部（或页底部）
            top = max(m[2] - 3, 0)
            nxt = marks[i + 1] if i + 1 < len(marks) else None
            bottom = (nxt[2] - 3 if nxt else page_h)
            # 限制区域内：若下一题在同一页顶部附近则可能跨页
            rect = pymupdf.Rect(30, top, page_w - 30, bottom)
            # 渲染 2x
            pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=rect)
            fn = f'crop-q{num}.png'
            pix.save(os.path.join(crop_dir, fn))
            results[num] = {'page': pno + 1, 'top': round(top), 'bottom': round(bottom), 'file': fn}
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    print(json.dumps(results, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    pdf = sys.argv[1]
    out = sys.argv[2]
    nums = [int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else []
    main(pdf, nums, out)
