import Link from 'next/link'
import Image from 'next/image'
import { Carousel } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SERVICE_ASSET_BASE, SERVICE_ASSET_VERSION, type ServiceCatalogItem } from '@/lib/service-catalog'

type QuickAction = { mark: string; title: string; description: string; href: string }

function getQuickActions(basePath: string): QuickAction[] {
  if (basePath.startsWith('/parent/')) return [
    { mark: '课', title: '课程安排', description: '时段、学科与老师', href: '/parent/schedule' },
    { mark: '勤', title: '到勤记录', description: '到课情况实时可查', href: '/parent/attendance' },
    { mark: '记', title: '课堂记录', description: '老师说明与课堂照片', href: '/parent/class-feedback' },
    { mark: '评', title: '学习反馈', description: '表现与知识掌握情况', href: '/parent/class-feedback' },
  ]
  if (basePath.startsWith('/teacher/')) return [
    { mark: '课', title: '我的课表', description: '查看本周授课安排', href: '/teacher/schedule' },
    { mark: '勤', title: '课堂考勤', description: '登记与查看到勤', href: '/teacher/attendance' },
    { mark: '记', title: '课堂反馈', description: '记录课堂表现', href: '/teacher/feedback' },
    { mark: '评', title: '学习记录', description: '查看学生反馈', href: '/teacher/feedback' },
  ]
  return [
    { mark: '课', title: '课程安排', description: '查看全校课程', href: '/schedule' },
    { mark: '勤', title: '考勤管理', description: '处理到勤记录', href: '/attendance' },
    { mark: '记', title: '课堂反馈', description: '查看教师反馈', href: '/classroom-feedback' },
    { mark: '评', title: '成长记录', description: '查看学习表现', href: '/performance' },
  ]
}

export function ServiceDetailPage({ service, markdown, basePath }: { service: ServiceCatalogItem; markdown: string; basePath: string }) {
  const assetSlug = service.imageAssetSlug || service.slug
  const imageFiles = service.imageFiles || Array.from({ length: service.imageCount || 0 }, (_, index) => index + 1)
  // next/image 拒绝带 query 的本地 src（images.localPatterns 默认只放行无查询串），
  // 所以渲染用无 query 版本；原图新窗口链接保留 ?v= 版本号做缓存刷新。
  const images = imageFiles.map((file) => `${SERVICE_ASSET_BASE}/${assetSlug}/${file}.png`)
  const imageHrefs = imageFiles.map((file) => `${SERVICE_ASSET_BASE}/${assetSlug}/${file}.png?v=${SERVICE_ASSET_VERSION}`)
  const quickActions = getQuickActions(basePath)
  const theme = service.category === '课程辅导' ? 'course' : service.category === '长期成长' ? 'growth' : 'plan'

  return <main className="service-page-shell service-detail">
    <header className={`service-detail-hero service-theme--${theme}`}>
      <div className="service-detail-breadcrumb"><Link href={basePath}>业务总览</Link><span aria-hidden>/</span><span>{service.category}</span></div>
      <div className={`service-hero-band ${images.length > 0 ? 'service-hero-band--carousel' : 'service-hero-band--fallback'}`}>
        {images.length > 0 ? <Carousel
          className="service-hero-carousel"
          autoplay={images.length > 1 ? { dotDuration: true } : false}
          autoplaySpeed={4600}
          arrows={images.length > 1}
          dots={images.length > 1}
          draggable
          pauseOnFocus
          pauseOnHover
          swipeToSlide
        >
          {images.map((src, index) => <div key={src}>
            <div className="service-hero-slide">
              <Image
                src={src}
                alt={`${service.title}宣传图片第${index + 1}张`}
                fill
                sizes="(max-width: 768px) calc(100vw - 24px), 980px"
                priority={index === 0}
              />
            </div>
          </div>)}
        </Carousel> : <div className="service-hero-band__fallback-art" aria-hidden />}
        {images.length > 0 && <div className="service-hero-band__shade" aria-hidden />}
        <div className="service-hero-band__content">
          <div className="service-hero-band__topline">
            <span className="service-brand-logo service-brand-logo--hero">
              <Image className="service-brand-logo__image" src="/images/logo.jpg" alt="牧哲学堂" fill sizes="42px" priority unoptimized />
            </span>
            <span className="service-hero-band__tag">{service.index} · {service.category} · {service.audience}</span>
          </div>
          <div className="service-hero-band__copy">
            <h1>{service.shortTitle}</h1>
            <p>{service.summary}</p>
          </div>
        </div>
      </div>
      <div className="service-detail-highlights">
        <div className="service-detail-audience">适合：{service.audience}</div>
        <ul>{service.highlights.map((highlight) => <li key={highlight}><span aria-hidden>✓</span>{highlight}</li>)}</ul>
      </div>
    </header>

    <section className="service-quick-section" aria-labelledby="service-quick-heading">
      <div className="service-compact-heading"><span>常用功能</span><h2 id="service-quick-heading">学习过程随时可查</h2></div>
      <div className="service-quick-grid">
        {quickActions.map((action) => <Link href={action.href} className="service-quick-card" key={action.title}>
          <span className="service-quick-card__mark" aria-hidden>{action.mark}</span>
          <div><strong>{action.title}</strong><span>{action.description}</span></div>
          <span aria-hidden>›</span>
        </Link>)}
      </div>
    </section>

    {images.length > 0 && <details className="service-disclosure service-poster-section">
      <summary><span><small>宣传资料</small><strong>查看课程图片</strong><em>共 {images.length} 张，横向滑动浏览</em></span><i aria-hidden>+</i></summary>
      <div className="service-poster-list">
        {images.map((src, index) => <figure key={src}>
          <a href={imageHrefs[index]} target="_blank" rel="noreferrer" aria-label={`查看${service.title}宣传图片第${index + 1}张原图`}>
            <div className="service-poster-image" style={{ aspectRatio: `${service.imageWidth || 4} / ${service.imageHeight || 3}` }}><Image src={src} alt={`${service.title}宣传图片第${index + 1}张`} fill sizes="(max-width: 768px) 86vw, 720px" priority={index === 0} /></div>
          </a>
          <figcaption>{String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</figcaption>
        </figure>)}
      </div>
    </details>}

    <details className="service-disclosure service-article-section" open={images.length === 0}>
      <summary><span><small>服务说明</small><strong>了解服务内容与特点</strong><em>按要点整理，点击展开阅读</em></span><i aria-hidden>+</i></summary>
      <article className="service-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></article>
    </details>

    <aside className="service-contact-strip service-detail-cta">
      <div><span className="service-eyebrow">进一步咨询</span><h2>预约试听或咨询课程</h2><p>根据学生实际情况确认时间、科目与学习方案。</p></div>
      <div className="service-contact-actions"><a href="tel:15930114500">拨打 15930114500</a><a href="tel:18031264903">拨打 18031264903</a></div>
    </aside>
  </main>
}
