# -*- coding: utf-8 -*-
import io, os

targets = [
    ('/fees', 'src/app/(main)/fees/page.tsx'),
    ('/parent-messages', 'src/app/(main)/parent-messages/page.tsx'),
    ('/data-admin', 'src/app/(main)/data-admin/page.tsx'),
    ('/settings', 'src/app/(main)/settings/page.tsx'),
    ('/study-hall(admin)', 'src/app/(main)/study-hall/page.tsx'),
    ('/phet(admin)', 'src/app/(main)/phet/page.tsx'),
    ('/volunteer/guide', 'src/app/(main)/volunteer/guide/page.tsx'),
    ('/volunteer/quota', 'src/app/(main)/volunteer/quota/page.tsx'),
    ('/student-archive/[id]', 'src/app/(main)/student-archive/[id]/page.tsx'),
    ('/teacher/classroom-feedback', 'src/app/teacher/classroom-feedback/page.tsx'),
    ('/teacher/lesson-previews', 'src/app/teacher/lesson-previews/page.tsx'),
    ('/teacher/papers', 'src/app/teacher/papers/page.tsx'),
    ('/teacher/performance', 'src/app/teacher/performance/page.tsx'),
    ('/teacher/phet', 'src/app/teacher/phet/page.tsx'),
    ('/teacher/services', 'src/app/teacher/services/page.tsx'),
    ('/teacher/services/[slug]', 'src/app/teacher/services/[slug]/page.tsx'),
    ('/teacher/student-profile/[id]', 'src/app/teacher/student-profile/[id]/page.tsx'),
    ('/teacher/student/[id]', 'src/app/teacher/student/[id]/page.tsx'),
    ('/teacher/study-hall', 'src/app/teacher/study-hall/page.tsx'),
    ('/teacher/benefits', 'src/app/teacher/benefits/page.tsx'),
    ('/teacher/messages', 'src/app/teacher/messages/page.tsx'),
    ('/teacher/meals', 'src/app/teacher/meals/page.tsx'),
    ('/teacher/ai', 'src/app/teacher/ai/page.tsx'),
    ('/ai(admin)', 'src/app/(main)/ai/page.tsx'),
]
for name, p in targets:
    if not os.path.exists(p):
        print('%-28s MISSING' % name)
        continue
    t = io.open(p, encoding='utf-8', errors='ignore').read()
    # strip imports to see body
    body = t[:600]
    print('%-28s len=%-6s' % (name, len(t)))
    print('   ' + body.replace('\n', ' ')[:300])
    print()
