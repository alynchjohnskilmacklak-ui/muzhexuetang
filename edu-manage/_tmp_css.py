# -*- coding: utf-8 -*-
import io
p = r"src\app\globals.css"
s = io.open(p, encoding="utf-8-sig").read()

# 1) 教师卡片注释 tip 基础样式（追加在 .parent-teacher-card 附近不影响，直接文件尾部追加类定义）
tip_css = """
/* ===== 家长端教师卡片 · 查看提示 ===== */
.parent-teacher-tip {
  display: block;
  margin-top: 7px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-ink-subtle);
  opacity: 0.85;
  white-space: nowrap;
}
"""

# 2) SVIP 深色顶部 · 教师筛选区 / Tabs / 通用适配
svip_css = """
/* ===== 会员主题 · SVIP 深色顶部更多元素适配 ===== */
#mobile-root.parent-page--svip .parent-teacher-search {
  background: rgba(246, 233, 200, 0.10) !important;
  border-color: rgba(246, 233, 200, 0.5) !important;
  box-shadow: none !important;
}
#mobile-root.parent-page--svip .parent-teacher-search .ant-input {
  background: transparent;
  color: #F6E9C8;
}
#mobile-root.parent-page--svip .parent-teacher-search .ant-input::placeholder {
  color: rgba(246, 233, 200, 0.55);
}
#mobile-root.parent-page--svip .parent-teacher-search .anticon {
  color: rgba(246, 233, 200, 0.72);
}
#mobile-root.parent-page--svip .parent-teacher-chips button {
  color: rgba(246, 233, 200, 0.92);
  background: rgba(246, 233, 200, 0.10);
  border: 1px solid rgba(246, 233, 200, 0.45);
}
#mobile-root.parent-page--svip .parent-teacher-chips button[aria-pressed="true"] {
  color: #0E2E2A;
  background: #C9A45C;
  border-color: #C9A45C;
}
#mobile-root.parent-page--svip .parent-teacher-results-head .ant-typography {
  color: #F6E9C8;
}
#mobile-root.parent-page--svip .parent-teacher-results-head .ant-typography-secondary {
  color: rgba(246, 233, 200, 0.78);
}
#mobile-root.parent-page--svip .parent-theme-title .ant-tabs-tab,
#mobile-root.parent-page--svip .parent-page-heading .ant-tabs-tab {
  color: rgba(246, 233, 200, 0.82);
}
#mobile-root.parent-page--svip .parent-theme-title .ant-tabs-tab-active,
#mobile-root.parent-page--svip .parent-page-heading .ant-tabs-tab-active {
  color: #F6E9C8 !important;
}
#mobile-root.parent-page--svip .parent-theme-title .ant-tabs-ink-bar,
#mobile-root.parent-page--svip .parent-page-heading .ant-tabs-ink-bar {
  background: #C9A45C !important;
}
"""

# 追加到文件末尾
s = s.rstrip() + "\n" + tip_css + svip_css
io.open(p, "w", encoding="utf-8").write(s)
print("OK css appended")
