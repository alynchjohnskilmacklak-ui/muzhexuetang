'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Tabs } from 'antd'
import dynamic from 'next/dynamic'
import {
  CrownOutlined,
  GiftOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { resolveTier, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'
import { BenefitsLazyTab } from './_benefits-tab'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// 薪酬福利：我的薪资 / 我的福利 合一（动态加载）
const SalaryTab = dynamic(() => import('../salary/page'), { ssr: false })

export default function TeacherCompensationPage() {
  const [tab, setTab] = useState('salary')
  const { data: dashData } = useSWR('/api/teacher/dashboard', fetcher)
  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const theme = TIER_THEME[currentTier]

  return (
    <div className="teacher-compensation-page">
      {/* 紧凑高级梯队主题 Banner：自适应老师等级配色，高对比度绝不惨白，纵向空间克制 */}
      <div
        className="compensation-hero-card"
        style={{
          background: theme.heroBg,
          boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        }}
      >
        <div className="hero-content-wrap">
          <div className="hero-left">
            <div className="hero-tags-row">
              <span className="hero-badge" style={{ background: theme.accent, color: '#1a1201' }}>
                {theme.roleTag || theme.name}
              </span>
              <span className="hero-subtag">
                <CrownOutlined /> 权益保障体系
              </span>
            </div>
            <h2 className="hero-title">薪酬与成长福利</h2>
            <p className="hero-desc">
              多劳多得 · 优劳优酬 · 课时与反馈即时计提 · 等级进阶关怀
            </p>
          </div>

          <div className="hero-pill-info">
            <div className="pill-item">
              <span className="pill-k">当前等级</span>
              <span className="pill-v" style={{ color: theme.accent }}>{theme.name}</span>
            </div>
            <div className="pill-sep" />
            <div className="pill-item">
              <span className="pill-k">计提机制</span>
              <span className="pill-v">考勤反馈即时结</span>
            </div>
          </div>
        </div>
      </div>

      {/* 选项卡容器 */}
      <div className="compensation-tabs-box">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          destroyInactiveTabPane
          items={[
            {
              key: 'salary',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14.5, fontWeight: 650 }}>
                  <WalletOutlined /> 我的薪资流水
                </span>
              ),
              children: <SalaryTab />,
            },
            {
              key: 'benefits',
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14.5, fontWeight: 650 }}>
                  <GiftOutlined /> 教师等级与福利特权
                </span>
              ),
              children: <BenefitsLazyTab />,
            },
          ]}
        />
      </div>

      <style jsx>{`
        .teacher-compensation-page {
          width: 100%;
          max-width: 100%;
        }

        .compensation-hero-card {
          padding: 16px 20px;
          border-radius: 16px;
          color: #ffffff;
          margin-bottom: 16px;
        }

        .hero-content-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .hero-left {
          min-width: 240px;
          flex: 1;
        }

        .hero-tags-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .hero-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 750;
          padding: 2px 9px;
          border-radius: 999px;
          letter-spacing: 0.2px;
        }

        .hero-subtag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          padding: 2px 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(4px);
        }

        .hero-title {
          margin: 6px 0 3px;
          color: #ffffff;
          font-size: clamp(18px, 3.5vw, 22px);
          font-weight: 800;
          line-height: 1.25;
        }

        .hero-desc {
          margin: 0;
          color: rgba(255, 255, 255, 0.85);
          font-size: 12px;
          line-height: 1.5;
        }

        .hero-pill-info {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 8px 14px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(8px);
        }

        .pill-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1px;
        }

        .pill-k {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
        }

        .pill-v {
          font-size: 13px;
          font-weight: 750;
          color: #ffffff;
          white-space: nowrap;
        }

        .pill-sep {
          width: 1px;
          height: 22px;
          background: rgba(255, 255, 255, 0.18);
        }

        .compensation-tabs-box :global(.ant-tabs-nav) {
          margin-bottom: 16px;
        }

        .compensation-tabs-box :global(.ant-tabs-tab) {
          padding: 8px 14px;
        }

        @media (max-width: 768px) {
          .compensation-hero-card {
            padding: 14px 14px;
            border-radius: 14px;
            margin-bottom: 12px;
          }

          .hero-content-wrap {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .hero-pill-info {
            width: 100%;
            justify-content: space-between;
            padding: 6px 12px;
          }
        }
      `}</style>
    </div>
  )
}
