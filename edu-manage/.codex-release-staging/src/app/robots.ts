import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/images/', '/marketing/'],
      disallow: [
        '/api/', '/login', '/reset-password', '/activate/', '/parent/', '/teacher/',
        '/dashboard', '/academic-terms', '/ai', '/attendance', '/classroom-feedback',
        '/communications', '/courses', '/data-admin', '/fees', '/grades', '/lesson-previews',
        '/login-records', '/materials', '/meals', '/notifications', '/parent-access',
        '/parent-messages', '/performance', '/phet', '/reports', '/schedule', '/services',
        '/settings', '/student-archive', '/students', '/study-hall', '/teacher-logs',
        '/teacher-salary', '/teachers', '/trash', '/volunteer', '/volunteer-sim',
      ],
    },
    sitemap: 'https://muzhexuetang.xyz/sitemap.xml',
    host: 'https://muzhexuetang.xyz',
  }
}
