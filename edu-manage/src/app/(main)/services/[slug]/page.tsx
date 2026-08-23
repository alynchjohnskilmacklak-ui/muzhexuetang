import { notFound } from 'next/navigation'
import { ServiceDetailPage } from '@/components/Services/ServiceDetailPage'
import { getServiceMarkdown } from '@/lib/service-content'
import { getServiceBySlug, serviceCatalog } from '@/lib/service-catalog'

export function generateStaticParams() {
  return serviceCatalog.map(({ slug }) => ({ slug }))
}

export default async function AdminServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) notFound()
  return <ServiceDetailPage service={service} markdown={await getServiceMarkdown(service)} basePath="/services" />
}
