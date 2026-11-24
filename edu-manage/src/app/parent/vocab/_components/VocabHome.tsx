'use client'

import { useMemo, useState } from 'react'
import { Segmented, Select, Tooltip } from 'antd'
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FireOutlined,
  LeftOutlined,
  RightOutlined,
  RocketOutlined,
  SearchOutlined,
  SyncOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { VocabCatalog, VocabUnitSummary } from './types'
import styles from '../vocab.module.css'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import { shouldSearchChoices, shouldUseInlineChoices } from '@/lib/choice-thresholds'

interface Child {
  id: string
  name: string
  grade: string | null
  membershipLevel?: string | null
}

interface VocabHomeProps {
  catalog: VocabCatalog | null
  loading: boolean
  selectedGrade?: string
  selectedVolume?: string
  onBack: () => void
  onStart: (unit: string | null, scope: 'new' | 'review') => void
}

function getUnitBadgeText(unitName: string) {
  if (unitName.startsWith('Starter Unit 1')) return 'S1'
  if (unitName.startsWith('Starter Unit 2')) return 'S2'
  if (unitName.startsWith('Starter Unit 3')) return 'S3'
  const match = unitName.match(/Unit\s*(\d+)/i)
  if (match) return `U${match[1]}`
  if (unitName.includes('附录') || unitName.includes('参考')) return '附'
  return 'U'
}

function UnitCard({ unit, onStart }: { unit: VocabUnitSummary; onStart: () => void }) {
  const mastered = unit.stats.MASTERED
  const total = unit.count
  const percent = total > 0 ? Math.round((mastered / total) * 100) : 0
  const isAllMastered = total > 0 && mastered === total
  const badgeText = getUnitBadgeText(unit.unit)

  return (
    <div
      onClick={onStart}
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '13px 15px',
        border: '1px solid rgba(20, 87, 77, 0.12)',
        boxShadow: '0 2px 8px rgba(20, 87, 77, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
        transition: 'all 0.16s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
        {/* 单元小标识 */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: isAllMastered ? '#FCF4DF' : 'rgba(20, 87, 77, 0.08)',
            color: isAllMastered ? '#8A6517' : '#14574D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          {badgeText}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#17352F', lineHeight: 1.35 }}>
              {unit.unit}
            </h3>
            {isAllMastered && (
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#8A6517', background: '#FCF4DF', padding: '1px 6px', borderRadius: 999 }}>
                <TrophyOutlined /> 已通关
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 11.5, color: '#7A694F' }}>
              共 <strong>{total}</strong> 词 · 掌握 <strong>{mastered}</strong> 词
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: isAllMastered ? '#8A6517' : '#14574D' }}>
              {percent}%
            </span>
          </div>

          <div style={{ marginTop: 6, height: 3.5, borderRadius: 999, background: '#EFE9E0', overflow: 'hidden' }}>
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                borderRadius: 999,
                background: isAllMastered ? 'linear-gradient(90deg, #F0CA68, #C99E39)' : 'linear-gradient(90deg, #14574D, #2E8A75)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        style={{
          all: 'unset',
          background: isAllMastered ? '#8A6517' : '#14574D',
          color: '#FFFFFF',
          borderRadius: 999,
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          cursor: 'pointer',
          boxShadow: isAllMastered ? '0 2px 6px rgba(138, 101, 23, 0.25)' : '0 2px 6px rgba(20, 87, 77, 0.25)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <span>{isAllMastered ? '再测' : mastered > 0 ? '继续' : '开始'}</span>
        <RightOutlined style={{ fontSize: 9 }} />
      </button>
    </div>
  )
}

function UnitCardSkeleton() {
  return (
    <div className={`${styles.unitCard} ${styles.unitSkeleton}`} aria-hidden="true">
      <div className={styles.unitHead}>
        <div>
          <div className={`mz-skeleton ${styles.skeletonTitle}`} />
          <div className={`mz-skeleton ${styles.skeletonMeta}`} />
        </div>
      </div>
      <div className={styles.skeletonStats}>
        <span className="mz-skeleton" />
        <span className="mz-skeleton" />
        <span className="mz-skeleton" />
      </div>
    </div>
  )
}

