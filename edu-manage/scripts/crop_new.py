# -*- coding: utf-8 -*-
"""第二批真实题库裁剪：geom7/cong13/tri17/func20/trig26/inv27"""
import os, re, json
import pymupdf
from PIL import Image

PDFS = {
    'geom7':  (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二章 几何图形的初步认识（单元重点综合测试）（教师版）.pdf', [12, 15]),
    'cong13': (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第十三章 全等三角形单元重点综合测试（教师版）.pdf', [13, 16]),
    'tri17':  (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第十七章 特殊三角形单元重点综合测试（教师版）.pdf', [14, 16]),
    'func20': (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二十章 函数（单元重点综合测试）（教师版）.pdf', [13, 15]),
    'trig26': (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二十六章 解直角三角形单元重点综合测试（教师版）.pdf', [4, 16]),
    'inv27':  (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二十七章 反比例函数单元重点综合测试（教师版）.pdf', [7, 15]),
}

def get_marks(page):
    marks = []
    for w in page.get_text('words'):
        m = re.match(r'^(\d{1,2})[．.、]', w[4])
        # 题号必须带标点后缀，且 x 在页左缘（排除表格/正文中的孤立数字）
        if m and 1 <= int(m.group(1)) <= 60 and w[0] < 120:
            marks.append((int(m.group(1)), w[0], w[1], w[2], w[3]))
    marks.sort(key=lambda m: (m[2], m[1]))
    return marks

def get_answer_top(page, after_y):
    ans = None
    for w in page.get_text('words'):
        if '【答案' in w[4] or (w[4] == '【答案】' and w[1] > after_y) or ('【答' in w[4]):
            y = w[1]
            if y > after_y and (ans is None or y < ans):
                ans = y
    return ans

def render(page, rect):
    pm = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=rect)
    img = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
    return img

def main():
    for tag, (pdf, numbers) in PDFS.items():
        doc = pymupdf.open(pdf)
        base = os.path.dirname(pdf)
        crop_dir = os.path.join(base, 'crops', tag)
        os.makedirs(crop_dir, exist_ok=True)
        results = {}
        for pno in range(doc.page_count):
            page = doc[pno]
            marks = get_marks(page)
            page_h = page.rect.height
            page_w = page.rect.width
            for i, m in enumerate(marks):
                num = m[0]
                if num not in numbers:
                    continue
                top = max(m[2] - 4, 0)
                nxt = marks[i + 1] if i + 1 < len(marks) else None
                ans_top = get_answer_top(page, top)
                bottom = page_h
                if nxt and nxt[2] > top:
                    bottom = min(bottom, nxt[2] - 4)
                if ans_top is not None:
                    bottom = min(bottom, ans_top)
                touch_bottom = (bottom >= page_h - 4)
                rect1 = pymupdf.Rect(30, top, page_w - 30, bottom)
                img = render(page, rect1)
                joined = False
                if touch_bottom and pno + 1 < doc.page_count:
                    page2 = doc[pno + 1]
                    marks2 = get_marks(page2)
                    ans2 = get_answer_top(page2, 0)
                    stop = page2.rect.height
                    if marks2:
                        stop = min(stop, marks2[0][2] - 4)
                    if ans2 is not None:
                        stop = min(stop, ans2)
                    rect2 = pymupdf.Rect(30, 0, page_w - 30, max(stop, 40))
                    img2 = render(page2, rect2)
                    merged = Image.new('RGB', (img.width, img.height + img2.height), 'white')
                    merged.paste(img, (0, 0))
                    merged.paste(img2, (0, img.height))
                    img = merged
                    joined = True
                fn = f'crop-q{num}.png'
                img.save(os.path.join(crop_dir, fn))
                results[num] = {'page': pno + 1, 'top': round(top), 'bottom': round(bottom), 'joined': joined, 'w': img.width, 'h': img.height}
        out_json = os.path.join(base, f'{tag}-crops.json')
        with open(out_json, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=1)
        print(tag, results, flush=True)

if __name__ == '__main__':
    main()
