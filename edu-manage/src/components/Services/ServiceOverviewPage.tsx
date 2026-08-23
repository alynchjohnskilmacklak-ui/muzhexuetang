'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { SERVICE_ASSET_BASE, SERVICE_ASSET_VERSION, serviceCatalog, type ServiceCatalogItem } from '@/lib/service-catalog'

type GroupKey = 'course' | 'growth' | 'plan'

const serviceGroups: Array<{
  key: GroupKey
  title: string
  description: string
  slugs: string[]
}> = [
  {
    key: 'course',
    title: '课程辅导',
    description: '聚焦当下学习，补基础、提能力',
    slugs: ['seasonal-bootcamp', 'one-to-one', 'postgraduate-public-courses'],
  },
  {
    key: 'growth',
    title: '长期成长',
    description: '建立稳定节奏，让成长持续发生',
    slugs: ['evening-study', 'weekend-pioneer', 'alumni-network'],
  },
  {
    key: 'plan',
    title: '升学规划',
    description: '看清关键选择，提前做好准备',
    slugs: ['zhongkao-planning', 'gaokao-consulting', 'single-enrollment'],
  },
]

function ServiceThumbnail({ service }: { service: ServiceCatalogItem }) {
  if (!service.imageCount) {
    return <span className="service-list-thumb service-list-thumb--placeholder" aria-hidden>
      <b>{service.shortTitle.slice(0, 1)}</b>
      <small>牧哲学堂</small>
    </span>
  }

  const assetSlug = service.imageAssetSlug || service.slug
  const imageFile = service.imageFiles?.[0] || 1

  return <span className="service-list-thumb" aria-hidden>
    <Image
      src={`${SERVICE_ASSET_BASE}/${assetSlug}/${imageFile}.png?v=${SERVICE_ASSET_VERSION}`}
      alt=""
      fill
      sizes="72px"
      unoptimized
    />
    <span className="service-list-thumb__wash" />
  </span>
}

export function ServiceOverviewPage({ basePath }: { basePath: string }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN')

  const groups = useMemo(() => serviceGroups.map((group) => ({
    ...group,
    services: group.slugs
      .map((slug) => serviceCatalog.find((service) => service.slug === slug))
      .filter((service): service is ServiceCatalogItem => Boolean(service))
      .filter((service) => {
        if (!normalizedQuery) return true
        return [service.title, service.shortTitle, service.category, service.audience, service.summary]
          .join(' ')
          .toLocaleLowerCase('zh-CN')
          .includes(normalizedQuery)
      }),
  })).filter((group) => group.services.length > 0), [normalizedQuery])

  const resultCount = groups.reduce((total, group) => total + group.services.length, 0)

  return <main className="service-page-shell service-catalog">
    <header className="service-catalog-head">
      <span className="service-eyebrow">牧哲学堂 · 服务中心</span>
      <h1>全部业务</h1>
      <p>按学习阶段与实际需求分类，选择一项服务查看完整介绍。</p>
    </header>

    <label className="service-search">
      <span className="service-search__mark" aria-hidden>⌕</span>
      <span className="service-search__label">搜索业务</span>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索课程、阶段或学习需求"
        type="search"
      />
      {query && <button type="button" onClick={() => setQuery('')} aria-label="清除搜索">清除</button>}
    </label>

    {groups.length > 0 ? <div className="service-catalog-groups">
      {groups.map((group) => <section className={`service-list-group service-list-group--${group.key}`} key={group.key}>
        <header>
          <div><span>{group.title}</span><small>{group.description}</small></div>
          <i aria-hidden />
        </header>
        <div className="service-list">
          {group.services.map((service) => <Link className="service-list-item" href={`${basePath}/${service.slug}`} key={service.slug}>
            <ServiceThumbnail service={service} />
            <span className="service-list-item__content">
              <small>{service.audience}</small>
              <strong>{service.shortTitle}</strong>
              <span>{service.summary}</span>
            </span>
            <span className="service-list-item__arrow" aria-hidden>›</span>
          </Link>)}
        </div>
      </section>)}
    </div> : <section className="service-search-empty" aria-live="polite">
      <strong>没有找到相关业务</strong>
      <p>可以尝试搜索“初中”“一对一”“周末”或“升学”。</p>
      <button type="button" onClick={() => setQuery('')}>查看全部业务</button>
    </section>}

    <footer className="service-catalog-foot">
      <span>{normalizedQuery ? `找到 ${resultCount} 项服务` : '共 9 项服务'}</span>
      <p>不确定如何选择？可先浏览服务详情，再联系管理员沟通。</p>
    </footer>
  </main>
}
