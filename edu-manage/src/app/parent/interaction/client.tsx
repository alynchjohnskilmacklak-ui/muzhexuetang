'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Segmented } from 'antd'
import {
  UserOutlined,
  ThunderboltFilled,
  ClockCircleFilled,
  CheckCircleFilled,
  CheckCircleOutlined,
  BulbOutlined,
  EditOutlined,
  QuestionCircleOutlined,
  ArrowRightOutlined,
  SmileOutlined,
  MessageFilled,
  CommentOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { resolveTier, type TeacherTier } from '@/constants/teacher-tier'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { TIER_THEME_STYLE, TeacherTierBadge } from '@/app/parent/notifications/client'
import type { ParentInteractionPayload } from '@/lib/parent-interaction'
import styles from './interaction.module.css'

function LoadingView() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={`mz-skeleton ${styles.skeletonTitle}`} aria-hidden="true" />
        <div className={`mz-skeleton ${styles.skeletonSubtitle}`} aria-hidden="true" />
      </header>
      <div className={styles.summary} aria-hidden="true">
        {[0, 1, 2].map((slot) => (
          <div className={styles.summaryItem} key={slot}>
            <span className={`mz-skeleton ${styles.skeletonValue}`} />
          </div>
        ))}
      </div>
      <ul className={styles.list} role="status" aria-live="polite" aria-label="正在加载互动记录">
        {[0, 1, 2].map((slot) => (
          <li key={slot} className={styles.skeletonItem} aria-hidden="true">
            <div className={`mz-skeleton ${styles.skeletonLine}`} />
            <div className={`mz-skeleton ${styles.skeletonLineShort}`} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ParentInteractionClient({
  initialData,
  initialChildId,
}: {
  initialData: ParentInteractionPayload
  initialChildId: string
}) {
  const [data, setData] = useState(initialData)
  const [childId, setChildId] = useState(initialChildId)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [visibleRecordCount, setVisibleRecordCount] = useState(12)
  const requestVersion = useRef(0)

  const selectChild = async (nextChildId: string) => {
    if (nextChildId === childId || loading) return
    setChildId(nextChildId)
    setVisibleRecordCount(12)
    setLoading(true)
    setLoadError('')
    const version = ++requestVersion.current

    try {
      const response = await fetch(`/api/parent/interaction?childId=${encodeURIComponent(nextChildId)}`, {
        cache: 'no-store',
      })
      const payload = (await response.json()) as ParentInteractionPayload
      if (!response.ok || payload.error) throw new Error(payload.error || '加载失败，请稍后重试')
      if (version === requestVersion.current) setData(payload)
    } catch (error) {
      if (version === requestVersion.current) {
        setLoadError(error instanceof Error ? error.message : '加载失败，请稍后重试')
      }
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }

  if (loading) return <LoadingView />

  if (!data || data.error || loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyCard}>
          <div className={styles.emptyIconCircle}>
            <SmileOutlined style={{ fontSize: 32, color: '#C9A45C' }} />
          </div>
          <h3 className={styles.emptyTitle}>数据暂不可用</h3>
          <p className={styles.emptyDesc}>{loadError || data?.error || '暂无互动数据，请刷新重试'}</p>
          <button type="button" className={styles.emptyActionBtn} onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      </div>
    )
  }

  const activeChild =
    data.children.find((child) => child.id === childId) || data.children[0]
  const records = data.records

  return (
    <div className={styles.page}>
      {/* 顶部标题看板 */}
      <header className={styles.head}>
        <div className={styles.headTopRow}>
          <div className={styles.headIconBadge}>
            <MessageFilled />
          </div>
          <div className={styles.headPill}>
            <span>随堂即时互动留档</span>
          </div>
        </div>
        <h1 className={styles.title}>课堂互动</h1>
        <p className={styles.subtitle}>
          {activeChild
            ? `记录 ${activeChild.name} 在课堂上的即时提问、作答反馈与老师针对性点评`
            : '查看孩子在课堂上被老师提问的即时互动情况'}
        </p>
      </header>

      {/* 学员选择栏：多学员显示墨绿胶囊 Segmented，单学员显示精致学员徽章 */}
      {data.children.length > 1 ? (
        <div className={styles.childBar}>
          <div className={styles.childBarLabel}>
            <span className={styles.childBarIcon}>
              <UserOutlined />
            </span>
            <span>当前学员</span>
          </div>
          <div className={styles.childSelectorWrap}>
            <Segmented
              className={styles.childSegmented}
              value={activeChild?.id || childId}
              onChange={(val) => void selectChild(val as string)}
              options={data.children.map((child) => ({
                label: `${child.name}${child.grade ? ` · ${child.grade}` : ''}`,
                value: child.id,
              }))}
            />
          </div>
        </div>
      ) : data.children.length === 1 ? (
        <div className={styles.singleChildBadge}>
          <span className={styles.singleChildIcon}>
            <UserOutlined />
          </span>
          <span className={styles.singleChildLabel}>当前学员：</span>
          <strong className={styles.singleChildName}>{data.children[0].name}</strong>
          {data.children[0].grade && (
            <span className={styles.singleChildGrade}>{data.children[0].grade}</span>
          )}
        </div>
      ) : null}

      {/* 随堂互动数据看板 */}
      {data.summary && activeChild && (
        <section className={styles.summary} aria-label="课堂互动统计">
          <div className={styles.summaryItem}>
            <div className={styles.summaryIconWrap} style={{ background: '#FFF3E8', color: '#E8784A' }}>
              <ThunderboltFilled />
            </div>
            <AnimatedNumber className={styles.summaryValue} value={data.summary.todayCount} />
            <span className={styles.summaryLabel}>今天被提问</span>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryIconWrap} style={{ background: '#EAF6F2', color: '#14574D' }}>
              <ClockCircleFilled />
            </div>
            <AnimatedNumber className={styles.summaryValue} value={data.summary.totalPicks} />
            <span className={styles.summaryLabel}>近 {data.lookbackDays} 天</span>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryIconWrap} style={{ background: '#EDFCF2', color: '#2E7D5B' }}>
              <CheckCircleFilled />
            </div>
            <AnimatedNumber className={styles.summaryValue} value={data.summary.correctCount} />
            <span className={styles.summaryLabel}>作答正确</span>
          </div>
        </section>
      )}

      {/* 提问记录列表或品牌空状态 */}
      {records.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIconCircle}>
            <SmileOutlined style={{ fontSize: 32, color: '#C9A45C' }} />
          </div>
          <h3 className={styles.emptyTitle}>暂无近期随堂提问记录</h3>
          <p className={styles.emptyDesc}>
            {activeChild ? activeChild.name : '孩子'}在这段时间内尚未产生课堂随堂提问记录。老师在课上进行针对性提问并记录即时反馈后，记录将第一时间呈现在这里。
          </p>
          <div className={styles.emptyTipBox}>
            <strong>💡 牧哲学堂启发式教学说明：</strong>
            <div style={{ marginTop: 4 }}>
              随堂提问旨在帮助孩子在课堂上保持高度专注、即时点拨重难点考点，不作同学间的横向排名对比。
            </div>
          </div>
          <Link href="/parent/class-feedback" className={styles.emptyActionBtn}>
            查看最新课堂反馈与学情报告 <ArrowRightOutlined />
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {records.slice(0, visibleRecordCount).map((record) => {
            const isToday = dayjs(record.createdAt).isSame(dayjs(), 'day')
            const teacherName = record.teacher?.name || '任课老师'
            const tier: TeacherTier = resolveTier(record.teacher?.tierLevel)
            const tierStyle = TIER_THEME_STYLE[tier]
            const avatarSrc = getTeacherAvatarUrl(
              record.teacher?.avatar,
              record.teacher?.gender,
              teacherName,
            )

            return (
              <li key={record.id} className={styles.item}>
                {/* 教师身份与时间 */}
                <div className={styles.itemTeacherRow}>
                  <div className={styles.teacherProfile}>
                    <div
                      className={styles.avatarWrap}
                      style={{
                        border: tierStyle.avatarBorder,
                        outline: tierStyle.avatarRing,
                      }}
                    >
                      <CachedAvatarImage
                        src={avatarSrc}
                        fallbackSrc={getTeacherAvatarUrl(null, record.teacher?.gender, teacherName)}
                        alt={teacherName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                    <div className={styles.teacherMeta}>
                      <div className={styles.teacherNameRow}>
                        <span className={styles.teacherName}>{teacherName}</span>
                        <TeacherTierBadge tier={record.teacher?.tierLevel} />
                      </div>
                      <span className={styles.classBadge}>
                        {record.subject ? `${record.subject} · ` : ''}
                        {record.groupName}
                      </span>
                    </div>
                  </div>

                  <div className={styles.itemDate}>
                    <span>
                      {dayjs(record.lessonDate).format('M月D日')} {record.startTime}
                    </span>
                    {isToday ? <span className={styles.todayBadge}>今天</span> : null}
                  </div>
                </div>

                {/* 提问内容与作答结果 */}
                <div className={styles.interactionRow}>
                  <span className={styles.questionTag}>
                    <QuestionCircleOutlined style={{ color: '#C9A45C' }} />
                    <span>{record.questionLabel || '课堂即时提问'}</span>
                  </span>

                  {record.result === 'CORRECT' ? (
                    <span className={`${styles.resultTag} ${styles.tagCorrect}`}>
                      <CheckCircleOutlined /> 回答正确
                    </span>
                  ) : record.result === 'PARTIAL' ? (
                    <span className={`${styles.resultTag} ${styles.tagPartial}`}>
                      <BulbOutlined /> 部分正确
                    </span>
                  ) : record.result === 'NEEDS_WORK' ? (
                    <span className={`${styles.resultTag} ${styles.tagNeedsWork}`}>
                      <EditOutlined /> 需要订正
                    </span>
                  ) : (
                    <span className={`${styles.resultTag} ${styles.tagPending}`}>老师未记录结果</span>
                  )}
                </div>

                {/* 老师深度点评（温润羊皮纸高雅卡片） */}
                {record.comment ? (
                  <div className={styles.itemComment}>
                    <div className={styles.commentTitle}>
                      <CommentOutlined style={{ color: '#C9A45C' }} />
                      <span>老师即时深度点评：</span>
                    </div>
                    <div className={styles.commentChipsWrap}>
                      {record.comment
                        .split(/[、\n]/)
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((t, idx) => (
                          <div key={idx} className={styles.commentChip}>
                            <span className={styles.quoteSymbol}>“</span>
                            <span style={{ flex: 1, wordBreak: 'break-word' }}>{t}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                {/* 底部跳转链接 */}
                {record.feedbackId && (
                  <div className={styles.itemFooter}>
                    <Link
                      href={`/parent/class-feedback/${record.feedbackId}?childId=${encodeURIComponent(activeChild?.id || childId)}`}
                      className={styles.feedbackLink}
                    >
                      查看当堂完整反馈报告 <ArrowRightOutlined />
                    </Link>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* 加载更多 */}
      {records.length > visibleRecordCount && (
        <button
          type="button"
          className={styles.loadMoreButton}
          onClick={() => setVisibleRecordCount((count) => count + 12)}
        >
          加载更多记录（剩余 {records.length - visibleRecordCount} 条）
        </button>
      )}

      {/* 底部教育理念说明 */}
      <p className={styles.footnote}>
        只展示自己孩子的课堂提问记录，不与同学横向比较。若有疑问可随时在留言中与老师沟通。
      </p>
    </div>
  )
}
