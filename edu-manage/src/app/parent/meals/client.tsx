'use client'

import { useEffect, useState } from 'react'
import { Card, Typography, message } from 'antd'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六']

type Menu = { id: string; dayOfWeek: number; mainDish: string; sideDish: string | null }
type TodayMenu = { id: string; mainDish: string; sideDish: string | null; allowDouble: boolean }
type StudentOption = { id: string; name: string }

export function ParentMealsClient({ weekStart, menus }: { weekStart: string; menus: Menu[] }) {
  const monday = dayjs(weekStart)
  const menuMap = new Map(menus.map(m => [m.dayOfWeek, m]))
  const currentDayOfWeek = dayjs().day()
  const [todayMenu, setTodayMenu] = useState<TodayMenu | null>(null)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [choices, setChoices] = useState<Record<string, boolean | null>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetch('/api/parent/meal-choice').then(r => r.json()).then(data => {
      if (data.menu) setTodayMenu(data.menu)
      if (data.students) setStudents(data.students)
      const map: Record<string, boolean | null> = {}
      data.students?.forEach((s: StudentOption) => { map[s.id] = null })
      data.choices?.forEach((c: { studentId: string; eating: boolean }) => { map[c.studentId] = c.eating })
      setChoices(map)
    }).catch(() => setLoadError(true))
  }, [])

  const handleChoice = async (studentId: string, eating: boolean) => {
    if (!todayMenu || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/parent/meal-choice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, menuId: todayMenu.id, eating }),
      })
      if (res.ok) {
        setChoices(prev => ({ ...prev, [studentId]: eating }))
        message.success(eating ? '已选择用餐' : '已选择不用餐', 1)
      } else message.error('提交失败')
    } catch { message.error('网络错误') }
    finally { setSubmitting(false) }
  }

  return (
    <div>
      {loadError && (
        <div style={{ background: '#fdeceb', border: '1px solid #E24B4A', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#E24B4A', fontSize: 12 }}>
          就餐数据加载失败，请刷新页面重试
        </div>
      )}

      {/* Promise banner (compact on mobile) */}
      <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #E87545 100%)', boxShadow: '0 6px 24px rgba(102,126,234,.25)' }}>
        <div style={{ padding: '18px 18px 16px' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>牧哲学堂 · 就餐承诺</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, color: 'rgba(255,255,255,.9)' }}>
            绝不赚取孩子一分钱饭钱。即使只订一份饭没吃饱，也会带孩子再次购买，直到孩子吃饱为止。
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['吃饱吃好', '食品安全', '用心服务'].map(item => (
              <span key={item} style={{ padding: '3px 10px', borderRadius: 16, background: 'rgba(255,255,255,.15)', fontSize: 11, color: '#fff' }}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Today lunch card (lightweight) */}
      {todayMenu ? (
        <Card style={{ marginBottom: 14, borderRadius: 14, border: '2px solid #E87545', background: 'rgba(232,117,69,.03)' }} styles={{ body: { padding: '14px 16px' } }}>
          <Text type="secondary" style={{ fontSize: 11 }}>今日午餐</Text>
          <div style={{ fontSize: 20, fontWeight: 700, margin: '4px 0' }}>{todayMenu.mainDish}</div>
          <Text type="secondary" style={{ fontSize: 13 }}>{todayMenu.sideDish || '菜品待补充'}</Text>
        </Card>
      ) : (
        <Card style={{ marginBottom: 14, borderRadius: 14, border: '1px solid rgba(0,0,0,.08)' }} styles={{ body: { padding: '14px 16px' } }}>
          <Text type="secondary" style={{ fontSize: 13 }}>今日菜单待公布</Text>
          <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 4 }}>老师/管理员发布后，家长可在这里确认是否用餐</div>
        </Card>
      )}

      {/* Student meal choices (compact inline rows) */}
      {students.length > 0 && todayMenu && (
        <Card title="孩子用餐选择" style={{ marginBottom: 14, borderRadius: 14 }} styles={{ body: { padding: '0 16px 12px' }, header: { borderBottom: 'none', paddingBottom: 0 } }}>
          {students.map(student => (
            <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
              <div>
                <Text strong style={{ fontSize: 14 }}>{student.name}</Text>
                {choices[student.id] !== null && choices[student.id] !== undefined && (
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    {choices[student.id] ? '已选：用餐' : '已选：不用餐'}
                  </Text>
                )}
              </div>
              <div style={{ display: 'flex', border: '1px solid #E8E2DA', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => handleChoice(student.id, false)} disabled={submitting} style={{
                  padding: '6px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
                  background: choices[student.id] === false ? '#f5f5f5' : '#fff', color: choices[student.id] === false ? '#E24B4A' : '#7A869A',
                  fontWeight: choices[student.id] === false ? 600 : 400,
                }}>不用餐</button>
                <button onClick={() => handleChoice(student.id, true)} disabled={submitting} style={{
                  padding: '6px 16px', fontSize: 13, border: 'none', borderLeft: '1px solid #E8E2DA', cursor: 'pointer',
                  background: choices[student.id] === true ? '#E8784A' : '#fff', color: choices[student.id] === true ? '#fff' : '#7A869A',
                  fontWeight: choices[student.id] === true ? 600 : 400,
                }}>用餐</button>
              </div>
            </div>
          ))}
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 10, textAlign: 'center' }}>
            选择结果将同步至管理端，可在截止时间前修改
          </Text>
        </Card>
      )}
      {students.length === 0 && todayMenu && (
        <Card style={{ marginBottom: 14, borderRadius: 14, textAlign: 'center', padding: 20 }}>
          <Text type="secondary">暂无绑定学员</Text>
          <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 4 }}>如信息有误，请联系校区老师</div>
        </Card>
      )}

      {/* Weekly menu (compact list on mobile) */}
      <Card title={<span>📅 本周菜单</span>} style={{ borderRadius: 14 }} styles={{ header: { borderBottom: 'none' }, body: { padding: '0 16px 12px' } }}>
        {WEEKDAYS.map((day, i) => {
          const dow = i + 1
          const menu = menuMap.get(dow)
          const isToday = dow === currentDayOfWeek
          return (
            <div key={day} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.04)',
              background: isToday ? 'rgba(232,117,69,.06)' : 'transparent', borderRadius: isToday ? 8 : 0, margin: isToday ? '4px -8px' : 0, paddingLeft: isToday ? 8 : 0, paddingRight: isToday ? 8 : 0,
            }}>
              <Text strong style={{ fontSize: 13, minWidth: 32 }}>{day}</Text>
              <Text type="secondary" style={{ fontSize: 11, minWidth: 52 }}>{monday.add(i, 'day').format('M月D日')}</Text>
              <div style={{ flex: 1 }}>
                {menu ? <Text style={{ fontSize: 13 }}>{menu.mainDish}</Text> : <Text type="secondary" style={{ fontSize: 12 }}>菜单待公布</Text>}
                {menu?.sideDish && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{menu.sideDish}</Text>}
              </div>
              {isToday && <span style={{ fontSize: 10, color: '#fff', background: '#E87545', padding: '1px 6px', borderRadius: 8 }}>今日</span>}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
