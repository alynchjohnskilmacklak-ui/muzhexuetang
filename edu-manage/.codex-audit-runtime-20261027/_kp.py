import io, re
s = io.open('src/lib/classroom-feedback/subject-knowledge-points.ts', encoding='utf-8').read()
def grab(grade, subject, n=26):
    m = re.search(r"'%s': \{.*?'%s': \[(.*?)\]" % (grade, subject), s, re.S)
    if not m:
        print(grade, subject, 'NOT FOUND'); return
    items = [x.strip().strip("'") for x in m.group(1).split('\n') if x.strip().startswith("'")]
    print(grade, subject, ':', '、'.join(items[:n]))
grab('初二', '数学')
grab('初二', '物理')
grab('初三', '数学')
grab('初三', '物理')
grab('初三', '化学')
grab('高一', '数学')
grab('高一', '物理')
grab('高一', '化学')
