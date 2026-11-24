import styles from './SplashScreen.module.css'

// Custom pen paths: a clear capital M, non-looping z, open counters and a
// conventional J. The two words stay connected internally and separated by space.
const MUZHE = 'M86 148 C92 123 99 94 105 77 Q108 68 111 80 L127 126 Q129 132 133 125 L163 78 Q169 68 166 82 L153 142 Q151 157 164 149 C171 145 176 138 180 129 C184 119 187 111 190 112 C193 113 180 145 190 151 C201 157 215 130 219 114 C216 130 209 146 219 151 C229 155 240 138 245 128 C248 120 251 116 255 116 L274 116 Q279 116 275 121 L252 145 Q248 149 255 149 L280 149 Q283 149 285 150 C292 129 302 99 309 78 C315 59 324 58 322 74 C320 96 299 134 285 150 C298 129 312 110 324 113 C339 119 314 146 328 151 C339 155 350 140 353 130 C361 116 379 109 380 119 C381 131 359 139 351 136 C351 156 377 159 397 138'
const JOY = 'M449 83 C467 75 494 74 512 78 C503 100 495 124 486 144 C478 163 466 173 452 169 C439 165 444 151 458 147 C479 142 501 141 514 129 C520 117 537 114 541 124 C547 139 532 155 521 151 C509 147 513 128 523 122 C534 117 539 133 551 126 C555 119 558 112 561 114 C563 117 551 143 561 150 C571 156 583 132 588 117 C583 141 578 166 562 180 C546 195 534 184 546 173 C563 158 591 152 614 152 C629 153 641 148 651 141'

export function EnglishIntroWord({ gradientId }: { gradientId: string }) {
  return (
    <g className={styles.lettering} stroke={`url(#${gradientId})`} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path className={styles.englishMuzhe} d={MUZHE} pathLength="1" />
      <path className={styles.englishJoy} d={JOY} pathLength="1" />
    </g>
  )
}
