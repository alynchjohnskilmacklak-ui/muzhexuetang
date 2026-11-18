# -*- coding: utf-8 -*-
import io
p = r"src\components\Layout\MobileLayout.tsx"
s = io.open(p, encoding="utf-8-sig").read()
old = """<span className="mobile-brand-title" style={{ fontSize: 16, fontWeight: 760, letterSpacing: '-0.02em', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>"""
new = """<span className="mobile-brand-title" style={{
              fontSize: pageTheme === 'svip' ? 17 : 16,
              fontWeight: pageTheme === 'svip' ? 800 : 760,
              letterSpacing: pageTheme === 'svip' ? '0.02em' : '-0.02em',
              color: pageTheme === 'svip' ? '#F6E9C8' : 'var(--color-ink)',
              textShadow: pageTheme === 'svip' ? '0 1px 3px rgba(0,0,0,.35)' : undefined,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{title}</span>"""
assert s.count(old) == 1, "anchor " + str(s.count(old))
s = s.replace(old, new)
io.open(p, "w", encoding="utf-8").write(s)
print("OK brand title svip")
