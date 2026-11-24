'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { EnglishIntroWord } from './EnglishIntroWord'
import styles from './SplashScreen.module.css'

const INTRO_RIBBON = 'M651 141 C677 126 690 144 675 160 C644 191 571 190 519 169 C473 151 425 129 393 104 C409 83 395 63 370 66'
const HALO = 'M0 -49 C10 -56 21 -48 26 -41 C40 -42 48 -31 46 -20 C58 -11 56 3 49 12 C53 26 43 38 30 38 C22 51 8 54 -2 47 C-15 54 -28 48 -33 38 C-48 36 -54 24 -49 12 C-59 2 -56 -12 -47 -20 C-48 -34 -38 -43 -25 -41 C-19 -51 -8 -55 0 -49 Z'

export function SplashScreen({ onDone, duration = 7000 }: { onDone: () => void; duration?: number }) {
  const id = useId()
  const gradientId = `${id}-ink`
  const apertureId = `${id}-aperture`
  const [exiting, setExiting] = useState(false)
  const completed = useRef(false)
  const skipTimer = useRef<number | null>(null)
  const exitTimer = useRef<number | null>(null)
  const doneTimer = useRef<number | null>(null)
  const totalDuration = Number.isFinite(duration) ? Math.max(300, duration) : 7000

  useEffect(() => {
    completed.current = false
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const runDuration = reduced ? Math.min(900, totalDuration) : totalDuration
    // 在动画结束前提前触发 exiting，确保孔径展开时遮罩的 pointer-events 立即变为 none，绝不阻挡底层点击
    exitTimer.current = window.setTimeout(() => setExiting(true), Math.max(0, runDuration - (reduced ? 180 : 400)))
    doneTimer.current = window.setTimeout(() => {
      if (completed.current) return
      completed.current = true
      onDone()
    }, runDuration)
    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current)
      if (doneTimer.current !== null) window.clearTimeout(doneTimer.current)
      if (skipTimer.current !== null) window.clearTimeout(skipTimer.current)
    }
  }, [onDone, totalDuration])

  const handleSkip = () => {
    if (completed.current || exiting) return
    setExiting(true)
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current)
    if (doneTimer.current !== null) window.clearTimeout(doneTimer.current)
    skipTimer.current = window.setTimeout(() => {
      if (completed.current) return
      completed.current = true
      onDone()
    }, 180)
  }

  return (
    <div
      className={`${styles.root}${exiting ? ` ${styles.exiting}` : ''}`}
      style={{ '--intro-duration': `${totalDuration}ms` } as CSSProperties}
      aria-label="Muzhe Joy，牧哲学堂正在开启"
      data-testid="muzhe-intro"
    >
      <svg className={styles.curtain} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id={apertureId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
            <rect width="100" height="100" fill="white" />
            <g transform="translate(50 50)"><path className={styles.aperture} d={HALO} fill="black" /></g>
          </mask>
          <radialGradient id={`${id}-warm-wash`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17 29) scale(57 70)">
            <stop className={styles.orangeGlow} stopOpacity=".16" />
            <stop offset="1" className={styles.orangeGlow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-teal-wash`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(87 67) scale(56 66)">
            <stop className={styles.tealGlow} stopOpacity=".12" />
            <stop offset="1" className={styles.tealGlow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-paper-light`}>
            <stop className={styles.paperGlow} stopOpacity=".9" />
            <stop offset="1" className={styles.paperGlow} stopOpacity="0" />
          </radialGradient>
        </defs>
        <g mask={`url(#${apertureId})`}>
          <rect width="100" height="100" className={styles.backdrop} />
          <rect width="100" height="100" fill={`url(#${id}-warm-wash)`} />
          <rect width="100" height="100" fill={`url(#${id}-teal-wash)`} />
          <ellipse cx="50" cy="48" rx="42" ry="45" fill={`url(#${id}-paper-light)`} />
          <path className={styles.bookOrange} d="M-8 76 C16 76 37 93 50 111 C63 93 84 76 108 76" fill="none" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <path className={styles.bookTeal} d="M-5 84 C20 82 39 98 50 115 C61 98 80 82 105 84" fill="none" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <button className={styles.skip} type="button" onClick={handleSkip} disabled={exiting} title="跳过动画，进入登录页" data-motion-ignore>
        跳过动画
        <svg viewBox="0 0 16 16" width="18" height="18" fill="none" aria-hidden="true">
          <path d="M3 8h9M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h1 className={styles.stage} aria-label="Muzhe Joy">
        <svg className={styles.artwork} viewBox="0 0 740 240" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="76" y1="120" x2="657" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0" className={styles.rose} />
              <stop offset=".23" className={styles.peach} />
              <stop offset=".39" className={styles.gold} />
              <stop offset=".53" className={styles.mint} />
              <stop offset=".67" className={styles.sky} />
              <stop offset=".81" className={styles.lilac} />
              <stop offset="1" className={styles.rose} />
            </linearGradient>
          </defs>
          <EnglishIntroWord gradientId={gradientId} />
          <g stroke={`url(#${gradientId})`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <path className={styles.ribbon} d={INTRO_RIBBON} pathLength="1" />
          </g>
        </svg>
      </h1>
      <div className={styles.emblem} aria-hidden="true">
        <svg viewBox="-100 -100 200 200" fill="none">
          <defs>
            <linearGradient id={`${gradientId}-halo`} x1="-55" y1="0" x2="55" y2="0" gradientUnits="userSpaceOnUse">
              <stop className={styles.gold} /><stop offset=".35" className={styles.mint} />
              <stop offset=".65" className={styles.sky} /><stop offset="1" className={styles.lilac} />
            </linearGradient>
          </defs>
          <g stroke={`url(#${gradientId}-halo)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path className={styles.halo} d={HALO} pathLength="1" />
            <path className={styles.echoOne} d={HALO} /><path className={styles.echoTwo} d={HALO} /><path className={styles.echoThree} d={HALO} />
          </g>
          {/* Vector trace of the supplied mark: cap, tassel and open book. */}
          <g className={styles.logo} transform="translate(-50 -50) scale(.08)">
            <g className={styles.logoOrange}>
              <path d="M305 240H942Q948 240 948 246V267Q948 273 942 273H902Q889 273 889 285V430Q889 435 884 435H877Q872 435 872 430V285Q872 274 861 274H806Q793 274 793 286V339Q793 345 787 345H457Q451 345 451 339V279Q451 273 445 273H305Q300 273 300 268V245Q300 240 305 240Z" />
              <path d="M456 372H789Q793 372 793 377V414C793 511 718 577 623 577S451 509 451 414V377Q451 372 456 372Z" />
              <path d="M881 450C887 450 888 461 894 465L908 470Q916 473 910 480L904 488V503Q904 512 896 509L882 503 867 509Q859 512 859 503V488L852 480Q847 473 855 470L869 465C875 462 875 450 881 450Z" />
              <path d="M112 500 621 637 1141 500 939 780Q936 785 930 788C809 831 706 890 620 965 534 887 430 832 306 788Q299 785 295 778Z" />
            </g>
            <g className={styles.logoTeal}>
              <path d="M217 814C379 829 508 906 604 1019 481 942 359 890 214 889Z" />
              <path d="M1019 814C857 829 728 906 632 1019 755 942 877 890 1022 889Z" />
            </g>
          </g>
        </svg>
      </div>
      <div className={styles.brandSignature} aria-hidden="true">
        <span className={styles.schoolName}>牧哲学堂</span>
        <span className={styles.schoolMotto}>不怕学浅，唯恐志短</span>
      </div>
    </div>
  )
}
