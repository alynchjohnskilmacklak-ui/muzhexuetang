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
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
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
  const [loaded, setLoaded] = useState(false)
  const [showAssuranceDetail, setShowAssuranceDetail] = useState(false)

  useEffect(() => {
    fetch('/api/parent/meal-choice').then(r => r.json()).then(data => {
      if (data.menu) setTodayMenu(data.menu)
      if (data.students) setStudents(data.students)
      const map: Record<string, boolean | null> = {}
      data.students?.forEach((s: StudentOption) => { map[s.id] = null })
      data.choices?.forEach((c: { studentId: string; eating: boolean }) => { map[c.studentId] = c.eating })
      setChoices(map)
    }).catch(() => setLoadError(true)).finally(() => setLoaded(true))
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
        toast.success(eating ? '已选就餐，后厨已接收备餐' : '已选择不用餐')
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

      {/* 就餐保障（紧凑首屏设计 + 可展开详情） */}
      <div style={{
        position: 'relative',
        marginBottom: 12,
        borderRadius: 14,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #16392A 0%, #1E4D3A 55%, #2E6B50 100%)',
        boxShadow: '0 4px 16px rgba(22, 57, 42, 0.18)',
      }}>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SafetyCertificateOutlined style={{ color: '#F3D98F', fontSize: 16 }} />
              <div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#F3D98F', letterSpacing: 0.5 }}>
                  牧哲学堂 · 就餐保障
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)', marginLeft: 8 }}>
                  不赚饭钱 · 免费续饭 · 每日留样
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAssuranceDetail(v => !v)}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(243,217,143,0.3)',
                color: '#F3D98F',
                borderRadius: 9999,
                padding: '3px 9px',
                fontSize: 11,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {showAssuranceDetail ? '收起保障' : '保障承诺'}
            </button>
          </div>

          {/* 可展开的四大核心承诺 */}
          {showAssuranceDetail && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 9px' }}>
                <CoffeeOutlined style={{ color: '#F3D98F', fontSize: 14 }} />
                <div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>吃饱吃好</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>不赚饭钱，不够免费续</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 9px' }}>
                <SafetyCertificateOutlined style={{ color: '#F3D98F', fontSize: 14 }} />
                <div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>食品安全</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>每日留样，安全可溯</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 9px' }}>
                <CheckCircleOutlined style={{ color: '#F3D98F', fontSize: 14 }} />
                <div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>用心服务</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>随时沟通，按需调整</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 9px' }}>
                <HeartOutlined style={{ color: '#F3D98F', fontSize: 14 }} />
                <div>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>困难帮扶</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>家庭困难可申请支持</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 今日午餐卡片 */}
      {!loaded && !loadError ? (
        <CardSkeleton rows={1} />
      ) : todayMenu ? (
        <Card style={{ marginBottom: 12, borderRadius: 16, border: '2px solid rgba(217,179,106,0.5)', background: 'rgba(217,179,106,0.05)', boxShadow: '0 4px 12px rgba(217,179,106,0.12)' }} styles={{ body: { padding: '15px 18px' } }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CoffeeOutlined style={{ color: '#A6781F', fontSize: 14 }} />
              <Text style={{ color: '#A6781F', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>今日午餐</Text>
            </div>
            <span style={{ fontSize: 11, color: '#8A7A68' }}>现做现配 · 热菜供应</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '3px 0' }}>{todayMenu.mainDish}</div>
          <Text style={{ fontSize: 13, color: '#4B5563' }}>{todayMenu.sideDish || '菜品新鲜搭配，营养均衡'}</Text>
        </Card>
      ) : (
        <Card style={{ marginBottom: 12, borderRadius: 16, border: '1px solid #EDE5DA' }} styles={{ body: { padding: '16px 18px' } }}>
          <Text style={{ fontSize: 14, color: '#4B5563', fontWeight: 500 }}>今日菜单待公布</Text>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>老师/管理员发布后，家长可在这里确认是否用餐</div>
        </Card>
      )}

      {/* Student meal choices (compact inline rows) */}
      {!loaded && !loadError && <CardSkeleton rows={2} />}
      {students.length > 0 && todayMenu && (
        <Card title="孩子用餐选择" style={{ marginBottom: 14, borderRadius: 16 }} styles={{ body: { padding: '0 16px 14px' }, header: { borderBottom: 'none', paddingBottom: 0 } }}>
          {students.map((student, studentIndex) => {
            const hasChoice = choices[student.id] !== null && choices[student.id] !== undefined
            const isEating = choices[student.id] === true
            return (
              <div key={student.id} className="stagger-item" style={{ padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,.05)', animationDelay: `${Math.min(studentIndex, 8) * 40}ms` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <Text strong style={{ fontSize: 15, color: '#1E293B' }}>{student.name}</Text>
                    {hasChoice ? (
                      <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontSize: 11,
                          borderRadius: 9999,
                          padding: '1px 8px',
                          background: isEating ? '#E8F5E9' : '#FFF1F0',
                          color: isEating ? '#2E7D32' : '#C62828',
                          fontWeight: 600,
                        }}>
                          {isEating ? '✅ 已选：用餐' : '❌ 已选：不用餐'}
                        </span>
                      </div>
                    ) : (
                      <div style={{ marginTop: 2 }}>
                        <span style={{ fontSize: 11, borderRadius: 9999, padding: '1px 8px', background: '#FFF7E6', color: '#D46B08', fontWeight: 600 }}>
                          ⏳ 待确认（请在今日10:30前选择）
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleChoice(student.id, false)}
                      disabled={submitting}
                      style={{
                        padding: '6px 14px', fontSize: 12.5, borderRadius: 999, border: '1px solid', cursor: 'pointer',
                        background: choices[student.id] === false ? '#FFF1F0' : '#ffffff',
                        borderColor: choices[student.id] === false ? '#FFA39E' : 'rgba(60,80,72,.18)',
                        color: choices[student.id] === false ? '#CF1322' : '#7A869A',
                        fontWeight: choices[student.id] === false ? 700 : 500,
                        transition: 'all .16s ease',
                      }}
                    >
                      不用餐
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChoice(student.id, true)}
                      disabled={submitting}
                      style={{
                        padding: '6px 16px', fontSize: 12.5, borderRadius: 999, border: '1px solid', cursor: 'pointer',
                        background: choices[student.id] === true ? '#14574D' : '#ffffff',
                        borderColor: choices[student.id] === true ? '#14574D' : 'rgba(60,80,72,.18)',
                        color: choices[student.id] === true ? '#ffffff' : '#14574D',
                        fontWeight: choices[student.id] === true ? 700 : 600,
                        boxShadow: choices[student.id] === true ? '0 2px 8px rgba(20,87,77,.22)' : 'none',
                        transition: 'all .16s ease',
                      }}
                    >
                      用餐
                    </button>
                  </div>
                </div>

                {/* 用餐安心提示卡 */}
                {isEating && (
                  <div style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'rgba(20, 87, 77, 0.05)',
                    border: '1px dashed rgba(20, 87, 77, 0.2)',
                    fontSize: 11.5,
                    color: '#14574D',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span>👨‍🍳 后厨已收到就餐名单，中午将为孩子准备热菜热饭，不够随时免费添。</span>
                  </div>
                )}
              </div>
            )
          })}
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 10, textAlign: 'center' }}>
            选择结果将实时同步至校区后厨备餐表，可在截止时间前修改
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
                borderRadius: 14, padding: '11px 13px',
                background: isToday ? '#FFFDF8' : '#FAF7F1',
                border: isToday ? '1.5px solid rgba(201,164,92,0.65)' : '1px solid rgba(0,0,0,0.06)',
                boxShadow: isToday ? '0 4px 14px rgba(201,164,92,0.14)' : '0 1px 4px rgba(0,0,0,0.02)',
                cursor: canOpen ? 'pointer' : 'default',
                transition: 'all .18s cubic-bezier(0.2, 0.8, 0.2, 1)',
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
                <div key={day} onClick={() => router.push(`/parent/meals/${menu!.id}`)} className="pressable stagger-item" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  {card}
                </div>
              )
            }
            return <div key={day} className="stagger-item" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>{card}</div>
          })}
        </div>
      </div>
    </div>
  )
}
