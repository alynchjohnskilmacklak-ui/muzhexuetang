'use client'

import React from 'react'
import { Segmented, Select } from 'antd'
import {
  BookOutlined,
  EditOutlined,
  FireOutlined,
  HistoryOutlined,
  RightOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { VocabCatalog } from './types'
import styles from '../vocab.module.css'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import { shouldSearchChoices, shouldUseInlineChoices } from '@/lib/choice-thresholds'

interface Child {
  id: string
  name: string
  grade: string | null
  membershipLevel?: string | null
}

interface EnglishHubProps {
  childList: Child[]
  activeChildId: string
  onChildChange: (id: string) => void
  catalog: VocabCatalog | null
  selectedGrade?: string
  selectedVolume?: string
  onSelectModule: (moduleKey: 'vocab' | 'verbs' | 'grammar' | 'composition') => void
}

export function EnglishHub({
  childList,
  activeChildId,
  onChildChange,
  catalog,
  onSelectModule,
}: EnglishHubProps) {
  const stats = catalog?.stats ?? { total: 0, mastered: 0, learning: 0, wrong: 0 }
  const totalPercent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0

  return (
    <div className={styles.page}>
      {/* 顶部品牌大厅标牌 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <img
          src="/images/logo-small-128.webp"
          alt="牧哲学堂"
          style={{
            width: 42,
            height: 42,
            minWidth: 42,
            maxWidth: 42,
            borderRadius: 12,
            objectFit: 'cover',
            boxShadow: '0 4px 12px rgba(20, 87, 77, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#17352F', letterSpacing: -0.3 }}>
              牧哲英语特训馆
            </h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(20, 87, 77, 0.08)', color: '#14574D' }}>
              中考突破
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7A694F' }}>
            单词速记 · 动词变位 · 语法突破 · 满分写作
          </p>
        </div>
      </div>

      {/* 极简高雅的学员选择栏：只在主厅出现一次，后续子页面彻底免重复 */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '8px 12px 8px 14px',
          border: '1px solid rgba(20, 87, 77, 0.12)',
          boxShadow: '0 2px 8px rgba(20, 87, 77, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(20, 87, 77, 0.08)',
              color: '#14574D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
            }}
          >
            <UserOutlined />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#17352F' }}>特训学员</span>
            <span style={{ fontSize: 11, color: '#8A7E6B' }}>进度全端自动同步</span>
          </div>
        </div>

        <div className={styles.childSelectorWrap}>
          {shouldUseInlineChoices(childList.length) ? (
            childList.length === 1 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 14px',
                  borderRadius: 999,
                  background: '#14574D',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(20, 87, 77, 0.25)',
                }}
              >
                {childList[0].name}
              </span>
            ) : (
              <Segmented
                aria-label="选择学员"
                className={styles.childSegmented}
                value={activeChildId || undefined}
                onChange={(value) => onChildChange(String(value))}
                options={childList.map((child) => ({ value: child.id, label: child.name }))}
              />
            )
          ) : (
            <Select
              style={{ minWidth: 140 }}
              value={activeChildId || undefined}
              placeholder="请选择学员"
              onChange={onChildChange}
              options={childList.map((child) => ({ value: child.id, label: child.name }))}
              showSearch={shouldSearchChoices(childList.length)}
              optionFilterProp="label"
              placement="bottomLeft"
              listHeight={240}
            />
          )}
        </div>
      </div>

      {/* 今日进度总览卡片 */}
      <div
        style={{
          background: 'linear-gradient(145deg, #10483F 0%, #165E53 50%, #1E7063 100%)',
          borderRadius: 20,
          padding: '18px 20px',
          color: '#ffffff',
          marginBottom: 18,
          boxShadow: '0 10px 28px rgba(16, 72, 63, 0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#FFE399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <FireOutlined /> 初中核心词汇攻坚
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>
              <AnimatedNumber value={stats.total} /> <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.85 }}>词已开放</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>当前掌握进度</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#FFE399', marginTop: 2 }}>
              {totalPercent}%
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          <div style={{ width: `${totalPercent}%`, height: '100%', borderRadius: 999, background: '#FFE399', transition: 'width 0.4s ease' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, opacity: 0.85 }}>
          <span>已掌握 {stats.mastered} 词</span>
          <span>待复习/巩固 {stats.learning + stats.wrong} 词</span>
        </div>
      </div>

      {/* 核心板块选择标题 */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 2px 12px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#17352F', margin: 0 }}>
          中考英语四大特训航道
        </h2>
        <span style={{ fontSize: 11.5, color: '#8C7E6A' }}>独立专精 · 逐项击破</span>
      </div>

      {/* 沉浸式特训航道：上下分层经典大卡，彻底杜绝文字折行挤压 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {/* 1. 同步单词速记（主推核心） */}
        <div
          onClick={() => onSelectModule('vocab')}
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5FAF7 100%)',
            borderRadius: 18,
            padding: '16px 18px',
            border: '1.5px solid rgba(20, 87, 77, 0.2)',
            boxShadow: '0 4px 14px rgba(20, 87, 77, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* 头部：图标 + 标题单行舒展 + 状态标签 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #14574D 0%, #1F7366 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                  boxShadow: '0 3px 8px rgba(20, 87, 77, 0.25)',
                }}
              >
                <BookOutlined />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17352F', whiteSpace: 'nowrap' }}>
                同步单词速记
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: '#14574D', color: '#FFFFFF', flexShrink: 0 }}>
              已开放 · 6册同步
            </span>
          </div>

          {/* 简介 */}
          <p style={{ margin: '8px 0 12px', fontSize: 12.5, color: '#6A5C47', lineHeight: 1.45 }}>
            人教版初中 7~9 年级全 6 册 · 艾宾浩斯记忆曲线智能通关
          </p>

          {/* 底部行动条 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(20, 87, 77, 0.08)' }}>
            <span style={{ fontSize: 12, color: '#7A694F' }}>
              收录 <strong>{stats.total}</strong> 词 · 掌握率 <strong>{totalPercent}%</strong>
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#14574D', fontSize: 12.5, fontWeight: 800 }}>
              <span>进入选册背词</span>
              <RightOutlined style={{ fontSize: 10 }} />
            </div>
          </div>
        </div>

        {/* 2. 动词变位特训 */}
        <div
          onClick={() => onSelectModule('verbs')}
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FCF8F2 100%)',
            borderRadius: 18,
            padding: '16px 18px',
            border: '1px solid rgba(201, 164, 92, 0.25)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #D4A346 0%, #BA892D 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                  boxShadow: '0 3px 8px rgba(186, 137, 45, 0.25)',
                }}
              >
                <ThunderboltOutlined />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17352F', whiteSpace: 'nowrap' }}>
                动词变位特训
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: '#FCF5EC', color: '#8A6517', flexShrink: 0 }}>
              已开放 · 规律速记
            </span>
          </div>

          <p style={{ margin: '8px 0 12px', fontSize: 12.5, color: '#6A5C47', lineHeight: 1.45 }}>
            不规则过去式/过去分词 · 2024 人教版七至九年级词汇与易混变位
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(201, 164, 92, 0.15)' }}>
            <span style={{ fontSize: 12, color: '#8C7E6A' }}>常考变位 · 三态英式音标</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#8A6517', fontSize: 12.5, fontWeight: 800 }}>
              <span>进入特训</span>
              <RightOutlined style={{ fontSize: 10 }} />
            </div>
          </div>
        </div>

        {/* 3. 中考核心语法 */}
        <div
          onClick={() => onSelectModule('grammar')}
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F4F9F8 100%)',
            borderRadius: 18,
            padding: '16px 18px',
            border: '1px solid rgba(29, 158, 117, 0.2)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #1D9E75 0%, #157E5D 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                  boxShadow: '0 3px 8px rgba(29, 158, 117, 0.25)',
                }}
              >
                <ToolOutlined />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17352F', whiteSpace: 'nowrap' }}>
                中考核心语法
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: '#F0F9F5', color: '#1D9E75', flexShrink: 0 }}>
              已开放 · 考点突破
            </span>
          </div>

          <p style={{ margin: '8px 0 12px', fontSize: 12.5, color: '#6A5C47', lineHeight: 1.45 }}>
            六种时态、语态、动词形式、句型从句与词法
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(29, 158, 117, 0.12)' }}>
            <span style={{ fontSize: 12, color: '#8C7E6A' }}>翻卡精学与题型微练</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1D9E75', fontSize: 12.5, fontWeight: 800 }}>
              <span>进入特训</span>
              <RightOutlined style={{ fontSize: 10 }} />
            </div>
          </div>
        </div>

        {/* 4. 满分作文句库 */}
        <div
          onClick={() => onSelectModule('composition')}
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FCF8F2 100%)',
            borderRadius: 18,
            padding: '16px 18px',
            border: '1px solid rgba(201, 164, 92, 0.25)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #DE8C43 0%, #C7752E 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                  boxShadow: '0 3px 8px rgba(199, 117, 46, 0.25)',
                }}
              >
                <EditOutlined />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#17352F', whiteSpace: 'nowrap' }}>
                满分作文句库
              </h3>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: '#FCF5EC', color: '#8A6517', flexShrink: 0 }}>
              已开放 · 主题写作
            </span>
          </div>

          <p style={{ margin: '8px 0 12px', fontSize: 12.5, color: '#6A5C47', lineHeight: 1.45 }}>
            高频表达句型 · 主题范文拆解与迁移练习
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(201, 164, 92, 0.15)' }}>
            <span style={{ fontSize: 12, color: '#8C7E6A' }}>句型对照与原创范文</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#8A6517', fontSize: 12.5, fontWeight: 800 }}>
              <span>进入特训</span>
              <RightOutlined style={{ fontSize: 10 }} />
            </div>
          </div>
        </div>
      </div>

      {/* 最近特训记录：精致大厂级卡片，全屏仅此一处展示 */}
      {catalog && catalog.recentSessions.length > 0 && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '16px 16px 14px',
            border: '1px solid rgba(20, 87, 77, 0.12)',
            boxShadow: '0 2px 10px rgba(20, 87, 77, 0.04)',
            marginBottom: 24,
          }}
        >
          {/* 顶部标题行 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              paddingBottom: 10,
              borderBottom: '1px solid rgba(20, 87, 77, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'rgba(20, 87, 77, 0.08)',
                  color: '#14574D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                }}
              >
                <HistoryOutlined />
              </div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#17352F' }}>
                最近特训记录
              </h3>
            </div>
            <span style={{ fontSize: 11.5, color: '#8A7E6B' }}>
              近 {Math.min(catalog.recentSessions.length, 4)} 次特训
            </span>
          </div>

          {/* 记录列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {catalog.recentSessions.slice(0, 4).map((session) => {
              const percent = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0
              const isPerfect = percent === 100
              const isGood = percent >= 80

              const formattedDate = new Date(session.finishedAt).toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: isPerfect ? 'linear-gradient(135deg, #FCFBF7 0%, #F8F5EE 100%)' : '#FAF8F5',
                    border: isPerfect ? '1px solid rgba(201, 164, 92, 0.25)' : '1px solid rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {/* 左侧信息 */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: '#17352F',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {session.unit ?? '全部单元特训'}
                      </span>
                      {isPerfect && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: '#8A6517',
                            background: '#FCF4DF',
                            padding: '1px 6px',
                            borderRadius: 999,
                          }}
                        >
                          满分通关
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#8A7E6B', marginTop: 3 }}>
                      {formattedDate} · 共特训 {session.total} 词
                    </div>
                  </div>

                  {/* 右侧得分胶囊 */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: 3,
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: isPerfect
                          ? 'rgba(201, 164, 92, 0.16)'
                          : isGood
                            ? 'rgba(20, 87, 77, 0.08)'
                            : 'rgba(0, 0, 0, 0.05)',
                        color: isPerfect ? '#8A6517' : isGood ? '#14574D' : '#6A5C47',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      <span>答对 {session.correct}/{session.total}</span>
                      <span style={{ fontSize: 10, opacity: 0.85 }}>({percent}%)</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
