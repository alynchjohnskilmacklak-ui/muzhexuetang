import { Fragment, type ReactNode, type CSSProperties } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/** 上标/下标/换行的轻量解析：把题库数据里的 `^2`/`^{...}` 渲染为上标，`_2`/`_{...}` 渲染为下标。 */
function renderPlain(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /(\^\{[^{}]*\}|\^[0-9]+|_\{[^{}]*\}|_[0-9]+|\n)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const token = m[0]
    const key = m.index
    if (token === '\n') {
      parts.push(<br key={`br${key}`} />)
    } else if (token.startsWith('^')) {
      parts.push(<sup key={`sup${key}`}>{token.slice(1).replace(/[{}]/g, '')}</sup>)
    } else {
      parts.push(<sub key={`sub${key}`}>{token.slice(1).replace(/[{}]/g, '')}</sub>)
    }
    last = m.index + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

const fracStyle: CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  verticalAlign: 'middle',
  margin: '0 3px',
  fontSize: '0.88em',
  lineHeight: 1.15,
}
const fracUnit: CSSProperties = { padding: '0 4px', whiteSpace: 'nowrap' }
const fracBar: CSSProperties = { borderTop: '1px solid currentColor', width: '100%', minWidth: '8px' }

/** 分式单元：括号块 / 数字 / 代数项（可带上标，上标只允许数字或 {} 块）。 */
const FRAC_UNIT = String.raw`(?:\([^()]*\)|\d+(?:\.\d+)?|[A-Za-zπ][A-Za-z0-9]*(?:\^\{[^{}]*\}|\^[0-9]+)?)`
const FRAC_RE = new RegExp(`(${FRAC_UNIT})\\/(${FRAC_UNIT})`, 'g')

/** 先拆出 A/B 分式（渲染为竖排分数），内部再处理上标/下标/换行。 */
function renderFrac(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = FRAC_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(...renderPlain(text.slice(last, m.index)))
    const numerator = m[1]
    const denominator = m[2]
    parts.push(
      <span key={`frac${m.index}`} style={fracStyle}>
        <span style={fracUnit}>{renderPlain(numerator)}</span>
        <span style={fracBar} />
        <span style={fracUnit}>{renderPlain(denominator)}</span>
      </span>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(...renderPlain(text.slice(last)))
  return parts
}

/** Render reviewed Markdown and LaTeX; never inject raw HTML from question data. */
export function MathText({ text, inline = false }: { text: string; inline?: boolean }) {
  const Tag = inline ? 'span' : 'div'
  // 分割 $...$ LaTeX 块与普通文本（题库数据绝大多数是普通文本）
  const segments = text.split(/(\$[^$]+\$)/g)
  return (
    <Tag>
      {segments.map((segment, i) => {
        if (segment.startsWith('$') && segment.endsWith('$') && segment.length > 2) {
          const html = katex.renderToString(segment.slice(1, -1), {
            throwOnError: false,
            displayMode: false,
            strict: false,
          })
          return <span key={`katex${i}`} dangerouslySetInnerHTML={{ __html: html }} />
        }
        return <Fragment key={`plain${i}`}>{renderFrac(segment)}</Fragment>
      })}
    </Tag>
  )
}
