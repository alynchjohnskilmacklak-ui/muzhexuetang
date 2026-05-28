'use client'

const CHART_COLORS = ['#E8784A', '#1D9E75', '#8892f0', '#f5a623', '#D4537E', '#185FA5']

export function buildFunnelOption(data: { status: string; count: number }[]) {
  const funnelColors = ['#8892f0', '#E8784A', '#1D9E75', '#f5a623', '#D4537E']
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 人' },
    legend: { bottom: 0, textStyle: { color: '#5a4e3a' } },
    series: [{
      type: 'funnel',
      left: '15%', right: '15%', top: 10, bottom: 40,
      minSize: '20%', maxSize: '100%',
      sort: 'descending', gap: 4,
      label: { show: true, position: 'inside', formatter: '{b}\n{c}人' },
      data: data.map((d, i) => ({
        name: d.status, value: d.count,
        itemStyle: { color: funnelColors[i % funnelColors.length] },
      })),
    }],
  }
}

export function buildPaperMasteryOption(mastery: { MASTERED: number; NEEDS_REVIEW: number; NEEDS_PRACTICE: number }) {
  const labels = ['已掌握', '待复习', '需练习']
  const values = [mastery.MASTERED, mastery.NEEDS_REVIEW, mastery.NEEDS_PRACTICE]
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#5a4e3a' } },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}题 ({d}%)' },
      data: [
        { value: values[0], name: labels[0], itemStyle: { color: '#1D9E75' } },
        { value: values[1], name: labels[1], itemStyle: { color: '#f5a623' } },
        { value: values[2], name: labels[2], itemStyle: { color: '#D4537E' } },
      ].filter((d) => d.value > 0),
    }],
  }
}

export function buildRetentionHeatmapOption(retention: { month: string; rate: number }[]) {
  return {
    tooltip: { formatter: (p: { data: number[] }) => `留存率: ${p.data?.[2] ?? 0}%` },
    grid: { top: 10, right: 20, bottom: 40, left: 60 },
    xAxis: { type: 'category', data: retention.map((r) => r.month), axisLabel: { color: '#5a4e3a', rotate: 30 } },
    yAxis: { type: 'category', data: ['留存率'], axisLabel: { color: '#5a4e3a' } },
    visualMap: { min: 0, max: 100, inRange: { color: ['rgba(232,120,74,0.1)', 'rgba(232,120,74,0.5)', 'rgba(232,120,74,0.9)'] }, show: false },
    series: [{
      type: 'heatmap',
      data: retention.map((r, i) => [i, 0, r.rate]),
      label: { show: true, formatter: (p: { data: number[] }) => `${p.data?.[2] ?? 0}%`, color: '#1a1201' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(232,120,74,0.5)' } },
    }],
  }
}

export function buildParentEngagementOption(engagement: { readRate: number; reactionRate: number; commentRate: number; replyRate: number }) {
  return {
    tooltip: {},
    radar: {
      indicator: [
        { name: '试卷已读率', max: 100 },
        { name: '动态互动率', max: 100 },
        { name: '留言率', max: 100 },
        { name: '咨询回复率', max: 100 },
      ],
      axisName: { color: '#5a4e3a' },
    },
    series: [{
      type: 'radar',
      data: [{
        value: [engagement.readRate, engagement.reactionRate, engagement.commentRate, engagement.replyRate],
        name: '家长互动',
        areaStyle: { color: 'rgba(232,120,74,0.2)' },
        lineStyle: { color: '#E8784A' },
        itemStyle: { color: '#E8784A' },
      }],
    }],
  }
}

export function buildFinanceOption(finance: { month: string; income: number; expense: number; profit: number }[]) {
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出', '利润'], bottom: 0, textStyle: { color: '#5a4e3a' } },
    grid: { top: 20, right: 40, bottom: 40, left: 60 },
    xAxis: { type: 'category', data: finance.map((f) => f.month), axisLabel: { color: '#5a4e3a' } },
    yAxis: { type: 'value', name: '金额(元)', nameTextStyle: { color: '#5a4e3a' }, axisLabel: { color: '#5a4e3a' } },
    series: [
      { name: '收入', type: 'line', data: finance.map((f) => f.income), smooth: true, symbol: 'circle', lineStyle: { color: '#1D9E75', width: 2 }, itemStyle: { color: '#1D9E75' } },
      { name: '支出', type: 'line', data: finance.map((f) => f.expense), smooth: true, symbol: 'diamond', lineStyle: { color: '#E8784A', width: 2 }, itemStyle: { color: '#E8784A' } },
      { name: '利润', type: 'line', data: finance.map((f) => f.profit), smooth: true, symbol: 'triangle', lineStyle: { color: '#f5a623', width: 2, type: 'dashed' }, itemStyle: { color: '#f5a623' } },
    ],
  }
}

export function buildAttendanceDonutOption(attendance: { attendanceRate: number; makeupCompleteRate: number }) {
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#5a4e3a' } },
    series: [
      {
        type: 'pie', radius: ['40%', '60%'], center: ['25%', '50%'],
        label: { formatter: '出勤率\n{d}%', fontSize: 12 }, labelLine: { show: false },
        data: [
          { value: attendance.attendanceRate, name: '出勤', itemStyle: { color: '#1D9E75' } },
          { value: 100 - attendance.attendanceRate, name: '缺勤', itemStyle: { color: '#D4537E' } },
        ],
      },
      {
        type: 'pie', radius: ['40%', '60%'], center: ['75%', '50%'],
        label: { formatter: '补课完成\n{d}%', fontSize: 12 }, labelLine: { show: false },
        data: [
          { value: attendance.makeupCompleteRate, name: '补课完成', itemStyle: { color: '#8892f0' } },
          { value: 100 - attendance.makeupCompleteRate, name: '待补课', itemStyle: { color: '#f5a623' } },
        ],
      },
    ],
  }
}

export function buildGuideUsageOption(data: { action: string; count: number }[]) {
  const actionLabels: Record<string, string> = {
    VIEW_GUIDE: '查看指南', VIEW_STEPS: '浏览步骤', DOWNLOAD: '下载文件',
    SEARCH_SCHOOL: '搜学校', VIEW_QUOTA: '查名额',
  }
  return {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 20, bottom: 40, left: 20 },
    xAxis: { type: 'category', data: data.map((d) => actionLabels[d.action] || d.action), axisLabel: { color: '#5a4e3a', rotate: 30 } },
    yAxis: { type: 'value', name: '次数', nameTextStyle: { color: '#5a4e3a' }, axisLabel: { color: '#5a4e3a' } },
    series: [{
      type: 'bar', data: data.map((d) => d.count),
      barWidth: 24,
      itemStyle: { color: '#E8784A', borderRadius: [4, 4, 0, 0] },
    }],
  }
}
