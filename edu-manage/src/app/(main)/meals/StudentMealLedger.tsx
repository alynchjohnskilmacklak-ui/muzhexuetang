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
  records: Array<{
    id: string
    mealDate: string
    eating: boolean
    source: 'auto' | 'manual'
    notes?: string | null
  }>
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
  const [confirmingDate, setConfirmingDate] = useState('')
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
  const recordMap = useMemo(
    () => new Map((data?.records || []).map((record) => [record.mealDate, record])),
    [data?.records],
  )
  const eatingDates = useMemo(
    () => new Set((data?.records || []).filter((record) => record.eating).map((record) => record.mealDate)),
    [data?.records],
  )
  const teachingDays = getSummerTeachingDayCount()

  const toggleMeal = async (date: string) => {
    if (!studentId || savingDate) return
    const currentRecord = recordMap.get(date)
    const wasEating = currentRecord?.eating === true
    setSavingDate(date)
    setConfirmingDate('')
    const optimisticRecord = {
      id: currentRecord?.id || `optimistic-${date}`,
      mealDate: date,
      eating: !wasEating,
      source: 'manual' as const,
      notes: '管理员手动调整',
    }
    const optimisticRecords = currentRecord
      ? (data?.records || []).map((record) => record.mealDate === date ? optimisticRecord : record)
      : [...(data?.records || []), optimisticRecord]
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
          <div
            key={item.date}
            role="button"
            tabIndex={item.isTeachingDay && student ? 0 : -1}
            aria-disabled={!item.isTeachingDay || !student || savingDate === item.date}
            onClick={() => item.isTeachingDay && student && !savingDate && setConfirmingDate(item.date)}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && item.isTeachingDay && student && !savingDate) {
                event.preventDefault()
                setConfirmingDate(item.date)
              }
            }}
            aria-pressed={checked}
            className={`meal-ledger-cell ${!item.isTeachingDay ? 'is-rest' : ''} ${recordMap.get(item.date)?.source === 'auto' ? 'is-auto' : ''} ${recordMap.get(item.date)?.source === 'manual' ? 'is-manual' : ''} ${confirmingDate === item.date ? 'is-confirming' : ''}`}
          >
            {confirmingDate === item.date ? (
              <span className="meal-ledger-confirm" onClick={(event) => event.stopPropagation()}>
                <strong>确认标记为{checked ? '不就餐' : '已就餐'}？</strong>
                <span>
                  <button type="button" onClick={() => setConfirmingDate('')}>取消</button>
                  <button type="button" className="is-confirm" onClick={() => toggleMeal(item.date)}>确认</button>
                </span>
              </span>
            ) : (
              <>
                <span className="meal-ledger-weekday">{weekdayLabel(item.date)}</span>
                <strong className="meal-ledger-date">{dayjs(item.date).format('M月D日')}</strong>
                {!item.isTeachingDay ? (
                  <Tag bordered={false} style={{ margin: 0 }}>休息</Tag>
                ) : checked ? (
                  <span className="meal-ledger-state"><CheckCircleFilled /> 已就餐</span>
                ) : (
                  <span className="meal-ledger-empty">{recordMap.has(item.date) ? '已标记不就餐' : '点击登记'}</span>
                )}
                {recordMap.get(item.date)?.source === 'auto' && <small>教师上报</small>}
                {recordMap.get(item.date)?.source === 'manual' && <small>手动调整</small>}
              </>
            )}
          </div>
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
            <div className="meal-ledger-legend">
              <span><i className="is-auto" />教师上报</span>
              <span><i className="is-manual" />手动调整</span>
              <Text type="secondary">首次点击只进入确认态，不会立即修改</Text>
            </div>
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
