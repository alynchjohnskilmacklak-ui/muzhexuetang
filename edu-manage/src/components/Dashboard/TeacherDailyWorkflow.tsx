'use client'

import {
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Empty } from 'antd'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  deriveTeacherLessonWorkflow,
  type TeacherWorkflowLesson,
  type WorkflowStepState,
} from '@/lib/dashboard-workflows'

type Lesson = TeacherWorkflowLesson & {
  time: string
  courseName: string
  groupName: string
  studentCount: number
  room: string
}

const stepColor: Record<WorkflowStepState, string> = {
  done: 'var(--color-success)',
  active: 'var(--color-primary)',
  pending: 'var(--color-ink-subtle)',
}

export function TeacherDailyWorkflow({ lessons }: { lessons: Lesson[] }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const completed = lessons.filter((lesson) => (
    deriveTeacherLessonWorkflow(lesson).completed
  )).length

  return (
    <section
      aria-labelledby="teacher-daily-workflow-title"
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 14,
        padding: isMobile ? 16 : 20,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
      }}>
        <div>
          <h2
            id="teacher-daily-workflow-title"
            style={{ margin: 0, fontSize: isMobile ? 17 : 18, color: 'var(--color-ink)' }}
          >
            今日教学流程
          </h2>
          <div style={{ marginTop: 5, color: 'var(--color-ink-subtle)', fontSize: 13 }}>
            按课堂顺序完成考勤与反馈，避免遗漏
          </div>
        </div>
        <div style={{
          flexShrink: 0,
          borderRadius: 999,
          padding: '5px 10px',
          background: completed === lessons.length && lessons.length > 0
            ? 'var(--color-success-bg)'
            : 'var(--color-primary-bg)',
          color: completed === lessons.length && lessons.length > 0
            ? 'var(--color-success)'
            : 'var(--color-primary)',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {completed}/{lessons.length} 已闭环
        </div>
      </div>

      {lessons.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="今天暂无课程安排"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lessons.map((lesson) => {
            const workflow = deriveTeacherLessonWorkflow(lesson)
            return (
              <article
                key={lesson.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '132px minmax(180px, 1fr) minmax(230px, .9fr) auto',
                  gap: isMobile ? 12 : 18,
                  alignItems: 'center',
                  padding: isMobile ? 14 : '14px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--color-hairline)',
                  background: workflow.completed
                    ? 'var(--color-surface-2)'
                    : 'var(--color-surface-1)',
                  minWidth: 0,
                }}
              >
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    color: 'var(--color-ink)',
                    fontSize: 15,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    <ClockCircleOutlined style={{ color: 'var(--color-primary)' }} />
                    {lesson.time}
                  </div>
                  <div style={{
                    marginTop: 5,
                    color: 'var(--color-ink-subtle)',
                    fontSize: 12,
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}>
                    <span><TeamOutlined /> {lesson.studentCount}人</span>
                    <span><CalendarOutlined /> {lesson.room}</span>
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{
                    color: 'var(--color-ink)',
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {lesson.courseName}
                  </div>
                  <div style={{
                    marginTop: 4,
                    color: 'var(--color-ink-muted)',
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {lesson.groupName}
                  </div>
                </div>

                <div
                  aria-label="课堂、考勤、反馈完成进度"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}
                >
                  {workflow.steps.map((step, index) => (
                    <div key={step.key} style={{ position: 'relative', minWidth: 0 }}>
                      {index > 0 && (
                        <div style={{
                          position: 'absolute',
                          height: 1,
                          width: 10,
                          left: -8,
                          top: 12,
                          background: step.state === 'pending'
                            ? 'var(--color-hairline-strong)'
                            : stepColor[step.state],
                        }} />
                      )}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        minHeight: 26,
                        borderRadius: 999,
                        padding: '4px 7px',
                        background: step.state === 'active'
                          ? 'var(--color-primary-bg)'
                          : step.state === 'done'
                            ? 'var(--color-success-bg)'
                            : 'var(--color-surface-3)',
                        color: stepColor[step.state],
                        fontSize: 11,
                        fontWeight: step.state === 'active' ? 700 : 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {step.state === 'done'
                          ? <CheckOutlined />
                          : step.key === 'feedback'
                            ? <FileTextOutlined />
                            : <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: stepColor[step.state],
                            }} />}
                        {step.label}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type={workflow.completed ? 'default' : 'primary'}
                  block={isMobile}
                  onClick={() => router.push(workflow.action.href)}
                  style={{
                    minHeight: 38,
                    borderRadius: 10,
                    fontWeight: 700,
                    paddingInline: 14,
                  }}
                >
                  {workflow.action.label}
                  <RightOutlined style={{ fontSize: 10 }} />
                </Button>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
