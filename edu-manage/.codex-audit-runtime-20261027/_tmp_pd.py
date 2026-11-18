# -*- coding: utf-8 -*-
import io
p = r"src\lib\parent-dashboard.ts"
s = io.open(p, encoding="utf-8-sig").read()

# 1) import
old = "import { selectLatestParentStudents } from '@/lib/parent-student-selection'"
new = """import { selectLatestParentStudents } from '@/lib/parent-student-selection'
import { resolveTier, TIER_RANK } from '@/constants/teacher-tier'"""
assert s.count(old) == 1, "imp " + str(s.count(old))
s = s.replace(old, new)

# 2) mainTeacher select 加 tierLevel
old = "mainTeacher: { select: { id: true, name: true } },"
new = "mainTeacher: { select: { id: true, name: true, tierLevel: true } },"
assert s.count(old) == 1, "mt " + str(s.count(old))
s = s.replace(old, new)

# 3) enrollments teacher select 加 tierLevel
old = "teacher: { select: { id: true, name: true } },"
new = "teacher: { select: { id: true, name: true, tierLevel: true } },"
assert s.count(old) == 1, "en " + str(s.count(old))
s = s.replace(old, new)

# 4) 计算 studentTopTeacher（追加在 studentTeachers 计算后）
old = """    studentTeachers[student.id] = [...teacherSet]
  }"""
new = """    studentTeachers[student.id] = [...teacherSet]
  }

  // 家长端 hero 卡：从主负责老师 + 报名学科老师中取等级最高的老师展示
  const studentTopTeacher: Record<string, { name: string; tierLevel?: string | null }> = {}
  for (const student of students) {
    const candidates: { name: string; tierLevel?: string | null }[] = []
    if (student.mainTeacher?.name) candidates.push(student.mainTeacher)
    for (const enrollment of student.enrollments) {
      if (enrollment.group?.teacher?.name) candidates.push(enrollment.group.teacher)
    }
    let top: { name: string; tierLevel?: string | null } | null = null
    for (const candidate of candidates) {
      if (!top || TIER_RANK[resolveTier(candidate.tierLevel)] > TIER_RANK[resolveTier(top.tierLevel)]) {
        top = candidate
      }
    }
    studentTopTeacher[student.id] = top ?? { name: '待分配' }
  }"""
assert s.count(old) == 1, "calc " + str(s.count(old))
s = s.replace(old, new)

# 5) 返回加 studentTopTeacher
old = """    studentTeachers,
    todaySchedules: [],"""
new = """    studentTeachers,
    studentTopTeacher,
    todaySchedules: [],"""
assert s.count(old) == 1, "ret " + str(s.count(old))
s = s.replace(old, new)

io.open(p, "w", encoding="utf-8").write(s)
print("OK parent-dashboard.ts")
