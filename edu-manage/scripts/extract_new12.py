# -*- coding: utf-8 -*-
"""提取12题完整文本：题干+选项+答案+知识点+详解"""
import os, re, zipfile, json
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'

def extract(path):
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read('word/document.xml'))
    rels = z.read('word/_rels/document.xml.rels').decode('utf-8')
    relmap = dict(re.findall(r'Id="([^"]+)"[^>]*Target="media/([^"]+)"', rels))
    body = root.find(f'{W}body')
    paras = []
    for p in body.findall(f'{W}p'):
        texts = ''.join(t.text or '' for t in p.findall(f'.//{W}t'))
        imgs = []
        for dr in p.findall(f'.//{WP}inline') + p.findall(f'.//{WP}anchor'):
            for blip in dr.findall(f'.//{A}blip'):
                rid = blip.get(f'{R}embed')
                if rid and rid in relmap:
                    imgs.append(relmap[rid])
        paras.append({'text': texts.strip(), 'imgs': imgs})
    return paras

def group_questions(paras):
    questions = []
    cur = None
    for p in paras:
        t = p['text']
        if re.match(r'^\s*\d+[\.、．]', t):
            if cur: questions.append(cur)
            cur = {'lines': [], 'imgs': [], 'answer': '', 'knowledge': '', 'analysis': []}
            cur['lines'].append(t)
            cur['imgs'].extend(p['imgs'])
        elif cur is None:
            continue
        elif t.startswith('【答案】'):
            cur['answer'] = t.replace('【答案】', '').strip()
        elif t.startswith('【知识点】'):
            cur['knowledge'] = t.replace('【知识点】', '').strip()
        elif t.startswith('【分析】') or t.startswith('【详解】'):
            cur['analysis'].append(t.replace('【分析】', '').replace('【详解】', '').strip())
        else:
            cur['lines'].append(t)
            cur['imgs'].extend(p['imgs'])
    if cur: questions.append(cur)
    return questions

# (tag, docx, [题号])
SELECT = {
    'geom7':  (r'D:\01muzhexuetang\muzhexuetang\01牧哲学堂七年级上册\七年级数学上册（冀教版2024）\第二章 几何图形的初步认识（单元重点综合测试）（教师版）.docx', [12, 15]),
    'cong13': (r'D:\01muzhexuetang\muzhexuetang\03牧哲学堂八年级上册\八年级数学上册（冀教版）\第十三章 全等三角形单元重点综合测试（教师版）.docx', [13, 16]),
    'tri17':  (r'D:\01muzhexuetang\muzhexuetang\03牧哲学堂八年级上册\八年级数学上册（冀教版）\第十七章 特殊三角形单元重点综合测试（教师版）.docx', [14, 16]),
    'func20': (r'D:\01muzhexuetang\muzhexuetang\04牧哲学堂八年级下册\八年级数学下册（冀教版）\第二十章 函数（单元重点综合测试）（教师版）.docx', [13, 15]),
    'trig26': (r'D:\01muzhexuetang\muzhexuetang\05牧哲学堂九年级上册\九年级数学上册（冀教版）\第二十六章 解直角三角形单元重点综合测试（教师版）.docx', [4, 16]),
    'inv27':  (r'D:\01muzhexuetang\muzhexuetang\05牧哲学堂九年级上册\九年级数学上册（冀教版）\第二十七章 反比例函数单元重点综合测试（教师版）.docx', [7, 15]),
}

out = {}
for tag, (path, nums) in SELECT.items():
    qs = group_questions(extract(path))
    # 题号→idx
    by_num = {}
    for q in qs:
        m = re.match(r'^\s*(\d+)', q['lines'][0])
        if m:
            by_num[int(m.group(1))] = q
    for n in nums:
        q = by_num.get(n)
        if not q:
            print(f'!! {tag} #{n} 缺失')
            continue
        out[f'{tag}-q{n}'] = {
            'lines': q['lines'],
            'imgs': q['imgs'],
            'answer': q['answer'],
            'knowledge': q['knowledge'],
            'analysis': q['analysis'],
        }

with open(r'C:\Users\Administrator\AppData\Local\Temp\mzx-qbank\new12.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

for k, v in out.items():
    print(f"\n===== {k} 答:{v['answer']!r} 图{len(v['imgs'])} =====")
    for line in v['lines']:
        print('  ', line[:80])
    print('  K:', v['knowledge'][:80])
    for a in v['analysis']:
        print('  A:', a[:80])
