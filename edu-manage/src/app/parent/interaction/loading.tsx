import styles from './interaction.module.css'

export default function ParentInteractionLoading() {
  return (
    <div className={styles.page} aria-label="正在打开课堂互动记录">
      <header className={styles.head}>
        <div className={`mz-skeleton ${styles.skeletonTitle}`} />
        <div className={`mz-skeleton ${styles.skeletonSubtitle}`} />
      </header>
      <div className={styles.summary} aria-hidden="true">
        {[0, 1, 2].map((slot) => <div className={styles.summaryItem} key={slot}><span className={`mz-skeleton ${styles.skeletonValue}`} /></div>)}
      </div>
      <ul className={styles.list} aria-hidden="true">
        {[0, 1, 2].map((slot) => (
          <li key={slot} className={styles.skeletonItem}>
            <div className={`mz-skeleton ${styles.skeletonLine}`} />
            <div className={`mz-skeleton ${styles.skeletonLineShort}`} />
          </li>
        ))}
      </ul>
    </div>
  )
}
