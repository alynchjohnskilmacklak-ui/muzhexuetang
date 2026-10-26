# -*- coding: utf-8 -*-
import io, os, re

def read(p):
    try:
        return io.open(p, encoding='utf-8', errors='ignore').read()
    except Exception:
        return ''

def collect(dirpath):
    total = 0
    texts = []
    for f in os.listdir(dirpath):
        if f.endswith(('.tsx', '.ts')):
            t = read(os.path.join(dirpath, f))
            total += len(t)
            texts.append(t)
    return total, '\n'.join(texts)

def key_titles(t):
    out = []
    for m in re.finditer(r'<Title[^>]*>([^<]{2,24})</Title>', t):
        s = m.group(1).strip()
        if s not in out: out.append(s)
    for m in re.finditer(r'title\s*[:=]\s*["\']([^"\']{2,24})["\']', t):
        s = m.group(1).strip()
        if s not in out: out.append(s)
    for m in re.finditer(r'<h[23][^>]*>([^<]{2,24})</h[23]>', t):
        s = m.group(1).strip()
        if s not in out: out.append(s)
    return out[:8]

groups = [
    ('admin-overview', [
        ('/dashboard', 'src/app/(main)/dashboard'),
        ('/services', 'src/app/(main)/services'),
        ('/reports', 'src/app/(main)/reports'),
    ]),
    ('admin-feedback', [
        ('/classroom-feedback', 'src/app/(main)/classroom-feedback'),
        ('/performance', 'src/app/(main)/performance'),
        ('/grades', 'src/app/(main)/grades'),
    ]),
    ('admin-student', [
        ('/students', 'src/app/(main)/students'),
        ('/students/[id]', 'src/app/(main)/students/[id]'),
        ('/student-archive', 'src/app/(main)/student-archive'),
    ]),
    ('admin-teacher', [
        ('/teachers', 'src/app/(main)/teachers'),
        ('/teacher-logs', 'src/app/(main)/teacher-logs'),
        ('/teacher-salary', 'src/app/(main)/teacher-salary'),
    ]),
    ('admin-ops', [
        ('/fees', 'src/app/(main)/fees'),
        ('/meals', 'src/app/(main)/meals'),
        ('/parent-messages', 'src/app/(main)/parent-messages'),
        ('/communications', 'src/app/(main)/communications'),
        ('/notifications', 'src/app/(main)/notifications'),
        ('/parent-access', 'src/app/(main)/parent-access'),
    ]),
    ('teacher-main', [
        ('/teacher/dashboard', 'src/app/teacher/dashboard'),
        ('/teacher/services', 'src/app/teacher/services'),
    ]),
    ('teacher-work', [
        ('/teacher/schedule', 'src/app/teacher/schedule'),
        ('/teacher/attendance', 'src/app/teacher/attendance'),
        ('/teacher/feedback', 'src/app/teacher/feedback'),
        ('/teacher/intensive', 'src/app/teacher/intensive'),
        ('/teacher/study-hall', 'src/app/teacher/study-hall'),
        ('/teacher/lesson-previews', 'src/app/teacher/lesson-previews'),
    ]),
    ('teacher-student', [
        ('/teacher/students', 'src/app/teacher/students'),
        ('/teacher/students/[id]', 'src/app/teacher/students/[id]'),
        ('/teacher/leave', 'src/app/teacher/leave'),
        ('/teacher/messages', 'src/app/teacher/messages'),
    ]),
    ('teacher-resource', [
        ('/teacher/papers', 'src/app/teacher/papers'),
        ('/teacher/materials', 'src/app/teacher/materials'),
        ('/teacher/phet', 'src/app/teacher/phet'),
        ('/teacher/ai', 'src/app/teacher/ai'),
        ('/teacher/benefits', 'src/app/teacher/benefits'),
        ('/teacher/salary', 'src/app/teacher/salary'),
        ('/teacher/meals', 'src/app/teacher/meals'),
    ]),
    ('volunteer', [
        ('/volunteer', 'src/app/(main)/volunteer'),
        ('/volunteer-sim', 'src/app/(main)/volunteer-sim'),
        ('/volunteer-sim/schools', 'src/app/(main)/volunteer-sim/schools'),
        ('/volunteer-sim/rank-query', 'src/app/(main)/volunteer-sim/rank-query'),
    ]),
    ('admin-schedule', [
        ('/schedule', 'src/app/(main)/schedule'),
        ('/schedule/intensive', 'src/app/(main)/schedule/intensive'),
        ('/academic-terms', 'src/app/(main)/academic-terms'),
        ('/courses', 'src/app/(main)/courses'),
    ]),
]
for gname, items in groups:
    print('=' * 60)
    print('GROUP', gname)
    for label, dirpath in items:
        if not os.path.isdir(dirpath):
            print('  %-22s MISSING' % label)
            continue
        size, txt = collect(dirpath)
        titles = key_titles(txt)
        print('  %-22s dir=%-6s titles=%s' % (label, size, ' | '.join(titles[:6])))
