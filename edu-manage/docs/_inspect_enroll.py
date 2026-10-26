# -*- coding: utf-8 -*-
import io, re
path = r'src/app/(main)/courses/[id]/page.tsx'
c = io.open(path, encoding='utf-8-sig', newline='').read()
i = c.find('Popconfirm title="确定把该学员移出班级')
print(c[i-1000:i+500])
