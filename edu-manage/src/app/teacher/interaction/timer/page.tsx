'use client'

import { useEffect, useRef } from 'react'
import { useInteractionTimer, formatClock } from '../_components/shell'
import styles from '../interaction.module.css'

const PRESETS = [
  { seconds: 1 * 60, label: '1 分钟' },
  { seconds: 2 * 60, label: '2 分钟' },
  { seconds: 3 * 60, label: '3 分钟' },
  { seconds: 5 * 60, label: '5 分钟' },
  { seconds: 10 * 60, label: '10 分钟' },
]

export default function TimerPage() {
  const timer = useInteractionTimer()
  const displayRef = useRef<HTMLDivElement>(null)

  // 归零时给一次视觉冲击，配合铃声与震动
  useEffect(() => {
    const node = displayRef.current
    if (!node) return
    if (timer.remaining === 0 && !timer.running) {
      node.classList.add(styles.timerDone)
      const handle = window.setTimeout(() => node.classList.remove(styles.timerDone), 3000)
      return () => window.clearTimeout(handle)
    }
    return undefined
  }, [timer.remaining, timer.running])

  const progress = timer.durationSec > 0 ? 1 - timer.remaining / timer.durationSec : 0
  const warning = timer.remaining > 0 && timer.remaining <= 30

  return (
    <>
      <section className={styles.timerCard}>
        <div
          ref={displayRef}
          className={`${styles.timerDisplay} ${warning ? styles.timerWarn : ''} ${timer.running ? styles.timerRunning : ''}`}
        >
          {formatClock(timer.remaining)}
        </div>
        <div className={styles.timerTrack}>
          <div className={styles.timerFill} style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
        </div>

        <div className={styles.timerPresets}>
          {PRESETS.map((preset) => (
            <button
              key={preset.seconds}
              type="button"
              className={`${styles.chip} ${timer.durationSec === preset.seconds ? styles.chipActive : ''}`}
              onClick={() => timer.setDuration(preset.seconds)}
            >
              {preset.label}
            </button>
          ))}
          <button type="button" className={styles.chip} onClick={() => timer.addTime(30)}>
            +30 秒
          </button>
          <button type="button" className={styles.chip} onClick={() => timer.addTime(60)}>
            +1 分钟
          </button>
        </div>

        <div className={styles.timerActions}>
          {timer.running ? (
            <button type="button" className={styles.primaryBtn} onClick={timer.pause}>暂停</button>
          ) : (
            <button type="button" className={styles.primaryBtn} onClick={timer.start}>
              {timer.remaining > 0 && timer.remaining < timer.durationSec ? '继续' : '开始计时'}
            </button>
          )}
          <button type="button" className={styles.ghostBtn} onClick={timer.reset}>归零</button>
        </div>

        <p className={styles.timerHint}>
          切换到其他页面计时不会中断，顶部会显示剩余时间。计时以结束时刻为准，息屏后再回来也不会走慢。
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>提醒</h2>
        </div>
        <label className={styles.switchRow}>
          <input
            type="checkbox"
            checked={timer.soundOn}
            onChange={(event) => timer.setSoundOn(event.target.checked)}
          />
          <span>清脆钟琴铃声（高音量课堂提醒）</span>
        </label>
        <label className={styles.switchRow}>
          <input type="checkbox" checked readOnly />
          <span>震动提醒（安卓支持，iPhone 浏览器不支持网页震动）</span>
        </label>
        <button type="button" className={styles.smallBtn} onClick={timer.testAlert}>试听一次</button>
        <p className={styles.legend}>
          时间到会响起清脆穿透的课堂钟声；安卓支持震动，iPhone 浏览器只靠铃声和屏幕闪烁。
          浏览器会限制自动播放，首次需点一次「开始计时」或「试听」才能激活声音。
        </p>
      </section>
    </>
  )
}
