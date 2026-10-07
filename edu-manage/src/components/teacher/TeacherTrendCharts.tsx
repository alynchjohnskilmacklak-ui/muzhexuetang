'use client'

import { Card, Empty, Typography } from 'antd'
import { LineChartOutlined, BarChartOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontSize: 13 }}>
      图表加载中...
    </div>
  ),
})

export interface AttendanceWeekPoint {
  label: string
  rate: number
}

export interface SalaryTrendPoint {
  label: string
  hours: number
  pay: number
}

export interface TeacherTrendChartsProps {
  attendanceWeekTrend?: AttendanceWeekPoint[]
  salaryTrend?: SalaryTrendPoint[]
}

export function TeacherTrendCharts({ attendanceWeekTrend = [], salaryTrend = [] }: TeacherTrendChartsProps) {
  const isMobile = useIsMobile() ?? false

  const attendanceOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis' as const,
      triggerOn: 'click' as const,
      renderMode: 'richText' as const,
      confine: true,
      textStyle: { fontSize: 11, lineHeight: 15 },
      padding: [6, 8],
    },
    grid: { left: 8, right: 16, top: isMobile ? 18 : 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: attendanceWeekTrend.map((item) => item.label),
      axisLabel: { color: '#9A8E7A', fontSize: isMobile ? 10 : 11 },
      axisLine: { lineStyle: { color: 'rgba(0,0,0,.08)' } },
    },
    yAxis: {
      type: 'value' as const,
      name: '到课率',
      min: 0,
      max: 100,
      interval: 25,
      nameTextStyle: { color: '#9A8E7A', fontSize: 10 },
      axisLabel: { color: '#9A8E7A', fontSize: isMobile ? 10 : 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } },
    },
    series: [
      {
        name: '到课率',
        type: 'line' as const,
        smooth: true,
        symbol: 'circle' as const,
        symbolSize: isMobile ? 6 : 7,
        data: attendanceWeekTrend.map((item) => item.rate),
        lineStyle: { color: '#1D9E75', width: isMobile ? 2.5 : 3 },
        itemStyle: { color: '#1D9E75' },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(29,158,117,0.16)' },
              { offset: 1, color: 'rgba(29,158,117,0)' },
            ],
          },
        },
        label: { show: true, position: 'top' as const, color: '#1D9E75', fontSize: isMobile ? 10 : 11, formatter: '{c}%' },
      },
    ],
  }

  const salaryOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis' as const,
      triggerOn: 'click' as const,
      renderMode: 'richText' as const,
      confine: true,
      textStyle: { fontSize: 11, lineHeight: 15 },
      padding: [6, 8],
    },
    legend: {
      data: ['课时费（元）', '课时（小时）'],
      bottom: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: '#5A4E3A', fontSize: isMobile ? 10 : 11 },
    },
    grid: { left: 8, right: 8, top: isMobile ? 18 : 24, bottom: isMobile ? 34 : 36, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: salaryTrend.map((item) => item.label),
      axisLabel: { color: '#9A8E7A', fontSize: isMobile ? 10 : 11 },
      axisLine: { lineStyle: { color: 'rgba(0,0,0,.08)' } },
    },
    yAxis: [
      {
        type: 'value' as const,
        name: '元',
        nameTextStyle: { color: '#9A8E7A', fontSize: 10 },
        axisLabel: { color: '#9A8E7A', fontSize: isMobile ? 10 : 11 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } },
        min: 0,
        splitNumber: 4,
      },
      {
        type: 'value' as const,
        name: '小时',
        nameTextStyle: { color: '#9A8E7A', fontSize: 10 },
        axisLabel: { color: '#9A8E7A', fontSize: isMobile ? 10 : 11 },
        splitLine: { show: false },
        min: 0,
        splitNumber: 4,
      },
    ],
    series: [
      {
        name: '课时费（元）',
        type: 'bar' as const,
        barWidth: isMobile ? 14 : 18,
        barMaxWidth: 24,
        data: salaryTrend.map((item) => item.pay),
        itemStyle: { color: '#E8784A', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '课时（小时）',
        type: 'line' as const,
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle' as const,
        symbolSize: isMobile ? 5 : 6,
        data: salaryTrend.map((item) => item.hours),
        lineStyle: { color: '#185FA5', width: 2 },
        itemStyle: { color: '#185FA5' },
      },
    ],
  }

  return (
    <RowWithGap>
      <Card
        bordered={false}
        style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }}
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
        title={(
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 10, background: '#E9F7F0', color: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              <LineChartOutlined />
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1A1201' }}>本月到课率趋势</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>按周统计</Text>
          </span>
        )}
      >
        {attendanceWeekTrend.length ? (
          <>
            <div style={{ height: isMobile ? 240 : 280 }}>
              <ReactECharts option={attendanceOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
            </div>
            <div style={{ fontSize: 12, color: '#9A8E7A', marginTop: 8, lineHeight: 1.6 }}>
              到课率 = 实际到勤人数 ÷ 应到人数，仅统计本月已排课程，随考勤录入实时更新。
            </div>
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本月暂无考勤数据，完成考勤录入后自动生成趋势" />
        )}
      </Card>

      <Card
        bordered={false}
        style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }}
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
        title={(
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 10, background: '#FFF0E6', color: '#E8784A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              <BarChartOutlined />
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1A1201' }}>课时与课时费 · 近 6 个月</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>月度汇总</Text>
          </span>
        )}
      >
        {salaryTrend.some((item) => item.pay > 0 || item.hours > 0) ? (
          <>
            <div style={{ height: isMobile ? 240 : 280 }}>
              <ReactECharts option={salaryOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
            </div>
            <div style={{ fontSize: 12, color: '#9A8E7A', marginTop: 8, lineHeight: 1.6 }}>
              课时费按月度结算明细汇总（课时费、反馈奖励、薪资调整等），课时为当月结算课时数。
            </div>
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近 6 个月暂无结算记录" />
        )}
      </Card>
    </RowWithGap>
  )
}

function RowWithGap({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile() ?? false
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 16,
        alignItems: 'start',
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  )
}
