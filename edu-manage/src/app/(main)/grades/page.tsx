'use client'

import Link from 'next/link'
import { ArrowRightOutlined, BookOutlined, ReadOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'

const learningModules = [
  {
    href: '/grades/practice',
    title: '题库练习',
    description: '查看学员练习次数、答题情况、正确率和错题记录。',
    hint: '练习统计 · 学员详情',
    icon: <BookOutlined />,
    accent: 'var(--color-primary)',
    surface: 'var(--color-primary-bg)',
  },
  {
    href: '/grades/vocabulary',
    title: '背诵情况',
    description: '查看家长端单词练习、教材单元进度和最近学习记录。',
    hint: '背诵进度 · 练习记录',
    icon: <ReadOutlined />,
    accent: 'var(--color-brand-gold)',
    surface: 'var(--color-brand-gold-bg)',
  },
]

export default function LearningStatisticsPage() {
  return (
    <PageLayout
      title="学习情况统计"
      subtitle="选择要查看的学习内容，进入对应统计页面。"
    >
      <main style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '8px 16px 28px' }}>
        <section
          aria-label="学习统计模块"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16 }}
        >
          {learningModules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="pressable"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                minHeight: 148,
                padding: '22px 24px',
                color: 'var(--color-ink)',
                textDecoration: 'none',
                borderRadius: 14,
                border: '1px solid var(--color-hairline)',
                background: 'var(--color-surface-1)',
                boxShadow: '0 8px 22px rgba(26,18,1,.045)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 56,
                  height: 56,
                  flex: '0 0 56px',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 16,
                  background: module.surface,
                  color: module.accent,
                  fontSize: 24,
                }}
              >
                {module.icon}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 18, lineHeight: 1.3, fontWeight: 750 }}>{module.title}</span>
                <span style={{ color: 'var(--color-ink-muted)', fontSize: 13, lineHeight: 1.55 }}>{module.description}</span>
                <span style={{ color: module.accent, fontSize: 12, fontWeight: 650, marginTop: 3 }}>{module.hint}</span>
              </span>
              <ArrowRightOutlined aria-hidden="true" style={{ flex: '0 0 auto', color: 'var(--color-ink-subtle)' }} />
            </Link>
          ))}
        </section>
        <p style={{ margin: '14px 2px 0', color: 'var(--color-ink-subtle)', fontSize: 12 }}>
          后续学习模块会继续汇总到这里。
        </p>
      </main>
    </PageLayout>
  )
}
