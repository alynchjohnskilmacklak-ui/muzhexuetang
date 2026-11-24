import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MealDetailClient } from './client'

export const dynamic = 'force-dynamic'

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六']

export default async function MealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const db = await getRequestPrisma()

  const isTemplate = rawId.startsWith('tpl_')
  const realId = isTemplate ? rawId.slice(4) : rawId

  let detail: {
    id: string
    mainDish: string
    sideDish: string | null
    notes: string | null
    image: string | null
    description: string | null
    dayOfWeek: number
    weekStart: string | null
    weekdayLabel: string
    creatorName: string | null
  } | null = null

  if (isTemplate) {
    const tpl = await db.mealTemplate.findUnique({ where: { id: realId } })
    if (tpl) {
      const sideParts = [
        tpl.breakfast ? `早餐：${tpl.breakfast}` : '',
        tpl.dinner ? `晚餐：${tpl.dinner}` : '',
        tpl.snack ? `加餐：${tpl.snack}` : '',
      ].filter(Boolean)
      detail = {
        id: rawId,
        mainDish: tpl.lunch || tpl.title || '周期菜单',
        sideDish: sideParts.join('；') || null,
        notes: tpl.note,
        image: tpl.image,
        description: tpl.description,
        dayOfWeek: tpl.weekday,
        weekStart: null,
        weekdayLabel: WEEKDAYS[tpl.weekday - 1] || '',
        creatorName: null,
      }
    }
  } else {
    const menu = await db.mealMenu.findUnique({
      where: { id: realId },
      include: { creator: { select: { name: true } } },
    })
    if (menu) {
      detail = {
        id: menu.id,
        mainDish: menu.mainDish,
        sideDish: menu.sideDish,
        notes: menu.notes,
        image: menu.image,
        description: menu.description,
        dayOfWeek: menu.dayOfWeek,
        weekStart: menu.weekStart.toISOString(),
        weekdayLabel: WEEKDAYS[menu.dayOfWeek - 1] || '',
        creatorName: menu.creator?.name || null,
      }
    }
  }

  if (!detail) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{
          borderRadius: 20, padding: '48px 24px', textAlign: 'center',
          background: 'rgba(255,255,255,0.92)', border: '1px solid #EDE5DA',
        }}>
          <div style={{ fontSize: 44 }}>🍽️</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginTop: 14 }}>未找到该菜品</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>菜单可能已更新或被移除</div>
          <Link href="/parent/meals" className="mobile-shell-back" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 18,
            borderRadius: 999, padding: '8px 18px', background: '#1E4D3A', color: '#fff',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            ← 返回就餐页
          </Link>
        </div>
      </div>
    )
  }

  return <MealDetailClient menu={JSON.parse(JSON.stringify(detail))} />
}
