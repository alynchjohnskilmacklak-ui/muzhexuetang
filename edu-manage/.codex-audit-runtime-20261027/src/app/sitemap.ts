import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://muzhexuetang.xyz', lastModified: new Date('2026-09-06'), changeFrequency: 'monthly', priority: 1 },
    { url: 'https://muzhexuetang.xyz/about', lastModified: new Date('2026-09-07'), changeFrequency: 'weekly', priority: 0.9 },
  ]
}
