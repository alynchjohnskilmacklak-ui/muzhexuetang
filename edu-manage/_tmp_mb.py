# -*- coding: utf-8 -*-
import io
p = r"src\components\Layout\MobileLayout.tsx"
s = io.open(p, encoding="utf-8-sig").read()

# 1) 参数默认值去掉对 headerTheme 的引用
old = """  tabBackground = headerTheme?.dark ? 'rgba(14,46,42,.98)' : '#ffffff',
  tabBorderTop = headerTheme?.dark ? '1px solid rgba(201,164,92,.30)' : '1px solid rgba(0,0,0,.06)',
  pageTheme = 'normal',
  tabInactiveColor = headerTheme?.dark ? 'rgba(246,233,200,.78)' : 'var(--color-ink-subtle)',
  headerTheme,"""
new = """  tabBackground,
  tabBorderTop,
  pageTheme = 'normal',
  tabInactiveColor,
  headerTheme,"""
assert s.count(old) == 1, "params " + str(s.count(old))
s = s.replace(old, new)

# 2) 函数体计算有效值
old = """  const [open, setOpen] = useState(false)
  const { data: session } = useSession()"""
new = """  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const effectiveTabBackground = tabBackground ?? (headerTheme?.dark ? 'rgba(14,46,42,.98)' : '#ffffff')
  const effectiveTabBorderTop = tabBorderTop ?? (headerTheme?.dark ? '1px solid rgba(201,164,92,.30)' : '1px solid rgba(0,0,0,.06)')
  const effectiveTabInactive = tabInactiveColor ?? (headerTheme?.dark ? 'rgba(246,233,200,.78)' : 'var(--color-ink-subtle)')"""
assert s.count(old) == 1, "body " + str(s.count(old))
s = s.replace(old, new)

# 3) nav 使用处
old = "          background: tabBackground,\n          borderTop: tabBorderTop,"
new = "          background: effectiveTabBackground,\n          borderTop: effectiveTabBorderTop,"
assert s.count(old) == 1, "nav " + str(s.count(old))
s = s.replace(old, new)

# 4) active 颜色行 ×2
old = "color: active ? (headerTheme?.dark ? '#F6E9C8' : accentColor) : tabInactiveColor,"
new = "color: active ? (headerTheme?.dark ? '#F6E9C8' : accentColor) : effectiveTabInactive,"
n = s.count(old)
assert n == 2, "active " + str(n)
s = s.replace(old, new)

io.open(p, "w", encoding="utf-8").write(s)
print("OK mobile bottom fixed")
