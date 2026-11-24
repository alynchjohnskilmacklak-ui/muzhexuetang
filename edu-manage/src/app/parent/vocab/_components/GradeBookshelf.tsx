'use client'

import React from 'react'
import { BookOutlined, CheckCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { VocabCatalog } from './types'
import styles from '../vocab.module.css'

interface GradeBookshelfProps {
  catalog: VocabCatalog | null
  currentGrade: string
  currentVolume: string
  onBack: () => void
  onSelectBook: (grade: string, volume: string) => void
}

const BOOK_LIST = [
  {
    grade: '初一',
    volume: '上册',
    badge: '7上',
    title: '七年级上册',
    subtitle: '人教版 2024 新教材 · 预备篇至 Unit 7',
    tag: '基础衔接',
    defaultWords: 629,
    cover: '/images/textbooks/g7a.webp',
  },
  {
    grade: '初一',
    volume: '下册',
    badge: '7下',
    title: '七年级下册',
    subtitle: '人教版 Go for it! · 下册核心单元',
    tag: '下册必背',
    defaultWords: 461,
    cover: '/images/textbooks/g7b.webp',
  },
  {
    grade: '初二',
    volume: '上册',
    badge: '8上',
    title: '八年级上册',
    subtitle: '人教版 Go for it! · 8大正式核心单元',
    tag: '初二核心',
    defaultWords: 549,
    cover: '/images/textbooks/g8a.webp',
  },
  {
    grade: '初二',
    volume: '下册',
    badge: '8下',
    title: '八年级下册',
    subtitle: '人教版 Go for it! · 初二拔高与核心扩展',
    tag: '能力提升',
    defaultWords: 603,
    cover: '/images/textbooks/g8b.webp',
  },
  {
    grade: '初三',
    volume: '上册',
    badge: '9上',
    title: '九年级上册',
    subtitle: '人教版 Go for it! · 中考必考重难点词汇',
    tag: '中考强化',
    defaultWords: 580,
    cover: '/images/textbooks/g9a.webp',
  },
  {
    grade: '初三',
    volume: '下册',
    badge: '9下',
    title: '九年级下册',
    subtitle: '人教版 Go for it! · 中考冲刺与总复习精粹',
    tag: '中考冲刺',
    defaultWords: 520,
    cover: '/images/textbooks/g9b.webp',
  },
]

export function GradeBookshelf({
  catalog,
  currentGrade,
  currentVolume,
  onBack,
  onSelectBook,
}: GradeBookshelfProps) {
  return (
    <div className={styles.page}>
      <button
        type="button"
        className="mobile-shell-back"
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 8, border: 0, background: 'transparent', color: '#14574D', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >
        <LeftOutlined /> 返回英语特训
      </button>
      {/* 标题区：简约通透 */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#17352F', letterSpacing: -0.3 }}>
          选择教材与年级分册
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7A694F' }}>
          七至九年级全 6 册 · 人教版同步单元词汇库
        </p>
      </div>

      {/* 6 本分册列表：带真实高清压缩封面图 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {BOOK_LIST.map((book) => {
          const isSelected = currentGrade === book.grade && currentVolume === book.volume
          const bookInDb = (catalog?.availableBooks || []).find(
            (b) => b.grade === book.grade && b.volume === book.volume
          )
          const wordCount = bookInDb ? bookInDb.count : book.defaultWords
          const isOpen = Boolean(bookInDb) || wordCount > 0

          return (
            <div
              key={`${book.grade}-${book.volume}`}
              onClick={() => onSelectBook(book.grade, book.volume)}
              style={{
                background: isSelected ? 'linear-gradient(135deg, #FFFFFF 0%, #F3F9F6 100%)' : '#FFFFFF',
                borderRadius: 18,
                padding: '14px 16px',
                border: isSelected ? '1.5px solid #14574D' : '1px solid rgba(20, 87, 77, 0.1)',
                boxShadow: isSelected
                  ? '0 6px 18px rgba(20, 87, 77, 0.12)'
                  : '0 2px 8px rgba(0, 0, 0, 0.03)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                {/* 拟物真实立体课本封面 */}
                <div
                  style={{
                    position: 'relative',
                    width: 54,
                    height: 74,
                    minWidth: 54,
                    maxWidth: 54,
                    borderRadius: '4px 8px 8px 4px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.14), -1.5px 0 0 rgba(0, 0, 0, 0.1) inset',
                    flexShrink: 0,
                    background: '#EAE6DF',
                  }}
                >
                  <img
                    src={book.cover}
                    alt={book.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  {/* 书脊微折痕光泽 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 5,
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(0,0,0,0.12) 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* 封面微角标 */}
                  <div
                    style={{
                      position: 'absolute',
                      right: 3,
                      bottom: 3,
                      background: 'rgba(20, 87, 77, 0.88)',
                      color: '#FFFFFF',
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '1px 4px',
                      borderRadius: 4,
                      lineHeight: 1.1,
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    {book.badge}
                  </div>
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17352F' }}>
                      {book.title}
                    </h3>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: isSelected ? 'rgba(20, 87, 77, 0.12)' : '#F0F5F2',
                        color: '#14574D',
                      }}
                    >
                      {book.tag}
                    </span>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: '#14574D',
                          color: '#FFFFFF',
                        }}
                      >
                        当前学习
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      margin: '2px 0 6px',
                      fontSize: 12,
                      color: '#7A694F',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {book.subtitle}
                  </p>
                  <div style={{ fontSize: 12, color: '#8A7E6B' }}>
                    收录重点词汇 <strong style={{ color: '#17352F' }}>{wordCount}</strong> 词
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {isSelected ? (
                  <button
                    type="button"
                    style={{
                      all: 'unset',
                      background: '#14574D',
                      color: '#FFFFFF',
                      borderRadius: 999,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 2px 8px rgba(20, 87, 77, 0.25)',
                    }}
                  >
                    <span>进入背诵</span>
                    <RightOutlined style={{ fontSize: 9 }} />
                  </button>
                ) : (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 12,
                      color: '#14574D',
                      fontWeight: 700,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: 'rgba(20, 87, 77, 0.06)',
                    }}
                  >
                    <span>{isOpen ? '开始背诵' : '录入中'}</span>
                    <RightOutlined style={{ fontSize: 9 }} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
