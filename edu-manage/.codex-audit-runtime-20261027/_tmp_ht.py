# -*- coding: utf-8 -*-
import io
p = r"src\app\parent\dashboard\client.tsx"
s = io.open(p, encoding="utf-8-sig").read()

old = '{topTierLabel && <span className="parent-hero-teacher-tag">{topTierLabel}</span>}'
new = "{topTierLabel && <span className={`parent-hero-teacher-tag${topTier === 'ELITE' ? ' parent-hero-teacher-tag--elite' : ''}`}>{topTierLabel}</span>}"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, new)
io.open(p, "w", encoding="utf-8").write(s)
print("OK hero tag elite")
