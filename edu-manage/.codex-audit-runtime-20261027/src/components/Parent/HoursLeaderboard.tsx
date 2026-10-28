'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, Empty, Tag, Typography } from 'antd'
import { RiseOutlined, TrophyOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontSize: 13 }}>
      图表加载中...
    </div>
  ),
})

export interface ClassmateHours {
  maskedName: string
  hours: number
}

export interface HoursLeaderboardProps {
  studentName?: string
  mineHours: number
  classmates: ClassmateHours[]
  hasData: boolean
}

/** 三档反馈文案（每档多条，自动循环轮播） */
const TIERS = {
  praise: {
    label: '表扬', title: '表扬 · 超过班级平均时长', color: '#1D9E75', bg: '#E9F7F0', border: '#B7E4CE',
    msgs: [
      (name: string) => `${name}同学，这个月你的上课时长已经超过班级平均，这份坚持和投入老师都看在眼里。保持这个节奏，稳扎稳打，你会越来越接近自己的目标。继续加油！`,
      (name: string) => `${name}同学，你的课时进度领先班级平均水平，说明你在学习上下了真功夫。路是一步一步走出来的，继续保持这份劲头，我们看好你！`,
      (name: string) => `${name}同学，本月的学习时长你跑在了班级平均水平前面，很不容易。接下来可以再向更高的目标看齐，课堂上多挑战一点难题，你会更强。加油！`,
    ],
  },
  encourage: {
    label: '鼓励', title: '鼓励 · 与班级平均持平', color: '#C77F00', bg: '#FDF3E3', border: '#F3D9A4',
    msgs: [
      (name: string) => `${name}同学，最近状态不错，课堂上总能看到你踏实学习的样子，节奏保持得很好。照这个势头走下去，理想的高中离你越来越近——要是再使一分劲，就更稳了。加油！`,
      (name: string) => `${name}同学，这个月的课时进度和班级平均水平基本持平，这份坚持很难得。现在正是再往上冲一冲的好时候，试着每天多解决一道难题、多记一个知识点，你会发现更好的自己。看好你！`,
      (name: string) => `${name}同学，你一步一个脚印走得特别稳，我们都看在眼里。接下来的日子，把劲儿再攒足一点，稳稳往上走，目标学校会为你敞开大门。加油！`,
      (name: string) => `${name}同学：努力值得肯定，潜力还在前方。再加一把劲，把“优秀”写进成绩单！`,
    ],
  },
  remind: {
    label: '提醒', title: '提醒 · 低于班级平均', color: '#D64545', bg: '#FCEBEB', border: '#F3C0C0',
    msgs: [
      (name: string) => `${name}同学，我知道学习这件事，有时候真的挺辛苦的，能一直坚持到现在的你，已经很了不起了。每个人都有自己的节奏，暂时落后一点，真的不代表什么。中考是一场长跑，比的不是谁一开始跑得快，而是谁更愿意坚持到最后。接下来的日子，我们不着急，就从一个小目标开始：今天多听懂十分钟，明天多记下一个知识点，后天把落下的课时补回一点。你每走一步都算数，每努力一次都在靠近更好的自己。老师和家长都相信你，你也一定要相信自己。加油，我们一直陪着你！`,
      (name: string) => `${name}同学，你最近辛苦了。进度暂时没跟上，这不是你的错，也别因此否定自己。有人走得快，有人走得稳，而你正在用自己的方式往前走，这本身就值得表扬。如果觉得累，就歇一歇再出发；如果觉得难，就把目标切小一点——今天只弄懂一个公式、背会五个单词，就是了不起的进步。一切都还来得及。你努力的样子真的很酷，我们都在你身后。加油！`,
      (name: string) => `${name}同学，别灰心，你只是暂时慢了一点点，不是不行，更不是输。回头看看，你已经比开学时的自己进步了。接下来的每一天，我们都可以一起往前挪一点：多学半小时，多问老师一个问题，把落下的课时一点一点追回来。你真正的对手从来不是别人，而是昨天的自己。只要今天的你比昨天更努力，你就是自己的赢家。慢慢来，比较快。加油，我们都看好你！`,
      (name: string) => `${name}同学，累了就歇一歇，但别放弃。你走的每一步都算数，慢一点没关系，方向对就值得。从现在起，每天多努力一点点，把属于你的精彩一点一点赢回来。我们陪着你，加油！`,
    ],
  },
}

