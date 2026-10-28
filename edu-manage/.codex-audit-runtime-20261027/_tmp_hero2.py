# -*- coding: utf-8 -*-
import io
p = r"src\app\teacher\dashboard\page.tsx"
s = io.open(p, encoding="utf-8-sig").read()

old = """  const heroStyle = {
    '--teacher-hero-bg': tierTheme.accent,
    '--teacher-hero-highlight': tierTheme.gold || tierTheme.border,
  } as CSSProperties"""
new = """  const heroStyle = {
    '--teacher-hero-bg': tier === 'ELITE' ? 'linear-gradient(135deg, #0E2E2A 0%, #16423C 100%)' : tierTheme.accent,
    '--teacher-hero-highlight': tierTheme.gold || tierTheme.border,
    '--teacher-hero-glow': tier === 'ELITE' ? '0 0 34px rgba(201,164,92,.22)' : 'none',
  } as CSSProperties"""
assert s.count(old) == 1, "heroStyle " + str(s.count(old))
s = s.replace(old, new)

old = '<section className="teacher-dashboard-hero" style={heroStyle}>'
new = '<section className={`teacher-dashboard-hero${tier === \'ELITE\' ? \' teacher-dashboard-hero--elite\' : \'\'}`} style={heroStyle}>'
assert s.count(old) == 1, "section " + str(s.count(old))
s = s.replace(old, new)

io.open(p, "w", encoding="utf-8").write(s)
print("OK elite hero style")
