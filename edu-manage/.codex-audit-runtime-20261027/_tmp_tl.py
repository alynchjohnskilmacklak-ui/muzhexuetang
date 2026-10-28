# -*- coding: utf-8 -*-
import io
p = r"src\components\Layout\TeacherLayout.tsx"
s = io.open(p, encoding="utf-8-sig").read()

# 1) 桌面外层 Layout 背景
old = """  return (
    <Layout style={{ minHeight: '100vh' }}>"""
new = """  return (
    <Layout style={{ minHeight: '100vh', background: appTheme.mainBg }}>"""
assert s.count(old) == 1, "layout " + str(s.count(old))
s = s.replace(old, new)

# 2) Content 背景 + dark class
old = """        <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>"""
new = """        <Content
          className={appTheme.dark ? 'teacher-main--dark' : 'teacher-main--light'}
          style={{ padding: 24, maxWidth: 1280, margin: '0 auto', width: '100%', background: appTheme.mainBg }}
        >"""
assert s.count(old) == 1, "content " + str(s.count(old))
s = s.replace(old, new)

# 3) 移动端 headerTheme 加 mainBg
old = """        headerTheme={{ bg: appTheme.headerBg, fg: appTheme.headerFg, border: appTheme.headerBorder }}"""
new = """        headerTheme={{ bg: appTheme.headerBg, fg: appTheme.headerFg, border: appTheme.headerBorder, mainBg: appTheme.mainBg, dark: appTheme.dark }}"""
assert s.count(old) == 1, "hdr " + str(s.count(old))
s = s.replace(old, new)

io.open(p, "w", encoding="utf-8").write(s)
print("OK TeacherLayout.tsx")
