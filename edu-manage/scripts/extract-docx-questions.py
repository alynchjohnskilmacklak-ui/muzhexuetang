# -*- coding: utf-8 -*-
"""从牧哲学堂真实题库 docx 中提取题目（题干/答案/知识点/解析）及对应图片映射。
用法: python extract-docx-questions.py "<docx路径>" "<输出json路径>"
输出: 每题 {idx, 段落文本列表, images:[media文件名], answer, knowledge, analysis}
"""
import sys, os, re, json, zipfile
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'

def extract(path):
    z = zipfile.ZipFile(path)
    doc = z.read('word/document.xml')
    root = ET.fromstring(doc)
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
    """按题号开头段落分组；【答案】【知识点】【分析】并入当前题。"""
    questions = []
    cur = None
    for p in paras:
        t = p['text']
        if re.match(r'^\s*\d+[\.、．]', t):
            if cur: questions.append(cur)
            cur = {'header': t, 'lines': [], 'imgs': [], 'answer': '', 'knowledge': '', 'analysis': []}
            if cur['imgs'] or cur['lines'] or cur['answer']: pass
            cur['lines'].append(t)
            cur['imgs'].extend(p['imgs'])
        elif cur is None:
            continue
        elif t.startswith('【答案】'):
            cur['answer'] = t.replace('【答案】', '').strip()
        elif t.startswith('【知识点】') or t.startswith('【知识点】'):
            cur['knowledge'] = t.replace('【知识点】', '').strip()
        elif t.startswith('【分析】'):
            cur['analysis'].append(t.replace('【分析】', '').strip())
        elif t.startswith('【详解】') or t.startswith('【详解】'):
            cur['analysis'].append(t.replace('【详解】', '').strip())
        else:
            cur['lines'].append(t)
            cur['imgs'].extend(p['imgs'])
    if cur: questions.append(cur)
    return questions

if __name__ == '__main__':
    src = sys.argv[1]
    out = sys.argv[2]
    paras = extract(src)
    qs = group_questions(paras)
    result = {'source': os.path.basename(src), 'total': len(qs), 'questions': []}
    for i, q in enumerate(qs):
        result['questions'].append({
            'idx': i + 1,
            'header': q['header'],
            'body': q['lines'][1:] if q['lines'] else [],
            'imgs': q['imgs'],
            'answer': q['answer'],
            'knowledge': q['knowledge'],
            'analysis': q['analysis'],
        })
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    print(f"共 {len(qs)} 题 -> {out}")
    for q in result['questions']:
        print(f"#{q['idx']} [{len(q['imgs'])}图] {q['header'][:60]} | 知识点: {q['knowledge'][:40]}")
