import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BusinessShowcase } from '@/components/Home/BusinessShowcase'
import styles from './home.module.css'

const siteUrl = 'https://muzhexuetang.xyz'

export const metadata: Metadata = {
  title: { absolute: '牧哲学堂｜机构信息与家校服务平台' },
  description: '牧哲学堂机构信息与家校服务平台，提供服务范围说明、课程安排、考勤记录、课堂反馈与家校沟通入口。',
  keywords: ['牧哲学堂', '新乐牧哲学堂', '牧哲学堂家长端', '牧哲学堂教师端', '家校沟通平台'],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: siteUrl,
    siteName: '牧哲学堂',
    title: '牧哲学堂｜机构信息与家校服务平台',
    description: '查看牧哲学堂机构信息、服务范围与家校服务系统入口。',
    images: [{ url: '/images/muzhe-brand-banner.png', width: 2172, height: 724, alt: '牧哲学堂品牌标识' }],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: '牧哲学堂',
  alternateName: 'MOREJOY Education',
  url: siteUrl,
  logo: `${siteUrl}/images/logo.jpg`,
  image: `${siteUrl}/images/muzhe-brand-banner.png`,
  description: '牧哲学堂机构信息、教学记录与家校沟通服务平台。',
  foundingDate: '2016',
  areaServed: { '@type': 'City', name: '新乐市' },
}

const serviceFlow = [
  {
    title: '排课',
    text: '课程与教师、教室按周排定，冲突自动提示。',
    icon: <><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  },
  {
    title: '考勤',
    text: '到课、请假、补课状态实时登记，家长可查。',
    icon: <path d="M20 6 9 17l-5-5" />,
  },
  {
    title: '反馈',
    text: '每节课后的课堂表现与学习情况留有记录。',
    icon: <path d="M4 4h16v12H7l-3 3V4Z" />,
  },
  {
    title: '沟通',
    text: '教师与家长可在系统内直接留言、及时回应。',
    icon: <path d="M3 5h18M3 12h18M3 19h12" />,
  },
]

export default function Home() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <header className={styles.header}>
        <div className={styles.headerRow}>
          <Link className={styles.brand} href="/" aria-label="牧哲学堂首页">
            <span className={styles.brandMark}>牧</span>
            <span className={styles.brandName}>牧哲学堂<small>MOREJOY · 河北新乐</small></span>
          </Link>
          <nav className={styles.nav} aria-label="首页导航">
            <a href="#timetable">服务内容</a>
            <a href="#services">全部业务</a>
            <Link className={styles.loginLink} href="/login">登录系统</Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>机构信息与家校服务</p>
          <h1>课程怎么排、孩子来没来、<br />课上表现如何，<br />一张表看明白。</h1>
          <p className={styles.lead}>牧哲学堂用一套自建系统，把排课、考勤、课堂反馈和家校沟通记录在同一个地方。家长和教师查的是同一份数据，不用来回问、来回等。</p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/login">登录系统</Link>
            <a className={styles.secondaryAction} href="#services">查看服务范围</a>
          </div>
        </div>
        <div className={styles.heroVisual} aria-label="牧哲学堂品牌信息">
          <div className={styles.calligraphyPanel}>
            <Image src="/images/muzhe-brand-banner.png" alt="牧哲学堂 MOREJOY，不侈学识，唯恐志短" fill sizes="(max-width: 760px) 92vw, 48vw" priority style={{ objectFit: 'contain' }} />
          </div>
          <div className={styles.stamp}><b>牧哲</b><span>2016 创办</span></div>
        </div>
      </section>

      <section className={styles.timetable} id="timetable" aria-labelledby="timetable-title">
        <div className={styles.timetableInner}>
          <div className={styles.timetableHead}>
            <h2 id="timetable-title">家校服务流程</h2>
            <span>与教师端 / 家长端系统实时同步</span>
          </div>
          <div className={styles.timetableRow}>
            {serviceFlow.map((item) => (
              <article className={styles.timetableCell} key={item.title}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{item.icon}</svg>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.facts} aria-label="牧哲学堂办学特点">
        <div className={styles.factPrimary}><strong>2016 年创办</strong><span>河北 · 新乐</span></div>
        <div><strong>信息公开</strong><span>服务范围清楚说明</span></div>
        <div><strong>过程留痕</strong><span>课堂反馈可查看</span></div>
        <div><strong>家校协同</strong><span>教师与家长及时沟通</span></div>
      </section>

      <BusinessShowcase />

      <section className={styles.closing}>
        <div className={styles.closingPanel}>
          <p>河北 · 新乐</p>
          <h2>学习不是一句口号，<br />是每天认真完成的小事。</h2>
          <Link className={styles.closingAction} href="/login">登录系统</Link>
        </div>
      </section>
    </main>
  )
}
