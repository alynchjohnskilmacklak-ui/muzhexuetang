'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Col, Row, Tag, Typography, message } from 'antd'
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六']

type Menu = {
  id: string
  dayOfWeek: number
  mainDish: string
  sideDish: string | null
}

type TodayMenu = {
  id: string
  mainDish: string
  sideDish: string | null
  allowDouble: boolean
}

type StudentOption = {
  id: string
  name: string
}

export function ParentMealsClient({ weekStart, menus }: { weekStart: string; menus: Menu[] }) {
  const monday = dayjs(weekStart)
  const weekRange = `${monday.format('MM月DD日')} - ${monday.add(5, 'day').format('MM月DD日')}`
  const menuMap = new Map(menus.map((menu) => [menu.dayOfWeek, menu]))
  const currentDayOfWeek = dayjs().day()
  const [todayMenu, setTodayMenu] = useState<TodayMenu | null>(null)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [choices, setChoices] = useState<Record<string, boolean | null>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetch('/api/parent/meal-choice')
      .then((res) => res.json())
      .then((data) => {
        if (data.menu) setTodayMenu(data.menu)
        if (data.students) setStudents(data.students)
        const map: Record<string, boolean | null> = {}
        data.students?.forEach((student: StudentOption) => {
          map[student.id] = null
        })
        data.choices?.forEach((choice: { studentId: string; eating: boolean }) => {
          map[choice.studentId] = choice.eating
        })
        setChoices(map)
      })
      .catch(() => { setLoadError(true) })
  }, [])

  const handleChoice = async (studentId: string, eating: boolean) => {
    if (!todayMenu) return
    setSubmitting((prev) => ({ ...prev, [studentId]: true }))
    try {
      const res = await fetch('/api/parent/meal-choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, menuId: todayMenu.id, eating }),
      })
      if (res.ok) {
        setChoices((prev) => ({ ...prev, [studentId]: eating }))
        message.success(eating ? '已选择用餐' : '已选择不用餐')
      } else {
        message.error('提交失败，请重试')
      }
    } catch {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting((prev) => ({ ...prev, [studentId]: false }))
    }
  }

  return (
    <div>
      {loadError && (
        <div style={{ background: '#fdeceb', border: '1px solid #E24B4A', borderRadius: 8, padding: '8px 14px', marginBottom: 16, color: '#E24B4A', fontSize: 13 }}>
          就餐数据加载失败，请刷新页面重试
        </div>
      )}
      <div style={{
        position: 'relative',
        marginBottom: 24,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #E87545 100%)',
        boxShadow: '0 8px 32px rgba(102,126,234,.3)',
      }}>
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,.08)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -60,
          left: -20,
          width: 160,
          height: 160,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,.05)',
        }} />

        <div style={{ position: 'relative', padding: '28px 28px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.8)' }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 1, textShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
                牧哲学堂 · 就餐承诺
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
                MUZHE ACADEMY DINING COMMITMENT
              </div>
            </div>
          </div>

          <div style={{ fontSize: 13.5, lineHeight: 2, color: 'rgba(255,255,255,.92)', letterSpacing: 0.3 }}>
            <p style={{ margin: '0 0 10px' }}>
              牧哲学堂始终坚持以学生为中心，以服务家长为宗旨，重视孩子在校期间的饮食安全与用餐保障。
              <span style={{ fontWeight: 600, color: '#fff' }}>我们郑重承诺：绝不会赚取孩子一分钱饭钱</span>，
              所有就餐安排均以保障孩子吃饱、吃好、吃得安全为基本原则。
            </p>
            <p style={{ margin: '0 0 10px' }}>
              在订餐过程中，如遇到饭菜份数不足等特殊情况，我们会优先保障孩子用餐。
              即使孩子只订了一份饭但没有吃饱，机构负责人也会及时关注，并根据实际情况带孩子再次购买饭食，
              <span style={{ fontWeight: 600, color: '#fff' }}>直到孩子吃饱为止</span>。
            </p>
            <p style={{ margin: '0 0 10px' }}>
              为保障食品安全，牧哲学堂每日饭菜均会按要求进行留样。
              如家长对饭菜质量、食品安全或孩子用餐情况有任何疑问，请及时联系负责人，
              我们一定会积极沟通、认真处理，并全力配合家长做好相关工作。
            </p>
            <p style={{ margin: '0 0 10px' }}>
              牧哲学堂不仅关注孩子的学习，也关心每一个家庭的实际情况。
              如果家长在孩子学习、生活或成长过程中需要帮助，请不要不好意思与我们沟通。
              <span style={{ fontWeight: 600, color: '#fff' }}>对于品学兼优、积极上进且家庭确有困难的学生，
              我们也会根据实际情况提供力所能及的支持，尽可能帮助孩子顺利完成学业，直至高中毕业。</span>
            </p>

            <div style={{
              marginTop: 16,
              padding: '14px 16px',
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,.12)',
              borderLeft: '4px solid rgba(255,255,255,.6)',
              backdropFilter: 'blur(10px)',
            }}>
              <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: '#fff', lineHeight: 1.9, fontWeight: 500 }}>
                &quot;世界是你们的，也是我们的，但是归根结底是你们的。你们青年人朝气蓬勃，正在兴旺时期，
                好像早晨八九点钟的太阳。<strong>希望寄托在你们身上。</strong>&quot;
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,.7)', textAlign: 'right' }}>
                — 毛泽东
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {['吃饱吃好', '食品安全', '用心服务', '尽职担当'].map((item) => (
              <div key={item} style={{
                padding: '4px 12px',
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,.15)',
                border: '1px solid rgba(255,255,255,.3)',
                fontSize: 12,
                color: '#fff',
                backdropFilter: 'blur(8px)',
              }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>🍽️</span>
          <Title level={5} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>本周菜单</Title>
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {weekRange} &nbsp;·&nbsp; 菜单由管理员每周更新
        </Text>
      </div>

      <Row gutter={[12, 12]}>
        {WEEKDAYS.map((weekday, index) => {
          const dayOfWeek = index + 1
          const menu = menuMap.get(dayOfWeek)
          const isToday = dayOfWeek === currentDayOfWeek
          return (
            <Col key={weekday} xs={24} md={12} xl={8}>
              <Card
                style={{
                  borderRadius: 14,
                  border: isToday ? '2px solid #E87545' : '1px solid rgba(0,0,0,.08)',
                  backgroundColor: isToday ? 'rgba(232,117,69,.04)' : '#fff',
                  boxShadow: isToday ? '0 4px 16px rgba(232,117,69,.12)' : '0 1px 4px rgba(0,0,0,.04)',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 160,
                }}
                styles={{ body: { padding: '14px 16px' } }}
              >
                {isToday && (
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    padding: '2px 8px',
                    borderRadius: 10,
                    backgroundColor: '#E87545',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    今日
                  </div>
                )}
                <Text strong>{weekday}</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{monday.add(index, 'day').format('M月D日')}</Text>
                <div style={{ height: 1, background: 'rgba(0,0,0,.06)', margin: '10px 0' }} />
                {menu ? (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{menu.mainDish}</div>
                    <Text type="secondary" style={{ fontSize: 13 }}>{menu.sideDish || '菜品待补充'}</Text>
                  </>
                ) : (
                  <Text type="secondary">菜单待公布</Text>
                )}

                {isToday && todayMenu && (
                  <Card title="今日用餐选择" style={{ marginTop: 16, borderRadius: 12 }} styles={{ body: { padding: '16px 20px' } }}>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
                      今日午餐：<Text strong>{todayMenu.mainDish}</Text>
                      {todayMenu.sideDish && <Text type="secondary"> · {todayMenu.sideDish}</Text>}
                    </Text>

                    {students.length === 0 ? (
                      <Text type="secondary">暂无绑定学员</Text>
                    ) : (
                      students.map((student) => (
                        <div
                          key={student.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '10px 0',
                            borderBottom: '1px solid rgba(0,0,0,.06)',
                          }}
                        >
                          <Text strong style={{ fontSize: 14 }}>{student.name}</Text>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {choices[student.id] !== null && choices[student.id] !== undefined && (
                              <Tag color={choices[student.id] ? 'success' : 'default'} style={{ fontSize: 12 }}>
                                {choices[student.id] ? '已选用餐' : '已选不用餐'}
                              </Tag>
                            )}
                            <Button
                              size="small"
                              type={choices[student.id] === true ? 'primary' : 'default'}
                              loading={submitting[student.id]}
                              icon={<CheckCircleFilled />}
                              style={choices[student.id] === true ? { background: '#27a644', borderColor: '#27a644' } : {}}
                              onClick={() => handleChoice(student.id, true)}
                            >
                              用餐
                            </Button>
                            <Button
                              size="small"
                              type={choices[student.id] === false ? 'primary' : 'default'}
                              loading={submitting[student.id]}
                              icon={<CloseCircleFilled />}
                              danger={choices[student.id] === false}
                              onClick={() => handleChoice(student.id, false)}
                            >
                              不用餐
                            </Button>
                          </div>
                        </div>
                      ))
                    )}

                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 12 }}>
                      选择结果将同步至管理端就餐汇总，可在截止时间前修改
                    </Text>
                  </Card>
                )}
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
