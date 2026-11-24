'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Radio, Tag, Typography } from 'antd'
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  EditOutlined,
  SendOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { fmtDateTime, fmtFull } from '@/lib/format-date'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { resolveTier, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Menu = {
  id: string
  mainDish: string
  sideDish: string | null
  allowDouble: boolean
  notes: string | null
}
type Student = { id: string; name: string; grade: string | null; school?: string | null }
type MealGroup = {
  id: string
  name: string
  courseName: string
  courseType: string
  studentCount: number
  students: Student[]
}
type Detail = { studentId: string; studentName: string; portion: 'single' | 'double' }
type Report = {
  id: string
  totalCount: number
  riceSingle: number
  riceDouble: number
  submittedAt: string
  details: Detail[]
}

export function TeacherMealsClient({
  menu,
  mealGroups,
  report,
  reportDate,
}: {
  menu: Menu | null
  mealGroups: MealGroup[]
  report: Report | null
  reportDate: string
}) {
  const isMobile = useIsMobile() ?? false
  const [currentReport, setCurrentReport] = useState(report)
  const [editing, setEditing] = useState(!report)
  const [submitting, setSubmitting] = useState(false)

  // 读取教师梯队主题
  const { data: dashData } = useSWR('/api/teacher/dashboard', fetcher)
  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const theme = TIER_THEME[currentTier]

  const [portions, setPortions] = useState<Record<string, 'none' | 'single' | 'double'>>(() => {
    const selected = Object.fromEntries((report?.details || []).map((d) => [d.studentId, d.portion]))
    const allStudents = mealGroups.flatMap((g) => g.students)
    return Object.fromEntries(allStudents.map((s) => [s.id, selected[s.id] || 'none']))
  })

  const draftKey = `teacher_meals_draft_${reportDate}`

  useEffect(() => {
    if (!report && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(draftKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === 'object') {
            setPortions((prev) => ({ ...prev, ...parsed }))
            toast.info('已恢复上次未提交的就餐勾选草稿', { duration: 2500 })
          }
        }
      } catch {}
    }
  }, [report, draftKey])

  useEffect(() => {
    if (editing && typeof window !== 'undefined') {
      try {
        localStorage.setItem(draftKey, JSON.stringify(portions))
      } catch {}
    }
  }, [portions, editing, draftKey])

  const allStudents = useMemo(() => mealGroups.flatMap((g) => g.students), [mealGroups])
  const details = useMemo(() => allStudents.flatMap((s) => {
    const p = portions[s.id]
    return p === 'single' || p === 'double' ? [{ studentId: s.id, studentName: s.name, portion: p }] : []
  }), [allStudents, portions])

  const stats = {
    total: details.length,
    single: details.filter((d) => d.portion === 'single').length,
    double: details.filter((d) => d.portion === 'double').length,
  }

  const setGroupAll = (students: Student[], value: 'none' | 'single' | 'double') => {
    setPortions((prev) => {
      const next = { ...prev }
      for (const s of students) next[s.id] = value
      return next
    })
  }

  const groupStats = (students: Student[]) => {
    let total = 0
    let single = 0
    let double = 0
    for (const s of students) {
      const p = portions[s.id]
      if (p === 'single') { total++; single++ }
      else if (p === 'double') { total++; double++ }
    }
    return { total, single, double }
  }

  const submit = async () => {
    if (!menu) return
    setSubmitting(true)
    try {
      const res = await fetch(currentReport ? `/api/meals/report/${currentReport.id}` : '/api/meals/report', {
        method: currentReport ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuId: menu.id, reportDate, details }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'submit failed')
      try {
        localStorage.removeItem(draftKey)
      } catch {}
      setCurrentReport(data)
      setEditing(false)
      toast.success(currentReport ? '就餐上报已成功更新' : '就餐上报已成功提交')
    } catch {
      toast.error('就餐上报提交失败，请检查网络后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (!menu) {
    return (
      <BrandEmpty
        title="今日膳食菜单尚未设置"
        hint="校区厨房发布今日菜谱后，即可为班级学员勾选上报就餐信息"
        icon={<CoffeeOutlined />}
      />
    )
  }

  return (
    <div className="teacher-meals-wrap">
      {/* 沉浸式梯队主题 Hero 看板 */}
      <div
        className="meals-hero-card"
        style={{
          background: theme.heroBg,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        }}
      >
        <div className="hero-head-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="hero-badge" style={{ background: theme.accent, color: '#1a1201' }}>
                {theme.roleTag || theme.name}
              </span>
              <span className="hero-subtag">
                <CoffeeOutlined /> 学堂营养餐点管理
              </span>
            </div>
            <h2 className="hero-title">{fmtFull(reportDate)} 就餐上报</h2>
            <p className="hero-desc">
              精准统计班级学员就餐意向与主食分量 · 校区食堂按需备餐 · 保障食品安全与膳食营养
            </p>
          </div>
          {currentReport && !editing && (
            <div className="hero-status-pill">
              <CheckCircleFilled style={{ color: '#52c41a' }} />
              <span>今日已完成上报</span>
            </div>
          )}
        </div>

        {/* 3 大核心指标微卡 */}
        <div className="meals-stats-grid">
          <div className="stat-card">
            <div className="stat-label">就餐学员人数</div>
            <div className="stat-value">
              {currentReport && !editing ? currentReport.totalCount : stats.total} <span className="stat-unit">人</span>
            </div>
            <div className="stat-desc">在读总计 {allStudents.length} 人</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">标准单份主食</div>
            <div className="stat-value">
              {currentReport && !editing ? currentReport.riceSingle : stats.single} <span className="stat-unit">份</span>
            </div>
            <div className="stat-desc">常规主食分量</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">双份米饭主食</div>
            <div className="stat-value">
              {currentReport && !editing ? currentReport.riceDouble : stats.double} <span className="stat-unit">份</span>
            </div>
            <div className="stat-desc">{menu.allowDouble ? '今日已支持双份' : '今日未开放双份'}</div>
          </div>
        </div>
      </div>

      {/* 今日膳食菜单卡片 */}
      <div className="meals-menu-card">
        <div className="menu-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="menu-food-icon">🍱</span>
            <span style={{ fontSize: 15, fontWeight: 750, color: '#1a1201' }}>今日营养膳食菜单</span>
          </div>
          {menu.allowDouble ? (
            <Tag color="orange" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>
              允许按需加双份主食
            </Tag>
          ) : (
            <Tag style={{ margin: 0, borderRadius: 6 }}>标准单份主食</Tag>
          )}
        </div>
        <div className="menu-card-body">
          <div className="menu-main-dish">{menu.mainDish}</div>
          <div className="menu-side-dish">配菜 / 汤品：{menu.sideDish || '新鲜时蔬及每日营养靓汤'}</div>
          {menu.notes && (
            <div className="menu-notes">
              <strong>温馨提示：</strong>{menu.notes}
            </div>
          )}
        </div>
      </div>

      {/* 就餐名单提报 / 已提交查看 */}
      <div className="meals-action-card">
        <div className="action-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamOutlined style={{ color: theme.primary, fontSize: 17 }} />
            <span style={{ fontSize: 15, fontWeight: 750, color: '#1a1201' }}>
              {currentReport && !editing ? '今日已提交就餐名单' : '班级学员就餐勾选'}
            </span>
          </div>
          {currentReport && !editing && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
              style={{ borderRadius: 8, height: 32, fontSize: 12.5 }}
            >
              重新调整名单
            </Button>
          )}
        </div>

        {currentReport && !editing ? (
          <div className="submitted-view-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7a7060', fontSize: 12.5, marginBottom: 12 }}>
              <ClockCircleOutlined />
              <span>提交时间：{fmtDateTime(currentReport.submittedAt)}</span>
            </div>
            <div className="submitted-student-chips">
              {(currentReport.details || []).map((d) => (
                <div key={d.studentId} className="submitted-chip">
                  <UserOutlined style={{ color: theme.primary }} />
                  <span className="chip-name">{d.studentName}</span>
                  <span className={`chip-portion ${d.portion}`}>
                    {d.portion === 'double' ? '双份' : '单份'}
                  </span>
                </div>
              ))}
              {(!currentReport.details || currentReport.details.length === 0) && (
                <div style={{ color: '#8c8070', fontSize: 13, padding: '12px 0' }}>今日无学员就餐</div>
              )}
            </div>
          </div>
        ) : (
          <div className="editing-groups-container">
            {mealGroups.map((group, groupIndex) => {
              const gs = groupStats(group.students)
              return (
                <div key={group.id} className="meal-group-block">
                  <div className="meal-group-header">
                    <div>
                      <span className="group-title">{group.courseName}</span>
                      <span className="group-meta">
                        {group.courseType === 'ONE_ON_ONE' ? '1对1散课' : `${group.studentCount}人班`}
                      </span>
                    </div>
                    <div className="group-quick-actions">
                      <div className="group-stat-pill">
                        已选 <strong>{gs.total}</strong> 人
                        {gs.double > 0 && <span style={{ color: '#d97706', marginLeft: 4 }}>({gs.double}双份)</span>}
                      </div>
                      <Button size="small" onClick={() => setGroupAll(group.students, 'none')}>
                        全不就餐
                      </Button>
                      <Button size="small" onClick={() => setGroupAll(group.students, 'single')}>
                        全单份
                      </Button>
                      {menu.allowDouble && (
                        <Button size="small" onClick={() => setGroupAll(group.students, 'double')}>
                          全双份
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="student-roster-list">
                    {group.students.map((s) => (
                      <div key={s.id} className="student-roster-item">
                        <div className="student-info">
                          <span className="student-name">{s.name}</span>
                          <span className="student-sub">
                            {[s.grade, s.school].filter(Boolean).join(' · ') || '在读学员'}
                          </span>
                        </div>
                        <Radio.Group
                          value={portions[s.id] || 'none'}
                          onChange={(e) => setPortions((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          size="small"
                          className="portion-radio-group"
                        >
                          <Radio.Button value="none">不就餐</Radio.Button>
                          <Radio.Button value="single">单份</Radio.Button>
                          {menu.allowDouble && <Radio.Button value="double">双份</Radio.Button>}
                        </Radio.Group>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* 底部提报确认栏 */}
            <div className="meals-submit-bar">
              <div className="submit-summary-text">
                当前已勾选：<strong>{stats.total}</strong> 人就餐
                <span className="sub-detail">
                  （单份 {stats.single} · 双份 {stats.double}）
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {currentReport && (
                  <Button onClick={() => setEditing(false)} disabled={submitting}>
                    取消修改
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={submitting}
                  onClick={submit}
                  style={{
                    background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`,
                    borderColor: 'transparent',
                    boxShadow: `0 4px 14px ${theme.primary}35`,
                    borderRadius: 10,
                    fontWeight: 650,
                  }}
                >
                  {submitting ? '正在提交…' : currentReport ? '确认并更新上报' : '确认提交就餐名单'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .teacher-meals-wrap {
          width: 100%;
          max-width: 100%;
        }

        .meals-hero-card {
          padding: 24px;
          border-radius: 18px;
          color: #ffffff;
          margin-bottom: 20px;
        }

        .hero-head-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .hero-badge {
          display: inline-block;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
          letter-spacing: 0.3px;
        }

        .hero-subtag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.9);
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(4px);
        }

        .hero-title {
          margin: 10px 0 6px;
          color: #ffffff;
          font-size: clamp(20px, 4vw, 25px);
          font-weight: 800;
        }

        .hero-desc {
          margin: 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 13px;
          line-height: 1.6;
          max-width: 780px;
        }

        .hero-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          font-size: 12.5px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
        }

        .meals-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }

        .stat-card {
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.10);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.75);
          margin-bottom: 3px;
        }

        .stat-value {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
        }

        .stat-unit {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.85;
        }

        .stat-desc {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.65);
          margin-top: 3px;
        }

        .meals-menu-card {
          padding: 18px 20px;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.07);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          margin-bottom: 20px;
        }

        .menu-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          margin-bottom: 12px;
        }

        .menu-food-icon {
          font-size: 20px;
        }

        .menu-main-dish {
          font-size: 18px;
          font-weight: 750;
          color: #1a1201;
          margin-bottom: 6px;
        }

        .menu-side-dish {
          font-size: 13.5px;
          color: #635745;
          margin-bottom: 6px;
        }

        .menu-notes {
          font-size: 12px;
          color: #8c7d67;
          background: #faf7f2;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .meals-action-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.07);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
          padding: 18px 20px;
        }

        .action-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          margin-bottom: 16px;
        }

        .submitted-view-box {
          padding: 6px 0;
        }

        .submitted-student-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .submitted-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: #f7f6f2;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .chip-name {
          font-size: 13.5px;
          font-weight: 650;
          color: #1a1201;
        }

        .chip-portion {
          font-size: 11px;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .chip-portion.single {
          background: #e6f7ea;
          color: #278648;
        }

        .chip-portion.double {
          background: #fef3e2;
          color: #b46b0a;
        }

        .meal-group-block {
          background: #faf9f6;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 14px 16px;
          margin-bottom: 16px;
        }

        .meal-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
          margin-bottom: 10px;
        }

        .group-title {
          font-size: 14.5px;
          font-weight: 750;
          color: #1a1201;
        }

        .group-meta {
          font-size: 12px;
          color: #8c8273;
          margin-left: 8px;
        }

        .group-quick-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .group-stat-pill {
          font-size: 12px;
          color: #554a3a;
          margin-right: 6px;
        }

        .student-roster-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .student-roster-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .student-info {
          display: flex;
          flex-direction: column;
        }

        .student-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #1a1201;
        }

        .student-sub {
          font-size: 11px;
          color: #8c8273;
        }

        .meals-submit-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 14px 16px;
          background: #f7f5f0;
          border-radius: 12px;
          margin-top: 14px;
        }

        .submit-summary-text {
          font-size: 14px;
          color: #1a1201;
        }

        .sub-detail {
          font-size: 12px;
          color: #7a6e5d;
          margin-left: 6px;
        }

        @media (max-width: 768px) {
          .meals-hero-card {
            padding: 18px 16px;
            border-radius: 14px;
          }

          .meals-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .stat-card {
            padding: 10px 8px;
          }

          .stat-value {
            font-size: 18px;
          }

          .meals-submit-bar {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  )
}

