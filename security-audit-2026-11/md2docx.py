# -*- coding: utf-8 -*-
"""把合并后的安全审查 Markdown 转成排版规整的 Word 报告。
用法: python md2docx.py <in.md> <out.docx> <标题> <副标题>
"""
import re, sys, io
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

BODY_FONT = '等线'
HEAD_FONT = '微软雅黑'
MONO_FONT = 'Consolas'
ACCENT = RGBColor(0x1F, 0x3B, 0x2D)
GREY = RGBColor(0x66, 0x66, 0x66)


def set_run_font(run, name, size=None, bold=None, color=None, mono=False):
    f = run.font
    f.name = MONO_FONT if mono else name
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts')
        rpr.append(rf)
    rf.set(qn('w:eastAsia'), name)
    rf.set(qn('w:ascii'), MONO_FONT if mono else name)
    rf.set(qn('w:hAnsi'), MONO_FONT if mono else name)
    if size is not None:
        f.size = Pt(size)
    if bold is not None:
        f.bold = bold
    if color is not None:
        f.color.rgb = color


def shade(cell_or_par, hexcolor):
    el = cell_or_par._element
    pr = el.find(qn('w:tcPr')) if el.tag.endswith('tc') else el.find(qn('w:pPr'))
    if pr is None:
        pr = OxmlElement('w:tcPr') if el.tag.endswith('tc') else OxmlElement('w:pPr')
        el.insert(0, pr)
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hexcolor)
    pr.append(shd)


TAG_RE = re.compile(r'(\*\*.+?\*\*|`[^`]+`)')


def add_inline(par, text, size=10.5, base_font=BODY_FONT, bold_all=False):
    text = text.replace('\\|', '|')
    for seg in TAG_RE.split(text):
        if not seg:
            continue
        if seg.startswith('**') and seg.endswith('**') and len(seg) > 4:
            r = par.add_run(seg[2:-2])
            set_run_font(r, base_font, size, True, None)
        elif seg.startswith('`') and seg.endswith('`') and len(seg) > 2:
            r = par.add_run(seg[1:-1])
            set_run_font(r, base_font, size - 0.5, bold_all, None, mono=True)
        else:
            r = par.add_run(seg)
            set_run_font(r, base_font, size, bold_all, None)


def body_par(doc, text, indent=0, space_before=0, space_after=4, size=10.5, keep=False):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(space_before)
    pf.space_after = Pt(space_after)
    pf.line_spacing = 1.45
    if indent:
        pf.left_indent = Cm(indent)
    if keep:
        pf.keep_with_next = True
    add_inline(p, text, size)
    return p


def heading(doc, text, level):
    sizes = {1: 16, 2: 13, 3: 11.5, 4: 10.5}
    p = doc.add_paragraph()
    p.style = doc.styles['Heading %d' % min(level, 4)]
    pf = p.paragraph_format
    pf.space_before = Pt(14 if level == 1 else 10)
    pf.space_after = Pt(6)
    pf.keep_with_next = True
    r = p.add_run(text)
    set_run_font(r, HEAD_FONT, sizes.get(level, 10.5), True, ACCENT if level <= 2 else None)
    if level == 1:
        pf.page_break_before = False
    return p


def add_table(doc, rows):
    ncol = max(len(r) for r in rows)
    rows = [r + [''] * (ncol - len(r)) for r in rows]
    t = doc.add_table(rows=len(rows), cols=ncol)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = True
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            cell = t.cell(i, j)
            cell.text = ''
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.15
            fs = 9 if ncol >= 6 else 9.5
            add_inline(p, val, fs, bold_all=(i == 0))
            if i == 0:
                shade(cell, 'E8EDE9')
            if j == 0 and ncol <= 4:
                pass
    # 表头重复
    tr = t.rows[0]._tr
    trPr = tr.get_or_add_trPr()
    el = OxmlElement('w:tblHeader')
    el.set(qn('w:val'), 'true')
    trPr.append(el)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def parse_table(lines, i):
    rows = []
    while i < len(lines) and lines[i].strip().startswith('|'):
        raw = lines[i].strip()
        if re.fullmatch(r'\|[\s:\-|]+\|', raw):
            i += 1
            continue
        cells = [c.strip() for c in raw.strip('|').split('|')]
        rows.append(cells)
        i += 1
    return rows, i


