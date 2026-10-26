# -*- coding: utf-8 -*-
"""提取新卷题目概览：题号/带图/答案/知识点/题面前2行"""
import os, re, zipfile
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
            cur = {'lines': [], 'imgs': [], 'answer': '', 'knowledge': ''}
            cur['lines'].append(t)
            cur['imgs'].extend(p['imgs'])
        elif cur is None:
            continue
        elif t.startswith('【答案】'):
            cur['answer'] = t.replace('【答案】', '').strip()
        elif t.startswith('【知识点】'):
            cur['knowledge'] = t.replace('【知识点】', '').strip()
        else:
            cur['lines'].append(t)
            cur['imgs'].extend(p['imgs'])
    if cur: questions.append(cur)
    return questions

SOURCES = [
    ('geom7',  r'D:\01muzhexuetang\muzhexuetang\01牧哲学堂七年级上册\七年级数学上册（冀教版2024）\第二章 几何图形的初步认识（单元重点综合测试）（教师版）.docx'),
    ('cong13', r'D:\01muzhexuetang\muzhexuetang\03牧哲学堂八年级上册\八年级数学上册（冀教版）\第十三章 全等三角形单元重点综合测试（教师版）.docx'),
    ('tri17',  r'D:\01muzhexuetang\muzhexuetang\03牧哲学堂八年级上册\八年级数学上册（冀教版）\第十七章 特殊三角形单元重点综合测试（教师版）.docx'),
    ('func20', r'D:\01muzhexuetang\muzhexuetang\04牧哲学堂八年级下册\八年级数学下册（冀教版）\第二十章 函数（单元重点综合测试）（教师版）.docx'),
    ('trig26', r'D:\01muzhexuetang\muzhexuetang\05牧哲学堂九年级上册\九年级数学上册（冀教版）\第二十六章 解直角三角形单元重点综合测试（教师版）.docx'),
    ('inv27',  r'D:\01muzhexuetang\muzhexuetang\05牧哲学堂九年级上册\九年级数学上册（冀教版）\第二十七章 反比例函数单元重点综合测试（教师版）.docx'),
]

for tag, path in SOURCES:
    if not os.path.exists(path):
        print(f'!! 缺失 {tag}: {path}')
        continue
    qs = group_questions(extract(path))
    print(f'\n===== [{tag}] 共{len(qs)}题 =====')
    for q in qs:
        first = q['lines'][0][:40]
        body2 = ''.join(q['lines'][1:2])[:60]
        m = re.match(r'^\s*(\d+)', q['lines'][0])
        num = m.group(1) if m else '?'
        print(f"#{num} 图{len(q['imgs'])} 答:{q['answer'][:20]!r} | {first} | {body2}")
