# -*- coding: utf-8 -*-
import io
p = r"src\components\Layout\MobileLayout.tsx"
s = io.open(p, encoding="utf-8-sig").read()

old = "  headerTheme?: { bg: string; fg: string; border: string }"
new = "  headerTheme?: { bg: string; fg: string; border: string; mainBg?: string; dark?: boolean }"
assert s.count(old) == 1, "type " + str(s.count(old))
s = s.replace(old, new)

# main：className 加 teacher-main--dark；style 加 background
old = 'className="mobile-page-content"'
new = "className={headerTheme?.dark ? 'mobile-page-content teacher-main--dark' : 'mobile-page-content'}"
assert s.count(old) == 1, "cls " + str(s.count(old))
s = s.replace(old, new)

old = """          paddingTop: 'calc(56px + env(safe-area-inset-top, 0px) + 2px)',"""
new = """          background: headerTheme?.mainBg || '#f5f7fa',
          paddingTop: 'calc(56px + env(safe-area-inset-top, 0px) + 2px)',"""
assert s.count(old) == 1, "bg " + str(s.count(old))
s = s.replace(old, new)

io.open(p, "w", encoding="utf-8").write(s)
print("OK MobileLayout.tsx")