export function HoursLeaderboard({ studentName = '我的孩子', mineHours, classmates, hasData }: HoursLeaderboardProps) {
  const isMobile = useIsMobile() ?? false

  const { avg, diff, tier, rows } = useMemo(() => {
    // 只统计本月有课时的同学：0 课时同学不上榜，避免榜单被垫底数据刷屏、领先比例失真
    const active = classmates.filter((item) => item.hours > 0)
    const all = active.length + 1
    const sum = active.reduce((total, item) => total + item.hours, 0) + mineHours
    const avg = all > 0 ? sum / all : 0
    // 孩子课时高于班级平均 → 优秀档；持平 → 鼓励档；低于 → 提醒档（不再按“超过多少同学”的百分比判定，
    // 避免与最高者并列时比例偏低、档位却看着不合直觉）
    const diff = mineHours - avg
    const tier = mineHours > avg ? TIERS.praise : mineHours >= avg ? TIERS.encourage : TIERS.remind
    const ranked = [
      ...active.map((item) => ({ name: item.maskedName, hours: item.hours, me: false })),
      { name: studentName, hours: mineHours, me: true },
    ].sort((a, b) => b.hours - a.hours)
    // 最多展示 10 行：孩子在前 10 名内直接展示前 10；排名更靠后时展示前 9 名 + 孩子自己（保证突出孩子排名）
    const meIndex = ranked.findIndex((row) => row.me)
    const rows = meIndex >= 0 && meIndex < 10
      ? ranked.slice(0, 10)
      : [...ranked.slice(0, 9), ranked[meIndex >= 0 ? meIndex : ranked.length - 1]]
    return { avg, diff, tier, rows }
  }, [classmates, mineHours, studentName])

  // 同档位文案自动循环轮播（每 8 秒切换一条）
  const [msgIndex, setMsgIndex] = useState(0)
  useEffect(() => {
    const count = tier.msgs.length
    if (count <= 1) return
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % count)
    }, 8000)
    return () => clearInterval(timer)
  }, [tier])

  if (!hasData) {
    const peerHasHours = classmates.some((item) => item.hours > 0)
    const explanation = mineHours > 0
      ? `孩子本月已记录 ${mineHours} 小时课时，暂时没有可比较的同班记录。`
      : peerHasHours
        ? '同班已有课时记录，孩子本月尚无已结算课时。'
        : '孩子本月暂无已结算考勤课时，历史累计课时不受影响。'
    return (
      <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={(
            <span>
              本月暂不能进行同班课时对比
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{explanation}</Text>
            </span>
          )}
        />
      </Card>
    )
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis' as const,
      triggerOn: 'click' as const,
      renderMode: 'richText' as const,
      confine: true,
      textStyle: { fontSize: 11, lineHeight: 15 },
      padding: [6, 8],
    },
    grid: { left: 8, right: 44, top: 10, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value' as const,
      name: '小时',
      nameTextStyle: { color: '#9A8E7A', fontSize: 10 },
      axisLabel: { color: '#9A8E7A', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } },
    },
    yAxis: {
      type: 'category' as const,
      // 排名序号 + 脱敏姓名：同姓同学也能一眼区分
      data: rows.map((row, index) => `${index + 1} ${row.name}`),
      axisLabel: { color: '#5A4E3A', fontSize: isMobile ? 11 : 12 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: '本月课时（小时）',
        type: 'bar' as const,
        barWidth: isMobile ? 11 : 15,
        barMaxWidth: 18,
        data: rows.map((row, index) => ({
          value: row.hours,
          itemStyle: {
            color: row.me ? '#E8784A' : (index % 2 ? 'rgba(232,120,74,.38)' : 'rgba(232,120,74,.22)'),
            borderRadius: row.me ? [4, 4, 4, 4] : [2, 2, 2, 2],
          },
        })),
        label: { show: true, position: 'right' as const, color: '#1A1201', fontSize: isMobile ? 10 : 11, formatter: '{c}' },
        markLine: {
          silent: true,
          symbol: 'none' as const,
          data: [{ xAxis: Number(avg.toFixed(1)) }],
          lineStyle: { color: '#123C35', type: 'dashed' as const, width: 1 },
          label: {
            formatter: `班级平均 ${avg.toFixed(1)}h`,
            color: '#123C35',
            fontSize: 10,
            position: 'insideEndTop' as const,
          },
        },
      },
    ],
  }

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', overflow: 'hidden' }}
      styles={{ body: { padding: isMobile ? 14 : 20 } }}
      title={(
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', rowGap: 6 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: '#FFF0E6', color: '#E8784A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
            <RiseOutlined />
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1201' }}>上课时长，谁在领先？</span>
          <Tag style={{ marginLeft: 2, borderRadius: 20, border: 'none', background: '#FFF0E6', color: '#C2541F', fontWeight: 600, fontSize: 11 }}>
            {studentName} · 本月
          </Tag>
        </span>
      )}
      extra={!isMobile ? <span style={{ fontSize: 12, color: '#9A8E7A' }}>与同班同学对比</span> : undefined}
    >
      {/* 三档反馈横幅 */}
      <div
        style={{
          borderRadius: 12,
          padding: isMobile ? '12px 12px' : '12px 14px',
          marginBottom: 12,
          background: tier.bg,
          border: `1px solid ${tier.border}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <span style={{ width: 42, height: 42, borderRadius: 12, background: tier.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: `0 4px 10px ${tier.color}33` }}>
          {tier === TIERS.praise ? <TrophyOutlined /> : <RiseOutlined />}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ color: tier.color, fontSize: 14.5 }}>{tier.title}</strong>
          <div
            key={`${tier.label}-${msgIndex}`}
            style={{ color: '#5A4E3A', fontSize: 13, marginTop: 3, lineHeight: 1.62, animation: 'hcFadeIn .5s ease', minHeight: isMobile ? 42 : 40 }}
          >
            {tier.msgs[msgIndex % tier.msgs.length](studentName)}
          </div>
        </span>
      </div>
      <style>{'@keyframes hcFadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}'}</style>

      {/* KPI 三卡：移动端三列并排，数字为主 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 10 }}>
        {[
          { label: '我的课时', value: `${mineHours}`, unit: '小时', highlight: false },
          { label: '班级平均', value: `${avg.toFixed(1)}`, unit: '小时', highlight: false },
          {
            label: diff >= 0 ? '高于平均' : '低于平均',
            value: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`,
            unit: '小时',
            highlight: true,
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: 12,
              padding: isMobile ? '10px 4px' : '12px 8px',
              textAlign: 'center',
              background: item.highlight ? (diff >= 0 ? 'linear-gradient(135deg,#C2541F,#E8784A)' : 'linear-gradient(135deg,#9A8E7A,#B8ACA0)') : '#FAF8F5',
              border: item.highlight ? 'none' : '1px solid #F0E7DE',
            }}
          >
            <div style={{ fontSize: isMobile ? 10.5 : 11, color: item.highlight ? 'rgba(255,255,255,.85)' : '#9A8E7A', whiteSpace: 'nowrap' }}>{item.label}</div>
            <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: item.highlight ? '#fff' : '#1A1201', fontVariantNumeric: 'tabular-nums', marginTop: 2, whiteSpace: 'nowrap' }}>
              {item.value}<span style={{ fontSize: 11, fontWeight: 500, opacity: .7, marginLeft: 2 }}>{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: isMobile ? 400 : 360, marginTop: 4 }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
      </div>

      <div style={{ fontSize: 12, color: '#9A8E7A', marginTop: 8, lineHeight: 1.6 }}>
        * 仅展示本月有课时的部分同学（按课时排序），姓名已脱敏；对比结果仅供参考，请结合孩子实际情况看待。
      </div>
    </Card>
  )
}
