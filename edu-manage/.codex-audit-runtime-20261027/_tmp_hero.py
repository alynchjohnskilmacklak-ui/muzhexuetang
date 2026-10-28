# -*- coding: utf-8 -*-
import io
p = r"src\app\parent\dashboard\client.tsx"
s = io.open(p, encoding="utf-8-sig").read()

# 1) import
old = "import { getDailyQuote } from '@/data/daily-quotes'"
new = """import { getDailyQuote } from '@/data/daily-quotes'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'"""
assert s.count(old) == 1, "imp " + str(s.count(old))
s = s.replace(old, new)

# 2) props 解构加 studentTopTeacher
old = """  parentUserId,
  students,
  studentTeachers,"""
new = """  parentUserId,
  students,
  studentTeachers,
  studentTopTeacher,"""
assert s.count(old) == 1, "props " + str(s.count(old))
s = s.replace(old, new)

# 3) hero 逻辑：teacherDisplay 处追加 topTeacher 计算
old = """  const activeTeacherNames = activeStudent?.id ? studentTeachers[activeStudent.id] || [] : []
  const teacherDisplay = activeTeacherNames.length ? activeTeacherNames.join('、') : '待分配'"""
new = """  const activeTeacherNames = activeStudent?.id ? studentTeachers[activeStudent.id] || [] : []
  const teacherDisplay = activeTeacherNames.length ? activeTeacherNames.join('、') : '待分配'
  const topTeacher = activeStudent?.id ? studentTopTeacher?.[activeStudent.id] : null
  const topTier = topTeacher?.tierLevel ? resolveTier(topTeacher.tierLevel) : null
  const topTierLabel = topTier ? TIER_THEME[topTier].label : ''"""
assert s.count(old) == 1, "calc " + str(s.count(old))
s = s.replace(old, new)

# 4) hero small 行替换
old = """<small>{activeStudent?.grade || '未填写年级'} · 负责老师 {teacherDisplay}</small></span></div>"""
new = """<small className="parent-hero-teacher-line">
            <span className="parent-hero-teacher-prefix">{activeStudent?.grade || '未填写年级'} · 负责老师</span>
            <span className="parent-hero-teacher-name">{topTeacher?.name || '待分配'}</span>
            {topTierLabel && <span className="parent-hero-teacher-tag">{topTierLabel}</span>}
          </small></span></div>"""
assert s.count(old) == 1, "hero " + str(s.count(old))
s = s.replace(old, new)

io.open(p, "w", encoding="utf-8").write(s)
print("OK dashboard client hero")
