'use client'

import { Typography } from 'antd'
import {
  CrownFilled,
  CrownOutlined,
  ReadOutlined,
  RightOutlined,
  LeftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PictureOutlined,
  StarFilled,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { intensiveTeachingTypeLabel } from '@/lib/intensive-class'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ParentCard } from '@/components/Parent/ParentCard'

const { Text } = Typography

const PERKS = ['专属一对一教学', '灵活约课优先安排', '专属课堂反馈', '课时透明结算']

function fmtDate(value: string | Date): string {
  const d = new Date(value)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export type IntensiveStudent = { id: string; name: string; grade?: string | null }
export type IntensiveGroup = {
  id: string; name?: string | null; teachingType?: string | null; intensiveMode?: string | null
  course?: { id?: string; name?: string | null; subject?: string | null; grade?: string | null } | null
  teacher?: {
    id?: string; name?: string | null; avatar?: string | null; gender?: string | null; tierLevel?: string | null
    bio?: string | null; education?: string | null; university?: string | null; major?: string | null
    subjects?: string | null; rating?: number | null; ratingCount?: number | null
  } | null
  teacherAssignments?: Array<{ teacherId?: string; subject?: string | null }>
}
export type IntensiveEnrollment = {
  id: string
  totalHours?: number | null
  usedHours?: number | null
  remainHours?: number | null
  group?: IntensiveGroup | null
}
export type IntensiveFeedback = {
  studentIds?: string[]
  id: string; summary?: string | null; overallComment?: string | null; lessonContent?: string | null
  knowledgePoints?: string[]; imageUrls?: string[]; createdAt?: string | Date | null; mood?: string | null; tags?: string[]
}
export type IntensiveLesson = {
  lessonStudents?: Array<{ studentId: string }>
  id: string; lessonDate: string | Date; startTime: string; endTime: string; subject?: string | null
  attendanceSubmittedAt?: string | null; actualMinutes?: number | null; intensiveReviewStatus?: string | null
  attendances?: Array<{ studentId?: string; status?: string | null; actualMinutes?: number | null; hoursDeducted?: number | null }>
  classroomFeedbacks?: IntensiveFeedback[]
  intensiveReviews?: Array<{ status?: string | null; actualMinutes?: number | null; reviewedAt?: string | Date | null; reviewNote?: string | null }>
}
export type IntensiveSummary = { approvedHours: number; pendingCount: number; bookedCount: number; totalHours: number; usedHours: number; remainHours: number }

export function IntensiveDetailView({
  student,
  enrollment,
  summary,
  historyLessons,
  photos,
  showBack = false,
}: {
  student: IntensiveStudent
  enrollment: IntensiveEnrollment
  summary: IntensiveSummary
  historyLessons: IntensiveLesson[]
  photos: string[]
  showBack?: boolean
}) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false

  const group = enrollment.group
  const teacher = group?.teacher
  const tier = teacher ? resolveTier(teacher.tierLevel) : null
  const tierTheme = tier ? TIER_THEME[tier] : null
  const avatarSrc = getTeacherAvatarUrl(teacher?.avatar, teacher?.gender, teacher?.id)
  const subject = group?.course?.subject || group?.course?.name || '学科'
  const remain = summary.remainHours
  const total = summary.totalHours || 0
  const used = summary.usedHours || 0
  const usedPct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  const lessonStatus = (lesson: IntensiveLesson): { text: string; color: string; bg: string } => {
    const review = lesson.intensiveReviews?.[0]
    if (review?.status === 'APPROVED') return { text: '已审核', color: '#1D9E75', bg: '#E9F7F0' }
    if (review?.status === 'REJECTED') return { text: '已驳回', color: '#D4537E', bg: '#FDEFF3' }
    if (review?.status === 'PENDING') return { text: '待审核', color: '#C9A45C', bg: '#F8F3E7' }
    if (lesson.attendanceSubmittedAt) return { text: '已提交考勤', color: '#7C6BC4', bg: '#F0EDF8' }
    return { text: '已预约待上课', color: '#185FA5', bg: '#EDF4FC' }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {showBack && (
        <button
          type="button"
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: '#5a4e3a', fontSize: 13, padding: '6px 0', cursor: 'pointer', justifySelf: 'flex-start' }}
        >
          <LeftOutlined /> 返回课表
        </button>
      )}

      {/* 尊享 Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0E5E4E 0%, #123C35 100%)',
        borderRadius: 18, padding: '18px 16px', color: '#F6E9C8',
        border: '1px solid rgba(201,164,92,.5)',
        boxShadow: '0 12px 30px rgba(18,60,53,.30)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -14, top: -26, fontSize: 120, opacity: .10, color: '#F2E3B6' }}><CrownFilled /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#C9A45C,#F2E3B6)', color: '#123C35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}><CrownOutlined /></span>
          <div>
            <Text strong style={{ color: '#F6E9C8', fontSize: 17, letterSpacing: .5, display: 'block' }}>尊享一对一 · 贵宾课程</Text>
            <div style={{ fontSize: 11, color: 'rgba(242,227,182,.9)', marginTop: 2 }}>{student.name}同学 · {subject}</div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(246,233,200,.9)', lineHeight: 1.65, marginTop: 12 }}>
          您为{student.name}同学报名了牧哲学堂 VIP 贵宾课程，由{teacher?.name || '专属'}老师全程一对一执教。每节课的约课、考勤、反馈与课时都在这里透明记录，让每一份用心都被看见。
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {PERKS.map((perk) => (
            <span key={perk} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(201,164,92,.16)', border: '1px solid rgba(201,164,92,.4)', color: '#F2E3B6' }}>
              {perk}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(201,164,92,.22)' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(242,227,182,.85)' }}>剩余课时</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#F2E3B6', lineHeight: 1.15 }}>
              {remain.toFixed(1)}<span style={{ fontSize: 13, fontWeight: 500 }}> 小时</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(246,233,200,.75)', lineHeight: 1.7 }}>
            <div>已用 {used.toFixed(1)}h / 总计 {total.toFixed(1)}h</div>
            <div style={{ width: 130, height: 5, borderRadius: 999, background: 'rgba(201,164,92,.22)', marginTop: 5, overflow: 'hidden' }}>
              <div style={{ width: `${usedPct}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#C9A45C,#F2E3B6)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 教师信息卡 */}
      <ParentCard style={{ padding: 14, border: '1px solid rgba(201,164,92,.35)', boxShadow: '0 6px 20px rgba(18,60,53,.10)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <CachedAvatarImage
            src={avatarSrc}
            fallbackSrc={getTeacherAvatarUrl(null, teacher?.gender, teacher?.id)}
            alt={teacher?.name || '老师'}
            style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', border: '2px solid rgba(201,164,92,.55)', background: '#F8F3E7', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: 16 }}>{teacher?.name || '-'}老师</Text>
              {tierTheme && (
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 999, background: tierTheme.bg, border: `1px solid ${tierTheme.border}`, color: tierTheme.accent }}>
                  {tierTheme.label}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#5a4e3a', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span>{subject} · {intensiveTeachingTypeLabel(group?.teachingType)}</span>
              {teacher?.rating ? (
                <span style={{ color: '#C9A45C', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  <StarFilled style={{ fontSize: 11 }} />{Number(teacher.rating).toFixed(1)}
                </span>
              ) : null}
            </div>
            {(teacher?.education || teacher?.university) && (
              <div style={{ fontSize: 12, color: '#7A6A45', marginTop: 4 }}>
                {[teacher.university, teacher.major, teacher.education].filter(Boolean).join(' · ') || '牧哲学堂认证教师'}
              </div>
            )}
          </div>
        </div>
        {teacher?.bio ? (
          <div style={{ marginTop: 11, fontSize: 12.5, color: '#5a4e3a', lineHeight: 1.7, background: 'rgba(201,164,92,.08)', borderRadius: 12, padding: '10px 12px' }}>
            {teacher.bio}
          </div>
        ) : (
          <div style={{ marginTop: 11, fontSize: 12.5, color: '#98A2B3', lineHeight: 1.6, background: '#FAF8F5', borderRadius: 12, padding: '10px 12px' }}>
            {teacher?.name || '这位'}老师是牧哲学堂认证教师，专注{subject}一对一教学，注重课堂互动与个性化辅导。
          </div>
        )}
      </ParentCard>

      {/* 课时概览 */}
      <ParentCard style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <CheckCircleOutlined style={{ color: '#C9A45C' }} />
          <Text strong style={{ fontSize: 14 }}>课时与授课概览</Text>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 6, fontSize: 12, textAlign: 'center' }}>
          <span style={{ background: '#0E5E4E', borderRadius: 10, padding: '8px 2px', color: '#F2E3B6' }}>
            剩余课时<br /><strong style={{ fontSize: 14, color: '#F6E9C8' }}>{remain.toFixed(1)}h</strong>
          </span>
          <span style={{ background: '#F8F3E7', borderRadius: 10, padding: '8px 2px', color: '#123C35' }}>
            已审核授课<br /><strong style={{ fontSize: 14, color: '#123C35' }}>{summary.approvedHours.toFixed(1)}h</strong>
          </span>
          <span style={{ background: '#F8F3E7', borderRadius: 10, padding: '8px 2px', color: '#123C35' }}>
            待审核授课<br /><strong style={{ fontSize: 14, color: '#123C35' }}>{summary.pendingCount}节</strong>
          </span>
          <span style={{ background: '#F8F3E7', borderRadius: 10, padding: '8px 2px', color: '#123C35' }}>
            待上课约课<br /><strong style={{ fontSize: 14, color: '#123C35' }}>{summary.bookedCount}节</strong>
          </span>
        </div>
      </ParentCard>

      {/* 约课记录 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <ClockCircleOutlined style={{ color: '#C9A45C' }} />
          <Text strong style={{ fontSize: 14 }}>约课与课堂记录</Text>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#98A2B3' }}>共 {historyLessons.length} 节</span>
        </div>
        {historyLessons.length === 0 ? (
          <ParentCard style={{ padding: 16, textAlign: 'center', color: '#98A2B3', fontSize: 12.5 }}>
            还没有上课记录，老师约课后会在这里展示每节课的详情与反馈。
          </ParentCard>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {historyLessons.map((lesson) => {
              const status = lessonStatus(lesson)
              const feedback = lesson.classroomFeedbacks?.[0]
              const attendance = lesson.attendances?.[0]
              const minutes = Number(attendance?.actualMinutes || lesson.actualMinutes || 0)
              const hours = minutes > 0 ? (minutes / 60).toFixed(1) : ''
              const review = lesson.intensiveReviews?.[0]
              return (
                <ParentCard key={lesson.id} style={{ padding: 13, borderLeft: `3px solid ${status.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2329' }}>
                        {fmtDate(lesson.lessonDate)} {lesson.startTime}-{lesson.endTime}
                      </div>
                      <div style={{ fontSize: 12, color: '#5a4e3a', marginTop: 3 }}>
                        {subject} · {minutes > 0 ? `${minutes}分钟` : `${(Number(lesson.endTime?.slice(0,2)) - Number(lesson.startTime?.slice(0,2))) * 60 || 60}分钟计划`}
                        {hours ? ` · 扣课时 ${hours}h` : ''}
                      </div>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: status.bg, color: status.color }}>
                      {status.text}
                    </span>
                  </div>
                  {review?.status === 'REJECTED' && review.reviewNote && (
                    <div style={{ marginTop: 8, fontSize: 11.5, color: '#D4537E', background: '#FDEFF3', borderRadius: 8, padding: '6px 9px', lineHeight: 1.5 }}>
                      驳回原因：{review.reviewNote}
                    </div>
                  )}
                  {feedback ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/parent/class-feedback/${feedback.id}?childId=${student.id}`)}
                      style={{ marginTop: 9, width: '100%', textAlign: 'left', border: 'none', background: 'rgba(201,164,92,.10)', borderRadius: 10, padding: '9px 10px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, color: '#7A6A45' }}>
                        <ReadOutlined style={{ color: '#C9A45C' }} />
                        <span style={{ fontWeight: 600 }}>课堂反馈{feedback.imageUrls?.length ? ` · ${feedback.imageUrls.length}张课堂照片` : ''}</span>
                        <span style={{ marginLeft: 'auto', color: '#C9A45C', fontWeight: 700 }}>查看完整反馈 <RightOutlined style={{ fontSize: 9 }} /></span>
                      </div>
                      <div style={{ fontSize: 12, color: '#5a4e3a', lineHeight: 1.6, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {String(feedback.summary || feedback.overallComment || '').slice(0, 64) || '老师已发布本节课课堂反馈，点击查看详情。'}
                      </div>
                    </button>
                  ) : (
                    <div style={{ marginTop: 9, fontSize: 11.5, color: '#98A2B3', background: '#FAF8F5', borderRadius: 10, padding: '8px 10px', lineHeight: 1.5 }}>
                      {lesson.attendanceSubmittedAt ? '老师正在整理课堂反馈，整理好后会第一时间更新在这里。' : '老师约课后会及时发布本节课的课堂反馈。'}
                    </div>
                  )}
                </ParentCard>
              )
            })}
          </div>
        )}
      </div>

      {/* 课堂照片 */}
      {photos.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <PictureOutlined style={{ color: '#C9A45C' }} />
            <Text strong style={{ fontSize: 14 }}>课堂照片</Text>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#98A2B3' }}>{photos.length} 张</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {photos.map((url, i) => (
              <img key={`${url}-${i}`} src={url} alt={`课堂照片${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, border: '1px solid #EEE7E1' }} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
