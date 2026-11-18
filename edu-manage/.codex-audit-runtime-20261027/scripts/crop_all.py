# -*- coding: utf-8 -*-
"""按章节分目录裁剪+跨页拼接（PIL版）"""
import os, re, json
import pymupdf
from PIL import Image

PDFS = {
    'pingxing': (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第七章 相交线与平行线（单元重点综合测试）（教师版）.pdf', [13, 15]),
    'axis16':   (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第十六章 轴对称和中心对称单元重点综合测试（教师版）.pdf', [14, 15]),
    'coord19':  (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第十九章 平面直角坐标系（单元重点综合测试）（教师版）.pdf', [14, 15]),
    'quad22':   (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二十二章 四边形（单元重点综合测试）（教师版）.pdf', [13, 14]),
    'sim25':    (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二十五章 图形的相似单元重点综合测试（教师版）.pdf', [14, 15]),
    'circle28': (r'C:\Users\Administrator\AppData\Local\Temp\mzx-pdfs\第二十八章 圆单元重点综合测试（教师版）.pdf', [13, 15]),
}

def get_marks(page):
    marks = []
    for w in page.get_text('words'):
        m = re.match(r'^(\d{1,2})[．.、]', w[4]) or re.match(r'^(\d{1,2})$', w[4])
        if m and 1 <= int(m.group(1)) <= 60:
            marks.append((int(m.group(1)), w[0], w[1], w[2], w[3]))
    marks.sort(key=lambda m: (m[2], m[1]))
    return marks

def get_answer_top(page, after_y):
    """返回本页【答案】区域的最小 y（题面区下界），无则 None"""
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
                # 题面区下界：优先取【答案】顶部（避免答案/详解泄露），其次下一题号
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
                results[num] = {'page': pno + 1, 'top': round(top), 'bottom': round(bottom), 'joined': joined}
        out_json = os.path.join(base, f'{tag}-crops.json')
        with open(out_json, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=1)
        print(tag, results, flush=True)

if __name__ == '__main__':
    main()
