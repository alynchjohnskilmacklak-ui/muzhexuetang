# -*- coding: utf-8 -*-
"""批量提取牧哲学堂真实题库docx → JSON"""
import os, re, json, zipfile
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
            cur = {'header': t, 'lines': [], 'imgs': [], 'answer': '', 'knowledge': '', 'analysis': []}
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

SOURCES = [
    ('平行线', r'D:\01muzhexuetang\muzhexuetang\1002、2025年牧哲学堂三期七年级下册\七年级数学下册（冀教版2024）\第七章 相交线与平行线（单元重点综合测试）（教师版）.docx'),
    ('轴对称16', r'D:\01muzhexuetang\muzhexuetang\03牧哲学堂八年级上册\八年级数学上册（冀教版）\第十六章 轴对称和中心对称单元重点综合测试（教师版）.docx'),
    ('坐标19', r'D:\01muzhexuetang\muzhexuetang\04牧哲学堂八年级下册\八年级数学下册（冀教版）\第十九章 平面直角坐标系（单元重点综合测试）（教师版）.docx'),
    ('四边形22', r'D:\01muzhexuetang\muzhexuetang\04牧哲学堂八年级下册\八年级数学下册（冀教版）\第二十二章 四边形（单元重点综合测试）（教师版）.docx'),
    ('相似25', r'D:\01muzhexuetang\muzhexuetang\05牧哲学堂九年级上册\九年级数学上册（冀教版）\第二十五章 图形的相似单元重点综合测试（教师版）.docx'),
    ('圆28', r'D:\01muzhexuetang\muzhexuetang\05牧哲学堂九年级上册\九年级数学上册（冀教版）\第二十八章 圆单元重点综合测试（教师版）.docx'),
]

out_dir = r'C:\Users\Administrator\AppData\Local\Temp\mzx-qbank'
os.makedirs(out_dir, exist_ok=True)
for tag, path in SOURCES:
    if not os.path.exists(path):
        print(f'!! 缺失: {path}')
        continue
    paras = extract(path)
    qs = group_questions(paras)
    data = {'source': os.path.basename(path), 'total': len(qs), 'questions': []}
    for i, q in enumerate(qs):
        data['questions'].append({
            'idx': i + 1,
            'header': q['header'],
            'body': q['lines'][1:] if q['lines'] else [],
            'imgs': q['imgs'],
            'answer': q['answer'],
            'knowledge': q['knowledge'],
            'analysis': q['analysis'],
        })
    out = os.path.join(out_dir, tag + '.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    withimg = [q for q in data['questions'] if q['imgs']]
    print(f"[{tag}] 共{len(qs)}题, 带图{len(withimg)}题")
