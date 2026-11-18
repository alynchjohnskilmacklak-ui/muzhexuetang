# -*- coding: utf-8 -*-
import io
p = r"src\app\(main)\students\_components\StudentCard.tsx"
s = io.open(p, encoding="utf-8-sig").read()

# 1) 等级变量
old = """  const membershipLevel = resolveMembership(student.membershipLevel)
  const membershipTheme = MEMBERSHIP_THEME[membershipLevel]
  const hasMembershipBadge = membershipLevel === 'VIP' || membershipLevel === 'SVIP'"""
new = """  const membershipLevel = resolveMembership(student.membershipLevel)
  const membershipTheme = MEMBERSHIP_THEME[membershipLevel]
  const hasMembershipBadge = membershipLevel === 'VIP' || membershipLevel === 'SVIP'
  const isSvipCard = membershipLevel === 'SVIP'
  const isVipCard = membershipLevel === 'VIP'
  const cardBg = isSvipCard ? '#0E2E2A' : isVipCard ? '#FFF7F1' : '#ffffff'
  const cardBorder = isSvipCard ? '#C9A45C' : isVipCard ? '#F2B58F' : '#EEE7E1'
  const cardMainText = isSvipCard ? '#F6E9C8' : isVipCard ? '#7A4A28' : '#1F2329'
  const cardSubText = isSvipCard ? 'rgba(246,233,200,.72)' : isVipCard ? '#B08150' : '#98A2B3'
  const cardAccentText = isSvipCard ? '#F6E9C8' : '#E8784A'"""
assert s.count(old) == 1, "vars " + str(s.count(old))
s = s.replace(old, new)

# 2) 卡片容器
old = """        border: '1px solid #EEE7E1',
        borderRadius: 8,
        background: '#ffffff',
        padding: 12,
        minHeight: 128,
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = '#E8784A'"""
new = """        border: `1px solid ${cardBorder}`,
        borderRadius: 8,
        background: cardBg,
        padding: 12,
        minHeight: 128,
        boxShadow: isSvipCard ? '0 0 14px rgba(201,164,92,.18)' : 'none',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = isSvipCard ? '#D6B56A' : '#E8784A'
        if (isSvipCard) event.currentTarget.style.boxShadow = '0 0 22px rgba(201,164,92,.38)'"""
assert s.count(old) == 1, "card " + str(s.count(old))
s = s.replace(old, new)

# 3) mouseLeave 恢复
old = """      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = '#EEE7E1'"""
new = """      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = cardBorder
        if (isSvipCard) event.currentTarget.style.boxShadow = '0 0 14px rgba(201,164,92,.18)'"""
assert s.count(old) == 1, "leave " + str(s.count(old))
s = s.replace(old, new)

# 4) 名字颜色
old = """            <Text strong style={{ color: '#1F2329', fontSize: 1"""
new = """            <Text strong style={{ color: cardMainText, fontSize: 1"""
assert s.count(old) == 1, "name " + str(s.count(old))
s = s.replace(old, new)

# 5) badge：SVIP 金色渐变
old = """            <span style={{ background: membershipTheme.bg, color: membershipTheme.accent, border: `1px solid ${membershipTheme.border}`, borderRadius: 999, fontSize: 10, padding: '1px 7px', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                {membershipLevel === 'SVIP' && <span style={{ color: membershipTheme.gold, marginRight: 3 }}>★</span>}
                {membershipTheme.badge}
              </span>"""
new = """            <span style={{ background: isSvipCard ? 'linear-gradient(135deg,#C9A45C,#A8873D)' : membershipTheme.bg, color: isSvipCard ? '#fff' : membershipTheme.accent, border: `1px solid ${isSvipCard ? '#D6B56A' : membershipTheme.border}`, borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 7px', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                {membershipLevel === 'SVIP' && <span style={{ marginRight: 3 }}>★</span>}
                {membershipTheme.badge}
              </span>"""
assert s.count(old) == 1, "badge " + str(s.count(old))
s = s.replace(old, new)

# 6) 副文字（年级学校）
old = """          <Text style={{ color: '#98A2B3', fontSize: 11, display: 'block', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[student.grade || '未设年级', student.school].filter(Boolean).join(' · ')}
          </Text>"""
new = """          <Text style={{ color: cardSubText, fontSize: 11, display: 'block', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[student.grade || '未设年级', student.school].filter(Boolean).join(' · ')}
          </Text>"""
assert s.count(old) == 1, "sub " + str(s.count(old))
s = s.replace(old, new)

# 7) 晚托行文字
old = """        <div key={membership.id} style={{ fontSize: 11, color: '#667085', margin: '-3px 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"""
new = """        <div key={membership.id} style={{ fontSize: 11, color: cardSubText, margin: '-3px 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"""
assert s.count(old) == 1, "hall " + str(s.count(old))
s = s.replace(old, new)

# 8) 已上时长
old = """        <span style={{ color: '#98A2B3', fontSize: 11, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          已上 <strong style={{ color: '#E8784A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{Number(student.taughtHours || 0).toFixed(1)} 小时</strong>
        </span>"""
new = """        <span style={{ color: cardSubText, fontSize: 11, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          已上 <strong style={{ color: cardAccentText, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{Number(student.taughtHours || 0).toFixed(1)} 小时</strong>
        </span>"""
assert s.count(old) == 1, "hours " + str(s.count(old))
s = s.replace(old, new)

io.open(p, "w", encoding="utf-8").write(s)
print("OK StudentCard theme")
