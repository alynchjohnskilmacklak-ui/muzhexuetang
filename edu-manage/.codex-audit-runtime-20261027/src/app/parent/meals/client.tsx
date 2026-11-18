'use client'

import { useEffect, useState } from 'react'
import { Card, Typography } from 'antd'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { fmtDate } from '@/lib/format-date'
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  CoffeeOutlined,
  HeartOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { useRouter } from 'next/navigation'

const { Text } = Typography
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六']

type Menu = {
  id: string | null
  dayOfWeek: number
  mainDish: string
  sideDish: string | null
  notes: string | null
  image: string | null
  description: string | null
  source: 'date' | 'template'
}
type TodayMenu = { id: string; mainDish: string; sideDish: string | null; allowDouble: boolean }
type StudentOption = { id: string; name: string }

export function ParentMealsClient({ weekStart, menus }: { weekStart: string; menus: Menu[] }) {
  const router = useRouter()
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
        toast.success(eating ? '已选择用餐' : '已选择不用餐')
      } else toast.error('提交失败')
    } catch { toast.error('网络错误') }
    finally { setSubmitting(false) }
  }

  return (
    <div>
      {loadError && (
        <div style={{ background: '#fdeceb', border: '1px solid #E24B4A', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#E24B4A', fontSize: 12 }}>
          就餐数据加载失败，请刷新页面重试
        </div>
      )}

      {/* 就餐承诺（精简版） */}
      <div style={{
        position: 'relative',
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #16392A 0%, #1E4D3A 55%, #2E6B50 100%)',
        boxShadow: '0 8px 24px rgba(22, 57, 42, 0.25)',
      }}>
        {/* 装饰 */}
        <div style={{ position: 'absolute', right: -30, top: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', right: 20, bottom: -50, width: 100, height: 100, borderRadius: '50%', background: 'rgba(217,179,106,0.12)' }} />

        <div style={{ position: 'relative', padding: '18px 18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: '#D9B36A' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#F3D98F', letterSpacing: 1 }}>牧哲学堂 · 就餐保障</div>
          </div>

          {/* 四个核心承诺，用图标+短句，不用大段文字 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 10px' }}>
              <CoffeeOutlined style={{ color: '#F3D98F', fontSize: 16 }} />
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>吃饱吃好</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10.5 }}>不赚饭钱，不够免费续</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 10px' }}>
              <SafetyCertificateOutlined style={{ color: '#F3D98F', fontSize: 16 }} />
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>食品安全</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10.5 }}>每日留样，安全可追溯</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 10px' }}>
              <CheckCircleOutlined style={{ color: '#F3D98F', fontSize: 16 }} />
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>用心服务</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10.5 }}>随时沟通，及时响应</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 10px' }}>
              <HeartOutlined style={{ color: '#F3D98F', fontSize: 16 }} />
              <div>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>困难帮扶</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10.5 }}>家庭困难学生可申请支持</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 今日午餐卡片 */}
      {todayMenu ? (
        <Card style={{ marginBottom: 14, borderRadius: 16, border: '2px solid rgba(217,179,106,0.5)', background: 'rgba(217,179,106,0.05)', boxShadow: '0 4px 12px rgba(217,179,106,0.12)' }} styles={{ body: { padding: '16px 18px' } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <CoffeeOutlined style={{ color: '#A6781F', fontSize: 13 }} />
            <Text style={{ color: '#A6781F', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>今日午餐</Text>
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, color: '#111827', margin: '4px 0' }}>{todayMenu.mainDish}</div>
          <Text style={{ fontSize: 13, color: '#4B5563' }}>{todayMenu.sideDish || '菜品新鲜搭配，营养均衡'}</Text>
        </Card>
      ) : (
        <Card style={{ marginBottom: 14, borderRadius: 16, border: '1px solid #EDE5DA' }} styles={{ body: { padding: '16px 18px' } }}>
          <Text style={{ fontSize: 14, color: '#4B5563', fontWeight: 500 }}>今日菜单待公布</Text>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>老师/管理员发布后，家长可在这里确认是否用餐</div>
        </Card>
      )}

      {/* Student meal choices (compact inline rows) */}
      {students.length > 0 && todayMenu && (
        <Card title="孩子用餐选择" style={{ marginBottom: 14, borderRadius: 16 }} styles={{ body: { padding: '0 16px 12px' }, header: { borderBottom: 'none', paddingBottom: 0 } }}>
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
                  background: choices[student.id] === true ? 'var(--color-primary)' : '#fff', color: choices[student.id] === true ? 'var(--color-on-primary)' : 'var(--color-ink-subtle)',
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
        <Card style={{ marginBottom: 14, borderRadius: 14 }}>
          <GuidedEmpty
            compact
            title="还没有可选餐的孩子"
            description="绑定学员后，孩子当天的用餐选择会显示在这里；如绑定信息有误，请联系校区老师。"
            actionLabel="给老师留言"
            onAction={() => window.location.assign('/parent/messages')}
          />
        </Card>
      )}

      {/* ===== 本周菜单（卡片式，可点击查看详情） ===== */}
      <div style={{
        borderRadius: 16, background: 'rgba(255,255,255,0.95)',
        border: '1px solid #EDE5DA', boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        padding: '16px 16px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <CalendarOutlined style={{ color: '#1E4D3A', fontSize: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>本周菜单</Text>
        </div>
        {/* 注释：提示可以点击查看详情 */}
        <Text style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
          点击任意菜品卡片，可查看菜品照片与详细介绍
        </Text>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {WEEKDAYS.map((day, i) => {
            const dow = i + 1
            const menu = menuMap.get(dow)
            const isToday = dow === currentDayOfWeek
            const hasMenu = !!menu && menu.mainDish && menu.mainDish !== '菜单待公布'
            const canOpen = hasMenu && menu?.id

            const card = (
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 12,
                borderRadius: 14, padding: '10px 12px',
                background: isToday ? 'rgba(217,179,106,0.10)' : '#FAF7F1',
                border: isToday ? '1.5px solid rgba(217,179,106,0.55)' : '1px solid #F0E9DD',
                cursor: canOpen ? 'pointer' : 'default',
                transition: 'all .18s ease',
                overflow: 'hidden',
              }}>
                {/* 菜品缩略图 */}
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: menu?.image ? '#eee' : 'linear-gradient(135deg, #1E4D3A, #2E6B50)',
                }}>
                  {menu?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={menu.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <CoffeeOutlined style={{ fontSize: 22, color: hasMenu ? 'rgba(243,217,143,0.9)' : 'rgba(255,255,255,0.35)' }} />
                  )}
                </div>

                {/* 文字信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong style={{ fontSize: 14, color: '#111827', minWidth: 30 }}>{day}</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>{fmtDate(monday.add(i, 'day').toDate())}</Text>
                    {isToday && (
                      <span style={{
                        fontSize: 10, color: '#fff', background: '#A6781F',
                        padding: '1px 7px', borderRadius: 8, fontWeight: 600,
                      }}>今日</span>
                    )}
                  </div>
                  {hasMenu ? (
                    <>
                      <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: 600, display: 'block', marginTop: 2 }}>
                        {menu!.mainDish}
                      </Text>
                      {menu!.sideDish && (
                        <Text style={{ fontSize: 11.5, color: '#6B7280', display: 'block', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {menu!.sideDish}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={{ fontSize: 12.5, color: '#9CA3AF', display: 'block', marginTop: 2 }}>
                      菜单待公布
                    </Text>
                  )}
                </div>

                {/* 右侧箭头 / 查看详情 */}
                {canOpen ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    fontSize: 11, fontWeight: 600, color: '#A6781F',
                    background: 'rgba(217,179,106,0.18)', borderRadius: 999, padding: '5px 9px',
                  }}>
                    详情 <ArrowRightOutlined style={{ fontSize: 10 }} />
                  </span>
                ) : null}
              </div>
            )

            if (canOpen) {
              return (
                <div key={day} onClick={() => router.push(`/parent/meals/${menu!.id}`)} className="pressable">
                  {card}
                </div>
              )
            }
            return <div key={day}>{card}</div>
          })}
        </div>
      </div>
    </div>
  )
}
