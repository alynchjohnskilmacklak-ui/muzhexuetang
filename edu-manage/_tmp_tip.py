# -*- coding: utf-8 -*-
import io
p = r"src\app\parent\teachers\client.tsx"
s = io.open(p, encoding="utf-8-sig").read()
old = """    <span className="parent-teacher-subjects">
      {subjects.slice(0, 3).map(subject => {
        const style = SUBJECT_STYLES[subject] || DEFAULT_STYLE
        return <span key={subject} style={{ background: style.bg, color: style.color }}>{subject}</span>
      })}
    </span>
  </button>
}"""
new = """    <span className="parent-teacher-subjects">
      {subjects.slice(0, 3).map(subject => {
        const style = SUBJECT_STYLES[subject] || DEFAULT_STYLE
        return <span key={subject} style={{ background: style.bg, color: style.color }}>{subject}</span>
      })}
    </span>
    <span className="parent-teacher-tip">点击查看教师信息</span>
  </button>
}"""
assert s.count(old) == 1, "anchor " + str(s.count(old))
s = s.replace(old, new)
io.open(p, "w", encoding="utf-8").write(s)
print("OK teacher tip")