def build(md, out, title, subtitle):
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    sec.left_margin = sec.right_margin = Cm(2.2)
    sec.top_margin = Cm(2.4)
    sec.bottom_margin = Cm(2.2)

    st = doc.styles['Normal']
    st.font.name = BODY_FONT
    st.font.size = Pt(10.5)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), BODY_FONT)

    # 封面
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(150)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(title)
    set_run_font(r, HEAD_FONT, 26, True, ACCENT)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(10)
    r = p.add_run(subtitle)
    set_run_font(r, HEAD_FONT, 12.5, False, GREY)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(60)
    r = p.add_run('牧哲学堂 · 内部安全审查')
    set_run_font(r, HEAD_FONT, 10.5, False, GREY)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('2026 年 11 月')
    set_run_font(r, HEAD_FONT, 10.5, False, GREY)
    doc.add_page_break()

    lines = md.split('\n')
    i = 0
    in_code = False
    code_buf = []
    first_h1 = True
    while i < len(lines):
        line = lines[i]
        s = line.rstrip()
        st_ = s.strip()

        if st_.startswith('```'):
            if in_code:
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = Cm(0.6)
                p.paragraph_format.space_before = Pt(4)
                p.paragraph_format.space_after = Pt(6)
                p.paragraph_format.line_spacing = 1.1
                shade(p, 'F4F5F4')
                r = p.add_run('\n'.join(code_buf))
                set_run_font(r, MONO_FONT, 9, False, None, mono=True)
                code_buf = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_buf.append(s)
            i += 1
            continue

        if not st_:
            i += 1
            continue

        if st_.startswith('|'):
            rows, i = parse_table(lines, i)
            if rows:
                add_table(doc, rows)
            continue

        m = re.match(r'^(#{1,4})\s+(.*)$', st_)
        if m:
            if len(m.group(1)) == 1:
                if not first_h1:
                    doc.add_page_break()
                first_h1 = False
            heading(doc, m.group(2).strip(), len(m.group(1)))
            i += 1
            continue

        if st_.startswith('---') and set(st_) <= set('-'):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            pPr = p._element.get_or_add_pPr()
            pbdr = OxmlElement('w:pBdr')
            bottom = OxmlElement('w:bottom')
            bottom.set(qn('w:val'), 'single')
            bottom.set(qn('w:sz'), '6')
            bottom.set(qn('w:color'), 'CCCCCC')
            pbdr.append(bottom)
            pPr.append(pbdr)
            i += 1
            continue

        if st_.startswith('>'):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.5)
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            shade(p, 'F3F6F3')
            add_inline(p, st_.lstrip('>').strip(), 9.5)
            i += 1
            continue

        m = re.match(r'^(\s*)([-*+])\s+(.*)$', s)
        if m:
            depth = len(m.group(1)) // 2
            p = doc.add_paragraph()
            pf = p.paragraph_format
            pf.left_indent = Cm(0.75 + 0.55 * depth)
            pf.first_line_indent = Cm(-0.4)
            pf.space_before = Pt(1)
            pf.space_after = Pt(2)
            pf.line_spacing = 1.4
            r = p.add_run('• ' if depth == 0 else '· ')
            set_run_font(r, BODY_FONT, 10.5, False, GREY)
            add_inline(p, m.group(3), 10.5)
            i += 1
            continue

        m = re.match(r'^(\s*)(\d+)\.\s+(.*)$', s)
        if m:
            p = doc.add_paragraph()
            pf = p.paragraph_format
            pf.left_indent = Cm(0.75)
            pf.first_line_indent = Cm(-0.45)
            pf.space_before = Pt(1)
            pf.space_after = Pt(2)
            pf.line_spacing = 1.4
            add_inline(p, '%s. %s' % (m.group(2), m.group(3)), 10.5)
            i += 1
            continue

        body_par(doc, st_, space_before=2, space_after=4)
        i += 1

    doc.save(out)


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    title = sys.argv[3] if len(sys.argv) > 3 else '安全审查报告'
    subtitle = sys.argv[4] if len(sys.argv) > 4 else ''
    with io.open(src, encoding='utf-8') as f:
        md = f.read()
    build(md, dst, title, subtitle)
    print('OK ->', dst)
