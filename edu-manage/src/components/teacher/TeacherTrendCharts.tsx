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
      triggerOn: 'mousemove|click' as const,
      confine: true,
      textStyle: { fontSize: 12 },
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params
        return `<div style="font-size:12px;padding:2px 4px;">${item.name}<br/><span style="color:#1D9E75;font-weight:700;">到课率：${item.value}%</span></div>`
      },
    },
    grid: { left: 6, right: 14, top: 26, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: attendanceWeekTrend.map((item) => item.label),
      axisLabel: { color: '#8c8070', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(0,0,0,.08)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      min: 0,
      max: 100,
      interval: 25,
      axisLabel: { color: '#8c8070', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,.04)', type: 'dashed' as const } },
    },
    series: [
      {
        name: '到课率',
        type: 'line' as const,
        smooth: true,
        symbol: 'circle' as const,
        symbolSize: 6,
        data: attendanceWeekTrend.map((item) => item.rate),
        lineStyle: { color: '#1D9E75', width: 2.5 },
        itemStyle: { color: '#1D9E75', borderWidth: 2, borderColor: '#ffffff' },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(29,158,117,0.18)' },
              { offset: 1, color: 'rgba(29,158,117,0.01)' },
            ],
          },
        },
        label: {
          show: true,
          position: 'top' as const,
          distance: 5,
          color: '#137A5A',
          fontSize: 11,
          fontWeight: 650,
          formatter: '{c}%',
        },
      },
    ],
  }

  const salaryOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis' as const,
      confine: true,
      textStyle: { fontSize: 12 },
    },
    legend: {
      data: ['课时费 (元)', '授课课时 (h)'],
      bottom: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 6,
      textStyle: { color: '#736b5e', fontSize: 11 },
    },
    grid: { left: 6, right: 10, top: 18, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: salaryTrend.map((item) => item.label),
      axisLabel: { color: '#8c8070', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(0,0,0,.08)' } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value' as const,
        axisLabel: { color: '#8c8070', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,.04)', type: 'dashed' as const } },
        min: 0,
        splitNumber: 4,
      },
      {
        type: 'value' as const,
        axisLabel: { color: '#8c8070', fontSize: 10, formatter: '{value}h' },
        splitLine: { show: false },
        min: 0,
        splitNumber: 4,
      },
    ],
    series: [
      {
        name: '课时费 (元)',
        type: 'bar' as const,
        barWidth: isMobile ? 12 : 16,
        barMaxWidth: 20,
        data: salaryTrend.map((item) => item.pay),
        itemStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#F2994A' },
              { offset: 1, color: '#E8784A' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '授课课时 (h)',
        type: 'line' as const,
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle' as const,
        symbolSize: 5,
        data: salaryTrend.map((item) => item.hours),
        lineStyle: { color: '#2F80ED', width: 2 },
        itemStyle: { color: '#2F80ED', borderWidth: 2, borderColor: '#ffffff' },
      },
    ],
  }

  return (
    <RowWithGap>
      <Card
        bordered={false}
        style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
        styles={{ body: { padding: isMobile ? '12px 14px' : '16px 18px' } }}
        title={(
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: '#E9F7F0', color: '#137A5A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              <LineChartOutlined />
            </span>
            <span style={{ fontSize: 14, fontWeight: 750, color: '#1A1201' }}>本月到课率趋势</span>
            <span style={{ fontSize: 11, color: '#8c8070', fontWeight: 400 }}>· 周维度</span>
          </span>
        )}
      >
        {attendanceWeekTrend.length ? (
          <>
            <div style={{ height: isMobile ? 180 : 210 }}>
              <ReactECharts option={attendanceOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
            </div>
            <div style={{ fontSize: 11.5, color: '#9A8E7A', marginTop: 6, lineHeight: 1.5 }}>
              到课率 = 实到人数 ÷ 应到人数，随考勤录入实时更新
            </div>
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本月暂无考勤数据" style={{ padding: '24px 0' }} />
        )}
      </Card>

      <Card
        bordered={false}
        style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
        styles={{ body: { padding: isMobile ? '12px 14px' : '16px 18px' } }}
        title={(
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: '#FFF0E6', color: '#E8784A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              <BarChartOutlined />
            </span>
            <span style={{ fontSize: 14, fontWeight: 750, color: '#1A1201' }}>课时与课时费走势</span>
            <span style={{ fontSize: 11, color: '#8c8070', fontWeight: 400 }}>· 近6月</span>
          </span>
        )}
      >
        {salaryTrend.some((item) => item.pay > 0 || item.hours > 0) ? (
          <>
            <div style={{ height: isMobile ? 180 : 210 }}>
              <ReactECharts option={salaryOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
            </div>
            <div style={{ fontSize: 11.5, color: '#9A8E7A', marginTop: 6, lineHeight: 1.5 }}>
              汇总当月课时费与结算课时（含反馈奖励与调整）
            </div>
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近 6 个月暂无结算记录" style={{ padding: '24px 0' }} />
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
