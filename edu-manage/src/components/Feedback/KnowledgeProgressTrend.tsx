'use client'

import { ArrowDownOutlined, ArrowUpOutlined, BarChartOutlined, MinusOutlined, ReloadOutlined } from '@ant-design/icons'
import { buildKnowledgeTopicTrends, KNOWLEDGE_MASTERY_LEVELS, type KnowledgeProgressEntry } from '@/lib/classroom-feedback/knowledge-progress'
import styles from './knowledge-progress-trend.module.css'

const trendIcons = {
  improving: ArrowUpOutlined,
  steady: MinusOutlined,
  needs_review: ArrowDownOutlined,
  recording: ReloadOutlined,
} as const

export function KnowledgeProgressTrend({ entries }: { entries: KnowledgeProgressEntry[] }) {
  const trends = buildKnowledgeTopicTrends(entries)
  const totalRecords = entries.length

  return (
    <section className={styles.card} aria-label="知识点成长记录">
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true"><BarChartOutlined /></span>
        <div className={styles.headingCopy}>
          <h3>知识点成长记录</h3>
          <p>按每节课老师记录的掌握情况汇总</p>
        </div>
        {totalRecords > 0 && <span className={styles.countBadge}>近 {totalRecords} 次记录</span>}
      </header>

      {trends.length ? (
        <div className={styles.topicList}>
          {trends.map((trend, index) => {
            const TrendIcon = trendIcons[trend.trend]
            const isFeatured = index === 0
            const activeRank = KNOWLEDGE_MASTERY_LEVELS.find((level) => level.value === trend.latestLevel)?.rank || 1
            return (
              <article className={`${styles.topic} ${isFeatured ? styles.featured : ''}`} key={trend.topic}>
                <div className={styles.topicHeading}>
                  <strong>{trend.topic}</strong>
                  <span className={styles.masteryBadge} data-level={activeRank}>{trend.latestLevel}</span>
                </div>
                <div className={styles.scale} role="meter" aria-label={`${trend.topic}掌握情况`} aria-valuemin={1} aria-valuemax={4} aria-valuenow={activeRank} aria-valuetext={trend.latestLevel}>
                  {KNOWLEDGE_MASTERY_LEVELS.map((level) => (
                    <span key={level.value} className={level.rank <= activeRank ? styles.scaleReached : ''} />
                  ))}
                </div>
                <div className={styles.scaleLabels} aria-hidden="true">
                  {KNOWLEDGE_MASTERY_LEVELS.map((level) => <span key={level.value}>{level.label}</span>)}
                </div>
                <footer className={styles.topicFooter}>
                  <span className={`${styles.trendLabel} ${styles[trend.trend]}`}><TrendIcon />{trend.trendLabel}</span>
                  <span>{trend.recordCount} 次</span>
                </footer>
                {trend.points.length > 1 && (
                  <div className={styles.history} aria-label={`${trend.topic}最近${trend.points.length}次课堂记录`}>
                    {trend.points.map((point) => (
                      <span key={point.feedbackId} title={`${new Date(point.date).toLocaleDateString('zh-CN')} · ${point.masteryLevel}`}>
                        {new Date(point.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} · {point.masteryLevel}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <p className={styles.empty}>课堂反馈中的知识掌握记录会持续汇总到这里。</p>
      )}
      <p className={styles.footnote}>展示任课老师在课堂反馈中选择的掌握标签，不代表考试分数。</p>
    </section>
  )
}
