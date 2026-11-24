'use client'

import { useState } from 'react'
import { rememberParentChild } from '@/lib/parent-child-preference'
import { resolveParentChildId } from '@/lib/parent-child-selection'
import { Typography } from 'antd'
import { CrownFilled, CrownOutlined, PhoneFilled } from '@ant-design/icons'
import { parentIntensivePhotos, scopeParentIntensiveHistory } from '@/lib/parent-intensive-history'
import { ParentCard } from '@/components/Parent/ParentCard'
import {
  IntensiveDetailView,
  type IntensiveStudent,
  type IntensiveEnrollment,
  type IntensiveLesson,
  type IntensiveSummary,
} from '@/components/Parent/IntensiveDetailView'

const { Text } = Typography

type VipStudent = IntensiveStudent & {
  recordIds?: string[]
  membershipLevel?: string | null
  enrollments?: Array<IntensiveEnrollment>
}

function groupSubject(group: IntensiveEnrollment['group']): string {
  return group?.course?.subject || group?.course?.name || '学科'
}

/** 未报名 VIP 时的介绍大卡 */
function VipIntroCard() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* 大卡片：VIP 课程是什么 */}
      <div style={{
        background: 'linear-gradient(135deg, #0E5E4E 0%, #123C35 100%)',
        borderRadius: 18, padding: '22px 18px', color: '#F6E9C8',
        border: '1px solid rgba(201,164,92,.5)',
        boxShadow: '0 14px 34px rgba(18,60,53,.30)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -10, top: -30, fontSize: 130, opacity: .10, color: '#F2E3B6' }}><CrownFilled /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#C9A45C,#F2E3B6)', color: '#123C35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}><CrownOutlined /></span>
          <div>
            <Text strong style={{ color: '#F6E9C8', fontSize: 18, letterSpacing: .5, display: 'block' }}>尊享一对一 · VIP 贵宾课程</Text>
            <div style={{ fontSize: 11.5, color: 'rgba(242,227,182,.85)', marginTop: 2 }}>牧哲学堂为重视个性化培养的孩子打造的专属服务</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(246,233,200,.94)', lineHeight: 1.75, marginTop: 14 }}>
          一对一 VIP 课程由牧哲学堂资深认证教师全程单独授课：时间灵活、节奏完全围绕孩子调整，从约课、考勤审核到课堂反馈与课时结算全流程透明。相比小班课，孩子获得的是「只属于他一个人」的关注与陪伴。
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 13 }}>
          {['资深教师单独授课', '时间灵活可协商', '专属课堂反馈', '课时透明结算'].map((perk) => (
            <span key={perk} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(201,164,92,.16)', border: '1px solid rgba(201,164,92,.4)', color: '#F2E3B6' }}>{perk}</span>
          ))}
        </div>
      </div>

      {/* 适合什么样的学生 */}
      <ParentCard style={{ padding: 16, border: '1px solid rgba(201,164,92,.30)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <span style={{ color: '#C9A45C', fontSize: 16 }}><CrownFilled /></span>
          <Text strong style={{ fontSize: 14.5, color: '#8A6D1F' }}>什么样的学生更适合一对一？</Text>
        </div>
        <div style={{ display: 'grid', gap: 9, fontSize: 12.5, color: '#5a4e3a', lineHeight: 1.6 }}>
          {[
            { t: '需要针对性补差', d: '某个学科短板明显、跟不上班级进度，需要老师围绕薄弱点定制节奏' },
            { t: '想要培优拔高', d: '课堂"吃不饱"，希望提前学、拓展深度，冲刺更高目标' },
            { t: '上课时间不固定', d: '临时有事、请假频繁，一对一可以按孩子时间灵活约课补上' },
            { t: '需要更多关注与陪伴', d: '性格内向不敢提问、专注力易分散，一对一老师全程贴身引导' },
          ].map((item, itemIndex) => (
            <div key={item.t} className="stagger-item" style={{ animationDelay: `${Math.min(itemIndex, 8) * 40}ms`, display: 'flex', gap: 8 }}>
              <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span><strong style={{ color: '#123C35' }}>{item.t}：</strong>{item.d}</span>
            </div>
          ))}
        </div>
      </ParentCard>

      {/* 服务更好、老师更专业 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <ParentCard style={{ padding: 14, background: 'linear-gradient(180deg,#F8F3E7,#fff)' }}>
          <div style={{ color: '#C9A45C', fontSize: 18, marginBottom: 5 }}><CrownFilled /></div>
          <Text strong style={{ fontSize: 13.5, color: '#123C35' }}>服务更用心</Text>
          <div style={{ fontSize: 12, color: '#7A6A45', lineHeight: 1.65, marginTop: 6 }}>
            专属教师全程负责、约课优先安排、每节课专属反馈与课堂照片、课时以审核通过为准，透明可查。
          </div>
        </ParentCard>
        <ParentCard style={{ padding: 14, background: 'linear-gradient(180deg,#F8F3E7,#fff)' }}>
          <div style={{ color: '#C9A45C', fontSize: 18, marginBottom: 5 }}><CrownFilled /></div>
          <Text strong style={{ fontSize: 13.5, color: '#123C35' }}>老师更专业</Text>
          <div style={{ fontSize: 12, color: '#7A6A45', lineHeight: 1.65, marginTop: 6 }}>
            一对一教师均为牧哲学堂资深认证教师，经验丰富、跨学科授课，注重追问思路与当堂巩固。
          </div>
        </ParentCard>
      </div>

      {/* 咨询引导 */}
      <div style={{
        borderRadius: 14, padding: '13px 14px',
        background: 'rgba(232,120,74,.08)', border: '1px dashed rgba(232,120,74,.45)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15 }}>💬</span>
          <div style={{ fontSize: 12.5, color: '#7A6A45', lineHeight: 1.6 }}>
            <Text strong style={{ color: '#B85C30', fontSize: 12.5 }}>该同学尚未报名 VIP 一对一课程</Text>
            <div>如需了解课时安排与专属教师匹配，请联系校区教务老师咨询报名。</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { name: '任老师', phone: '15930114500' },
            { name: '马老师', phone: '18031264903' },
          ].map((contact, contactIndex) => (
            <a
              key={contact.name}
              href={`tel:${contact.phone}`}
              className="stagger-item"
              style={{
                animationDelay: `${Math.min(contactIndex, 8) * 40}ms`,
                flex: '1 1 120px', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 11px', borderRadius: 10, textDecoration: 'none',
                background: '#fff', border: '1px solid rgba(232,120,74,.25)',
                boxShadow: '0 2px 6px rgba(120,70,30,.06)',
              }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                background: 'linear-gradient(135deg,#F0875B,#E8784A)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}><PhoneFilled /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 11.5, color: '#7A6A45' }}>{contact.name}</span>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#123C35', fontVariantNumeric: 'tabular-nums' }}>{contact.phone}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export function IntensiveListClient({
  students,
  initialSelectedStudentId,
  summary,
  groupLessons,
}: {
  students: VipStudent[]
  initialSelectedStudentId: string
  summary: Array<{ studentId: string; groupId: string; approvedHours: number; pendingCount: number; bookedCount: number }>
  groupLessons: Record<string, IntensiveLesson[]>
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() =>
    resolveParentChildId(students, [initialSelectedStudentId]),
  )
  const selectedStudent = students.find((student) => student.id === selectedStudentId) || students[0]
  const currentGroups = (selectedStudent?.enrollments || []).filter((enrollment) => enrollment.group?.intensiveMode === 'INTENSIVE')
  const [selectedGroupId, setSelectedGroupId] = useState<string>(currentGroups[0]?.group?.id || '')

  if (!students.length) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 14px' }}>
        <ParentCard style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ color: '#98A2B3', fontSize: 13 }}>暂未绑定学员</div>
          <div style={{ color: '#7A6A45', fontSize: 12, marginTop: 6 }}>绑定孩子后即可查看 VIP 课程</div>
        </ParentCard>
      </div>
    )
  }

  // 当前学生与其 VIP 组
  const currentEnrollment = currentGroups.find((enrollment) => enrollment.group?.id === selectedGroupId) || currentGroups[0]
  const currentGroup = currentEnrollment?.group
  const selectedRecordIds = new Set(selectedStudent?.recordIds?.length ? selectedStudent.recordIds : selectedStudent ? [selectedStudent.id] : [])
  const summaryItems = summary.filter((s) => selectedRecordIds.has(s.studentId) && s.groupId === currentGroup?.id)
  const historyLessons = scopeParentIntensiveHistory(currentGroup?.id ? groupLessons[currentGroup.id] || [] : [], [...selectedRecordIds])

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId)
    const student = students.find((item) => item.id === studentId)
    const firstGroupId = (student?.enrollments || []).find((enrollment) => enrollment.group?.intensiveMode === 'INTENSIVE')?.group?.id
    setSelectedGroupId(firstGroupId || '')
    rememberParentChild(studentId, student?.membershipLevel)
    const params = new URLSearchParams(window.location.search)
    params.set('childId', studentId)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }

  const detailSummary: IntensiveSummary = {
    approvedHours: summaryItems.reduce((total, item) => total + item.approvedHours, 0),
    pendingCount: summaryItems.reduce((total, item) => total + item.pendingCount, 0),
    bookedCount: summaryItems.reduce((total, item) => total + item.bookedCount, 0),
    totalHours: Number(currentEnrollment?.totalHours || 0),
    usedHours: Number(currentEnrollment?.usedHours || 0),
    remainHours: Number(currentEnrollment?.remainHours || 0),
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 14px 24px', display: 'grid', gap: 10 }}>
      {/* 学生切换（全部孩子都展示） */}
      {students.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {students.map((student) => {
            const hasVip = (student.enrollments || []).some((enrollment) => enrollment.group?.intensiveMode === 'INTENSIVE')
            const active = selectedStudent?.id === student.id
            return (
              <button
                key={student.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectStudent(student.id)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, minHeight: 38,
                  padding: '6px 14px', borderRadius: 999, fontSize: 13,
                  border: active ? '1px solid #C9A45C' : '1px solid rgba(60,80,72,.14)',
                  background: active ? '#0E5E4E' : '#ffffff',
                  color: active ? '#F2E3B6' : '#2A3F38',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: active ? '0 3px 10px rgba(14,94,78,.25)' : '0 1px 4px rgba(0,0,0,.02)',
                  transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
                }}
              >
                {student.name}
                {hasVip && <CrownOutlined style={{ fontSize: 11, color: active ? '#F2E3B6' : '#C9A45C' }} />}
              </button>
            )
          })}
        </div>
      )}

      {/* 未报名 VIP：介绍大卡 */}
      {!currentGroups.length ? (
        <VipIntroCard />
      ) : (
        <>
          {/* 组切换（一个学生多学科多老师时） */}
          {currentGroups.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {currentGroups.map((enrollment) => {
                const group = enrollment.group
                const teacherName = group?.teacher?.name || '老师'
                const subject = groupSubject(group)
                const active = currentGroup?.id === group?.id
                return (
                  <button
                    key={enrollment.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedGroupId(group?.id || '')}
                    style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, minHeight: 36,
                      padding: '5px 12px', borderRadius: 999, fontSize: 12.5,
                      border: active ? '1px solid #C9A45C' : '1px solid rgba(60,80,72,.14)',
                      background: active ? '#0E5E4E' : '#ffffff',
                      color: active ? '#F2E3B6' : '#2A3F38',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: active ? '0 3px 10px rgba(14,94,78,.25)' : '0 1px 4px rgba(0,0,0,.02)',
                      transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
                    }}
                  >
                    <CrownOutlined style={{ fontSize: 11 }} />
                    {subject} · {teacherName}
                  </button>
                )
              })}
            </div>
          )}

          {/* 精简介绍条（始终展示） */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, padding: '10px 12px',
            background: 'rgba(201,164,92,.10)', border: '1px solid rgba(201,164,92,.28)',
          }}>
            <span style={{ color: '#C9A45C', fontSize: 16, flexShrink: 0 }}><CrownFilled /></span>
            <div style={{ fontSize: 12, color: '#7A6A45', lineHeight: 1.55 }}>
              <Text strong style={{ color: '#8A6D1F', fontSize: 12.5 }}>尊享一对一贵宾服务</Text> —— 专属一对一教学、灵活约课、专属课堂反馈、课时透明结算，全流程透明可见。
            </div>
          </div>

          {/* 直接展示详情（无需点击） */}
          {currentEnrollment && (
            <IntensiveDetailView
              student={selectedStudent}
              enrollment={currentEnrollment}
              summary={detailSummary}
              historyLessons={historyLessons}
              photos={parentIntensivePhotos(historyLessons)}
            />
          )}
        </>
      )}
    </div>
  )
}