export function VocabHome({
  catalog,
  loading,
  selectedGrade,
  selectedVolume,
  onBack,
  onStart,
}: VocabHomeProps) {
  const [unitCategory, setUnitCategory] = useState<string>('all')
  const [unitSearch, setUnitSearch] = useState<string>('')

  const stats = catalog?.stats ?? { total: 0, mastered: 0, learning: 0, wrong: 0 }
  const reviewCount = stats.learning + stats.wrong
  const totalPercent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0

  const bookTitle = `${selectedGrade === '初一' ? '七年级' : selectedGrade === '初二' ? '八年级' : '九年级'}${selectedVolume || '上册'}`

  const displayedUnits = useMemo(() => {
    const list = catalog?.units || []
    return list.filter((u) => {
      // 分类筛选
      if (unitCategory === 'starter' && !u.unit.startsWith('Starter')) return false
      if (unitCategory === 'regular' && !u.unit.startsWith('Unit')) return false
      if (unitCategory === 'appendix' && !u.unit.startsWith('参考词表')) return false

      // 关键词搜索
      if (unitSearch.trim()) {
        const query = unitSearch.trim().toLowerCase()
        const matchTitle = u.unit.toLowerCase().includes(query)
        const matchSections = u.sections.some((s) => s.toLowerCase().includes(query))
        if (!matchTitle && !matchSections) return false
      }
      return true
    })
  }, [catalog?.units, unitCategory, unitSearch])

  return (
    <div className={styles.page}>
      <button
        type="button"
        className="mobile-shell-back"
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 8, border: 0, background: 'transparent', color: '#14574D', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >
        <LeftOutlined /> 返回教材分册
      </button>
      {/* 当前分册大标题：简约典雅 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 42,
            height: 42,
            minWidth: 42,
            maxWidth: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #14574D 0%, #1F7366 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: '0 4px 12px rgba(20, 87, 77, 0.22)',
          }}
        >
          <BookOutlined />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#17352F', letterSpacing: -0.3 }}>
              {bookTitle} · 同步单词
            </h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(20, 87, 77, 0.08)', color: '#14574D' }}>
              人教版
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7A694F' }}>
            共收录 {stats.total} 个重点单词 · 艾宾浩斯智能循环
          </p>
        </div>
      </div>

      {/* 今日待学 Hero 卡片 */}
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.heroTag}>
              <FireOutlined /> 今日攻坚 · 词汇通关
            </div>
            <div className={styles.heroCount}>
              <AnimatedNumber value={reviewCount} />
              <small>个待巩固</small>
            </div>
          </div>
          <div className={styles.heroMetaBox}>
            <div className={styles.heroMetaItem}>
              <span>已掌握</span>
              <strong>{stats.mastered} / {stats.total}</strong>
            </div>
            <div className={styles.heroMetaDivider} />
            <div className={styles.heroMetaItem}>
              <span>掌握率</span>
              <strong>{totalPercent}%</strong>
            </div>
          </div>
        </div>

        <div className={styles.heroBarWrap}>
          <div className={styles.heroBar}>
            <div className={styles.heroBarFill} style={{ width: `${totalPercent}%` }} />
          </div>
        </div>

        <button
          type="button"
          className={styles.heroBtn}
          disabled={stats.total === 0}
          onClick={() => onStart(null, 'new')}
        >
          <RocketOutlined />
          <span>{stats.total > 0 ? '开始背单词' : '词库录入中'}</span>
          <RightOutlined />
        </button>
      </div>

      {/* 3 数据指标卡片 */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCardGreen}`}>
          <div className={styles.statIcon} style={{ background: '#E7F4EE', color: '#14574D' }}>
            <CheckCircleOutlined />
          </div>
          <div className={styles.statContent}>
            <AnimatedNumber className={styles.statValue} value={stats.mastered} />
            <div className={styles.statLabel}>已掌握</div>
            <div className={styles.statSubText}>{totalPercent}% 达成</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardAmber}`}>
          <div className={styles.statIcon} style={{ background: '#FDF3E7', color: '#966E2E' }}>
            <ClockCircleOutlined />
          </div>
          <div className={styles.statContent}>
            <AnimatedNumber className={styles.statValue} value={stats.learning} />
            <div className={styles.statLabel}>学习中</div>
            <div className={styles.statSubText}>需巩固</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardRed}`}>
          <div className={styles.statIcon} style={{ background: '#FCECEB', color: '#B42318' }}>
            <CloseCircleOutlined />
          </div>
          <div className={styles.statContent}>
            <AnimatedNumber className={styles.statValue} value={stats.wrong} />
            <div className={styles.statLabel}>错词本</div>
            <div className={styles.statSubText}>重点消灭</div>
          </div>
        </div>
      </div>

      {/* 错词强化复习坞：重新设计布局，去掉浮动 Tooltip */}
      <div className={styles.reviewBanner}>
        <div className={styles.reviewBannerLeft}>
          <div className={styles.reviewIconBadge}>
            <SyncOutlined spin={reviewCount > 0} />
          </div>
          <div className={styles.reviewContentArea}>
            <div className={styles.reviewBannerTitleRow}>
              <strong className={styles.reviewBannerTitle}>错词强化复习</strong>
              <span className={reviewCount > 0 ? styles.reviewPillActive : styles.reviewPillZero}>
                {reviewCount > 0 ? `${reviewCount} 词待复习` : '今日已清空'}
              </span>
            </div>
            <p className={styles.reviewBannerSubtitle}>
              {reviewCount > 0
                ? '错题与未熟练词自动汇入，艾宾浩斯智能循环'
                : '太棒了！当前待巩固词汇已全部消灭，继续挑战新单元'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={styles.reviewBtn}
          disabled={reviewCount === 0}
          onClick={() => onStart(null, 'review')}
        >
          <span>{reviewCount > 0 ? '立即复习' : '暂无错词'}</span>
          <RightOutlined />
        </button>
      </div>

      {/* 单元词表与筛选 */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>单元词表</h2>
          <span className={styles.sectionSubtitle}>人教版教材同步 · 明确选择背诵单元</span>
        </div>
        {!loading && catalog && (
          <span className={styles.unitTotalPill}>
            共 {catalog.units.length} 个单元
          </span>
        )}
      </div>

      {/* 单元分类切换与搜索 */}
      {!loading && catalog && catalog.units.length > 0 && (
        <div className={styles.unitFilterToolbar}>
          <div className={styles.unitTabCapsules}>
            {[
              { key: 'all', label: '全部单元', count: catalog.units.length },
              {
                key: 'starter',
                label: 'Starter 预备篇',
                count: catalog.units.filter((u) => u.unit.startsWith('Starter')).length,
              },
              {
                key: 'regular',
                label: 'Unit 正式单元',
                count: catalog.units.filter((u) => u.unit.startsWith('Unit')).length,
              },
              {
                key: 'appendix',
                label: '参考词表',
                count: catalog.units.filter((u) => u.unit.startsWith('参考词表')).length,
              },
            ].filter((tab) => tab.count > 0).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.unitTabBtn} ${unitCategory === tab.key ? styles.unitTabBtnActive : ''}`}
                onClick={() => setUnitCategory(tab.key)}
              >
                <span>{tab.label}</span>
                <span className={styles.unitTabBadge}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className={styles.unitSearchBox}>
            <input
              type="text"
              placeholder="搜索单元名称或关键词..."
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              className={styles.unitSearchInput}
            />
          </div>
        </div>
      )}

      <div className={styles.unitGrid}>
        {loading && (
          <div role="status" aria-live="polite" aria-label="正在加载词表" className={styles.skeletonList}>
            <UnitCardSkeleton />
            <UnitCardSkeleton />
            <UnitCardSkeleton />
          </div>
        )}
        {!loading && displayedUnits.map((unit) => (
          <UnitCard key={unit.unit} unit={unit} onStart={() => onStart(unit.unit, 'new')} />
        ))}
        {!loading && catalog && displayedUnits.length === 0 && (
          <div className={styles.emptyBox}>
            {unitSearch.trim() ? (
              <div style={{ color: '#8A7E6B' }}>没有找到匹配的单元，请尝试其他关键词。</div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                <BookOutlined style={{ fontSize: 32, color: '#C9A45C', marginBottom: 10, display: 'block' }} />
                <div style={{ fontSize: 15, fontWeight: 800, color: '#17352F' }}>
                  {selectedGrade === '初一' ? '七年级' : selectedGrade === '初二' ? '八年级' : '九年级'}{selectedVolume || '上册'}词库录入中
                </div>
                <div style={{ fontSize: 12.5, color: '#8A7E6B', marginTop: 6, marginBottom: 14, lineHeight: 1.5 }}>
                  教研老师正在通过 Codex 录入中考同步词汇库，您可以先背诵已全面开放的七年级上册
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

