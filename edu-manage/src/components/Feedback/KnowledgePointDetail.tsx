import type { KnowledgePointCard } from '@/lib/classroom-feedback/knowledge-point-cards'

export function KnowledgePointDetail({ card, defaultOpen = false, audience = 'teacher' }: {
  card: KnowledgePointCard
  defaultOpen?: boolean
  audience?: 'teacher' | 'parent'
}) {
  const referenceHint = audience === 'parent'
    ? '讲解内容为参考，供家长了解'
    : '讲解内容为参考，发布前请老师核对'
  return (
    <details open={defaultOpen || undefined} style={{
      border: '1px solid var(--color-hairline)', borderRadius: 14,
      background: 'var(--color-surface-1)', padding: '12px 14px',
      color: 'var(--color-ink)', maxWidth: '100%', overflowWrap: 'anywhere',
    }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, lineHeight: 1.6, minHeight: 30 }}>
        知识点详解：{card.topic}
        <span style={{ display: 'block', fontWeight: 400, fontSize: 12, color: 'var(--color-ink-muted)' }}>
          {card.grade} · {card.subject} · {card.edition} · {card.verified && card.source
            ? `已核实：${card.source}` : referenceHint}
        </span>
      </summary>
      <div style={{ display: 'grid', gap: 12, paddingTop: 12, fontSize: 14, lineHeight: 1.75 }}>
        <section><strong>定义</strong><p style={{ margin: '4px 0 0' }}>{card.definition}</p></section>
        {card.formulas.length > 0 && <section><strong>公式或方法</strong><div style={{ display: 'grid', gap: 6, marginTop: 5 }}>
          {card.formulas.map((formula, index) => <div key={`${index}-${formula}`} style={{
            padding: '7px 9px', borderRadius: 8, background: 'var(--color-surface-3)',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', overflowWrap: 'anywhere',
          }}>{formula}</div>)}
        </div></section>}
        {card.tips && card.tips.length > 0 && <section><strong>易错点与学习建议</strong><ul style={{ margin: '6px 0', paddingLeft: 22, lineHeight: 1.8 }}>
          {card.tips.map((tip, index) => <li key={`${index}-${tip}`}>{tip}</li>)}
        </ul></section>}
        {card.example && <section>
          <strong>示例</strong>
          <p style={{ margin: '4px 0' }}>{card.example.question}</p>
          <ol style={{ margin: '6px 0', paddingLeft: 22 }}>
            {card.example.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
          </ol>
          <div style={{ background: 'var(--color-primary-bg)', borderRadius: 8, padding: '7px 9px' }}>
            答案：{card.example.answer}
          </div>
        </section>}
      </div>
    </details>
  )
}
