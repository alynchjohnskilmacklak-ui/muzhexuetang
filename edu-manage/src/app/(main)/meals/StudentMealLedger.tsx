'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import html2canvas from 'html2canvas'
import {
  Button,
  Card,
  Empty,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CheckCircleFilled,
  CoffeeOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { getMealPeriodDates, getSummerTeachingDayCount } from '@/lib/meal-attendance-period'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text, Title } = Typography

type StudentOption = {
  id: string
  name: string
  grade?: string | null
  school?: string | null
}

type MealLedgerPayload = {
  period: { startDate: string; endDate: string }
  students: StudentOption[]
  student: StudentOption | null
  records: Array<{ id: string; mealDate: string; notes?: string | null }>
}

const fetcher = async (url: string): Promise<MealLedgerPayload> => {
  const response = await fetch(url)
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || '加载就餐台账失败')
  return payload
}

function weekdayLabel(date: string) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayjs(date).day()]
}

export function StudentMealLedger() {
  const isMobile = useIsMobile() ?? false
  const [studentId, setStudentId] = useState('')
  const [savingDate, setSavingDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const endpoint = `/api/admin/meal-attendance${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`
  const { data, error, isLoading, mutate } = useSWR<MealLedgerPayload>(endpoint, fetcher, {
    revalidateOnFocus: false,
  })

  useEffect(() => {
    if (!studentId && data?.students?.length) setStudentId(data.students[0].id)
  }, [data?.students, studentId])

  const periodDates = useMemo(() => getMealPeriodDates(), [])
  const eatingDates = useMemo(
    () => new Set((data?.records || []).map((record) => record.mealDate)),
    [data?.records],
  )
  const teachingDays = getSummerTeachingDayCount()

  const toggleMeal = async (date: string) => {
    if (!studentId || savingDate) return
    const wasEating = eatingDates.has(date)
    setSavingDate(date)
    const optimisticRecords = wasEating
      ? (data?.records || []).filter((record) => record.mealDate !== date)
      : [...(data?.records || []), { id: `optimistic-${date}`, mealDate: date }]
    await mutate(data ? { ...data, records: optimisticRecords } : data, false)
    try {
      const response = await fetch('/api/admin/meal-attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, mealDate: date, eating: !wasEating }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '登记失败')
      message.success(wasEating ? '已取消该日就餐' : '已登记该日就餐')
      await mutate()
    } catch (toggleError) {
      await mutate()
      message.error(toggleError instanceof Error ? toggleError.message : '登记失败')
    } finally {
      setSavingDate('')
    }
  }

  const exportImage = async () => {
    if (!reportRef.current || !data?.student) return
    setExporting(true)
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#faf8f5',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `${data.student.name}_暑期就餐记录.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      message.success('就餐记录图片已生成')
    } catch {
      message.error('图片生成失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  if (isLoading && !data) return <Skeleton active paragraph={{ rows: 8 }} />
  if (error) return <Empty description={error instanceof Error ? error.message : '就餐台账加载失败'} />

  const student = data?.student
  const calendar = (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(4, minmax(0, 1fr))' : 'repeat(7, minmax(0, 1fr))',
      gap: isMobile ? 8 : 10,
    }}>
      {periodDates.map((item) => {
        const checked = eatingDates.has(item.date)
        return (
          <button
            key={item.date}
            type="button"
            disabled={!item.isTeachingDay || !student || savingDate === item.date}
            onClick={() => toggleMeal(item.date)}
            aria-pressed={checked}
            style={{
              minWidth: 0,
              minHeight: isMobile ? 82 : 92,
              borderRadius: 10,
              border: checked
                ? '1px solid var(--color-primary, #E8784A)'
                : '1px solid var(--color-border, rgba(0,0,0,.06))',
              background: !item.isTeachingDay
                ? 'var(--color-surface-soft, #F3F0EB)'
                : checked ? 'rgba(232,120,74,.10)' : '#fff',
              color: 'var(--color-text, #1a1201)',
              padding: isMobile ? '8px 5px' : 10,
              cursor: item.isTeachingDay && student ? 'pointer' : 'default',
              opacity: savingDate === item.date ? 0.55 : 1,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #7A6F61)' }}>{weekdayLabel(item.date)}</div>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 15 : 17, margin: '4px 0' }}>
              {dayjs(item.date).format('M月D日')}
            </div>
            {!item.isTeachingDay ? (
              <Tag bordered={false} style={{ margin: 0 }}>休息</Tag>
            ) : checked ? (
              <span style={{ color: 'var(--color-primary, #E8784A)', fontSize: 12, fontWeight: 600 }}>
                <CheckCircleFilled /> 已就餐
              </span>
            ) : (
              <span style={{ color: 'var(--color-text-secondary, #7A6F61)', fontSize: 12 }}>点击登记</span>
            )}
          </button>
        )
      })}
    </div>
  )

  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={5} style={{ margin: 0 }}>学生暑期就餐台账</Title>
            <Text type="secondary">逐日勾选就餐情况，休息日已自动标明；可生成适合打印和微信发送的图片。</Text>
          </div>
          <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
            <Select
              showSearch
              value={studentId || undefined}
              placeholder="选择学生"
              optionFilterProp="label"
              onChange={setStudentId}
              style={{ width: isMobile ? '100%' : 240 }}
              options={(data?.students || []).map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.grade || '未填写年级'}`,
              }))}
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={exporting}
              disabled={!student}
              onClick={exportImage}
              block={isMobile}
            >
              导出标准图片
            </Button>
          </Space>
        </Space>
      </Card>

      {student ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
            <Card size="small"><Statistic title="学生" value={student.name} /></Card>
            <Card size="small"><Statistic title="年级" value={student.grade || '未填写'} /></Card>
            <Card size="small"><Statistic title="上课日期" value={teachingDays} suffix="天" /></Card>
            <Card size="small"><Statistic title="已登记就餐" value={eatingDates.size} suffix="次" prefix={<CoffeeOutlined />} /></Card>
          </div>
          <Card title="7月9日—8月8日就餐记录" styles={{ body: { padding: isMobile ? 10 : 16 } }}>
            {calendar}
          </Card>
        </>
      ) : (
        <Empty description="请选择一名学生开始登记" />
      )}

      <div style={{ position: 'fixed', left: -12000, top: 0, width: 1120 }} aria-hidden>
        <div ref={reportRef} style={{ width: 1120, padding: 48, background: '#faf8f5', color: '#1a1201' }}>
          <div style={{ borderLeft: '4px solid #E8784A', paddingLeft: 18, marginBottom: 24 }}>
            <div style={{ color: '#E8784A', fontSize: 20, fontWeight: 700 }}>牧哲学堂</div>
            <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>暑期学生就餐记录</div>
            <div style={{ color: '#7A6F61', fontSize: 18 }}>统计周期：2026年7月9日—8月8日</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              ['学生姓名', student?.name || '-'],
              ['年级', student?.grade || '未填写'],
              ['上课日期', `${teachingDays}天`],
              ['就餐次数', `${eatingDates.size}次`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: 18 }}>
                <div style={{ color: '#7A6F61', fontSize: 15 }}>{label}</div>
                <div style={{ fontSize: 25, fontWeight: 700, marginTop: 6 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {periodDates.map((item) => {
              const checked = eatingDates.has(item.date)
              return (
                <div key={item.date} style={{
                  minHeight: 88,
                  padding: 10,
                  borderRadius: 10,
                  border: checked ? '1px solid #E8784A' : '1px solid rgba(0,0,0,.06)',
                  background: !item.isTeachingDay ? '#F3F0EB' : checked ? '#FDF0EA' : '#fff',
                }}>
                  <div style={{ color: '#7A6F61', fontSize: 13 }}>{weekdayLabel(item.date)}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, margin: '5px 0' }}>{dayjs(item.date).format('M月D日')}</div>
                  <div style={{ color: checked ? '#E8784A' : '#7A6F61', fontWeight: 600 }}>
                    {!item.isTeachingDay ? '休息' : checked ? '✓ 已就餐' : '— 未登记'}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 22, color: '#7A6F61', fontSize: 15 }}>说明：休息日不计入上课日期和就餐次数。</div>
        </div>
      </div>
    </div>
  )
}
