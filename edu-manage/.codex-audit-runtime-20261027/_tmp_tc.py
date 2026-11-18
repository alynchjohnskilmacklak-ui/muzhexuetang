# -*- coding: utf-8 -*-
import io
p = r"src\app\parent\teachers\client.tsx"
s = io.open(p, encoding="utf-8-sig").read()

old = """  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]

  return <button type="button" className="parent-teacher-card" onClick={onSelect}>"""
new = """  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]
  const isElite = tier === 'ELITE'

  return <button type="button" className={`parent-teacher-card${isElite ? ' parent-teacher-card--elite' : ''}`} onClick={onSelect}>"""
assert s.count(old) == 1, "card " + str(s.count(old))
s = s.replace(old, new)

old = """    <span className="parent-teacher-name">
      <strong>{teacher.name}</strong>
      {tier === 'SENIOR' && <StarFilled aria-label="资深教师" style={{ color: tierTheme.gold }} />}
    </span>"""
new = """    <span className="parent-teacher-name">
      <strong>{teacher.name}</strong>
      {isElite && <span className="parent-teacher-tier-tag parent-teacher-tier-tag--elite">牧哲学堂专属教师</span>}
      {tier === 'SENIOR' && <StarFilled aria-label="资深教师" style={{ color: tierTheme.gold }} />}
    </span>"""
assert s.count(old) == 1, "name " + str(s.count(old))
s = s.replace(old, new)

io.open(p, "w", encoding="utf-8").write(s)
print("OK elite teacher card")
