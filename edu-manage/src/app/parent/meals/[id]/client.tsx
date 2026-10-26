'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeftOutlined,
  CoffeeOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'

type MenuDetail = {
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
}

export function MealDetailClient({ menu }: { menu: MenuDetail }) {
  const router = useRouter()
  const dateStr = menu.weekStart
    ? new Date(new Date(menu.weekStart).getTime() + (menu.dayOfWeek - 1) * 86400000)
        .toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    : '每周固定菜品'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 24 }}>
      {/* 返回按钮 */}
      <button
        onClick={() => router.back()}
        style={{
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          marginBottom: 14, fontSize: 13, color: '#1E4D3A', fontWeight: 600,
          background: 'rgba(255,255,255,0.85)', borderRadius: 999, padding: '7px 14px',
          border: '1px solid #EDE5DA',
        }}
      >
        <ArrowLeftOutlined /> 返回就餐页
      </button>

      {/* 菜品大图卡片 */}
      <div style={{
        borderRadius: 24, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #16392A 0%, #1E4D3A 55%, #2E6B50 100%)',
        boxShadow: '0 14px 36px rgba(22, 57, 42, 0.3)',
      }}>
        <div style={{ position: 'relative', height: 240, width: '100%' }}>
          {menu.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={menu.image}
              alt={menu.mainDish}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'linear-gradient(135deg, #1E4D3A, #2E6B50)',
            }}>
              <CoffeeOutlined style={{ fontSize: 60, color: 'rgba(243,217,143,0.85)' }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, letterSpacing: 1 }}>菜品照片待上传</span>
            </div>
          )}
          {/* 星期标签 */}
          <div style={{
            position: 'absolute', top: 14, left: 14,
            background: 'rgba(17,24,39,0.65)', backdropFilter: 'blur(6px)',
            color: '#F3D98F', fontSize: 12, fontWeight: 700,
            borderRadius: 999, padding: '5px 12px',
          }}>
            {menu.weekdayLabel} · {dateStr}
          </div>
        </div>

        {/* 标题区 */}
        <div style={{ padding: '20px 22px 22px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(217,179,106,0.18)', border: '1px solid rgba(217,179,106,0.4)',
            color: '#F3D98F', fontSize: 11, fontWeight: 600,
            borderRadius: 999, padding: '4px 11px', marginBottom: 10,
          }}>
            <CoffeeOutlined /> 营养午餐
          </div>
          <div style={{ color: '#F3D98F', fontSize: 26, fontWeight: 800, letterSpacing: 0.5 }}>
            {menu.mainDish}
          </div>
          {menu.sideDish && (
            <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              配菜：{menu.sideDish}
            </div>
          )}
        </div>
      </div>

      {/* 详细介绍 */}
      <div style={{
        marginTop: 14, borderRadius: 20, background: 'rgba(255,255,255,0.95)',
        border: '1px solid #EDE5DA', padding: '20px 20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 4, height: 18, borderRadius: 2, background: '#D9B36A' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>菜品详情</span>
        </div>

        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, margin: 0 }}>
          {menu.description ||
            '食材新鲜当日采购，荤素搭配、营养均衡，主食米饭管够，保证孩子吃得饱、吃得好。'}
        </p>

        {menu.notes && (
          <div style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 12,
            background: 'rgba(217,179,106,0.08)', border: '1px solid rgba(217,179,106,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <FileTextOutlined style={{ color: '#A6781F', fontSize: 13 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#A6781F' }}>老师备注</span>
            </div>
            <span style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.7 }}>{menu.notes}</span>
          </div>
        )}
      </div>

      {/* 安全承诺条 */}
      <div style={{
        marginTop: 14, borderRadius: 16, padding: '14px 18px',
        background: 'linear-gradient(135deg, #16392A 0%, #1E4D3A 100%)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <SafetyCertificateOutlined style={{ fontSize: 24, color: '#D9B36A' }} />
        <div>
          <div style={{ color: '#F3D98F', fontSize: 14, fontWeight: 700 }}>每日留样 · 安全可追溯</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
            对菜品有任何疑问，随时联系老师沟通
          </div>
        </div>
      </div>
    </div>
  )
}
