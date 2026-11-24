import type { CSSProperties } from 'react'
import cursive from './intro-glyphs/cursive.json'
import styles from './SplashScreen.module.css'

// The visible shapes are genuine cursive glyph outlines, with no added joins.
// MasaFont, SIL OFL 1.1: intro-glyphs/MASA-OFL.txt.
const TRACES = cursive.glyphs.flatMap((glyph, characterIndex) => glyph.traces.map((trace) => ({ ...trace, characterIndex })))
const TOTAL_LENGTH = TRACES.reduce((sum, trace) => sum + trace.length, 0)
const TIMED_TRACES = TRACES.map((trace, index) => ({
  ...trace,
  start: .04 + .53 * TRACES.slice(0, index).reduce((sum, previous) => sum + previous.length, 0) / TOTAL_LENGTH,
  duration: .53 * trace.length / TOTAL_LENGTH,
}))

export function ChineseIntroWord({ id, gradientId }: { id: string; gradientId: string }) {
  const wordMask = `${id}-cursive-word`
  return (
    <g className={styles.lettering}>
      <defs>
        {cursive.glyphs.map((glyph, characterIndex) => (
          <mask key={glyph.character} id={`${id}-reveal-${characterIndex}`} maskUnits="userSpaceOnUse" x="-256" y="-256" width="2560" height="2304">
            {TIMED_TRACES.filter((trace) => trace.characterIndex === characterIndex).map((trace, index) => (
              <path
                key={index}
                className={styles.characterStroke}
                style={{
                  '--stroke-delay': `calc(var(--intro-duration) * ${trace.start})`,
                  '--stroke-duration': `calc(var(--intro-duration) * ${trace.duration})`,
                } as CSSProperties}
                d={trace.path}
                pathLength="1"
                fill="none"
                stroke="white"
                strokeWidth={trace.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </mask>
        ))}
        <mask id={wordMask} maskUnits="userSpaceOnUse" x="0" y="0" width="740" height="240">
          {cursive.glyphs.map((glyph, index) => {
            const last = TIMED_TRACES.filter((trace) => trace.characterIndex === index).at(-1)!
            return (
              <g key={glyph.character} transform={`translate(${glyph.x} ${glyph.baseline}) scale(${glyph.scale} -${glyph.scale})`} fill="white">
                <path d={glyph.outline} mask={`url(#${id}-reveal-${index})`} />
                <path
                  className={styles.glyphComplete}
                  style={{ '--glyph-done': `calc(var(--intro-duration) * ${last.start + last.duration})` } as CSSProperties}
                  d={glyph.outline}
                />
              </g>
            )
          })}
        </mask>
      </defs>
      <rect width="740" height="240" fill={`url(#${gradientId})`} mask={`url(#${wordMask})`} />
    </g>
  )
}
