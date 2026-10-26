export const funnelOption = {
  tooltip: { trigger: 'item' as const },
  series: [{
    type: 'funnel' as const, left: '10%', top: 20, bottom: 20, width: '80%',
    sort: 'descending' as const, gap: 2,
    label: { show: true, position: 'inside' as const, fontSize: 13 },
    data: [
      { value: 320, name: '潜客咨询', itemStyle: { color: '#E8784A' } },
      { value: 180, name: '预约试听', itemStyle: { color: '#828fff' } },
      { value: 95, name: '报名缴费', itemStyle: { color: '#bae0ff' } },
      { value: 62, name: '续费留存', itemStyle: { color: '#e6f0ff' } },
    ],
  }],
}

export const retentionOption = {
  tooltip: { position: 'top' as const },
  grid: { top: 10, right: 20, bottom: 30, left: 80 },
  xAxis: { type: 'category' as const, data: ['1月', '2月', '3月', '4月', '5月', '6月'], splitArea: { show: true } },
  yAxis: { type: 'category' as const, data: ['续费3期', '续费2期', '续费1期', '新报'], splitArea: { show: true } },
  visualMap: { min: 60, max: 100, calculable: true, orient: 'horizontal' as const, left: 'center', bottom: 0, inRange: { color: ['#3d2e1a', '#7a5a1a', '#c7891a', '#f5a623', '#ffc069'] } },
  series: [{
    type: 'heatmap' as const,
    data: [[0,0,78],[1,0,85],[2,0,92],[3,0,88],[4,0,82],[5,0,90],[0,1,72],[1,1,80],[2,1,88],[3,1,85],[4,1,78],[5,1,86],[0,2,68],[1,2,75],[2,2,82],[3,2,78],[4,2,72],[5,2,80],[0,3,95],[1,3,90],[2,3,88],[3,3,92],[4,3,96],[5,3,94]],
    label: { show: true, fontSize: 12 },
  }],
}

export const pieOption = {
  tooltip: { trigger: 'item' as const, formatter: '{b}: {c}课时 ({d}%)' },
  legend: { bottom: 0, textStyle: { color: '#d0d6e0' } },
  series: [{
    type: 'pie' as const, radius: ['45%', '75%'], center: ['50%', '45%'],
    itemStyle: { borderRadius: 8, borderColor: '#010102', borderWidth: 4 },
    label: { show: true, position: 'outside' as const, formatter: '{b}\n{d}%', color: '#d0d6e0' },
    data: [
      { value: 280, name: '音乐', itemStyle: { color: '#E8784A' } },
      { value: 210, name: '数学', itemStyle: { color: '#27a644' } },
      { value: 180, name: '英语', itemStyle: { color: '#ff85c0' } },
      { value: 120, name: '编程', itemStyle: { color: '#b37feb' } },
      { value: 95, name: '美术', itemStyle: { color: '#f5a623' } },
    ],
  }],
}

export const teacherBarOption = {
  tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
  grid: { top: 10, right: 40, bottom: 10, left: 80 },
  xAxis: { type: 'value' as const, name: '课时' },
  yAxis: { type: 'category' as const, data: ['吴老师', '刘老师', '陈老师', '赵老师', '张老师', '李老师', '王老师'] },
  series: [{
    type: 'bar' as const, data: [20, 24, 28, 35, 38, 42, 48], barWidth: 18,
    label: { show: true, position: 'right' as const, fontSize: 12, color: '#d0d6e0' },
    itemStyle: { borderRadius: [0, 4, 4, 0],
      color: { type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0,
        colorStops: [{ offset: 0, color: '#E8784A' }, { offset: 1, color: '#828fff' }] } },
  }],
}

export const financeOption = {
  tooltip: { trigger: 'axis' as const },
  legend: { data: ['收入', '支出', '利润'], bottom: 0, textStyle: { color: '#d0d6e0' } },
  grid: { top: 20, right: 20, bottom: 40, left: 60 },
  xAxis: { type: 'category' as const, data: ['11月', '12月', '1月', '2月', '3月', '4月'] },
  yAxis: { type: 'value' as const, name: '元' },
  series: [
    { name: '收入', type: 'line' as const, data: [98000, 112000, 125000, 138000, 145000, 156800], smooth: true, lineStyle: { width: 3, color: '#27a644' }, itemStyle: { color: '#27a644' } },
    { name: '支出', type: 'line' as const, data: [45000, 48000, 52000, 55000, 58000, 62000], smooth: true, lineStyle: { width: 3, color: '#e03e2d' }, itemStyle: { color: '#e03e2d' } },
    { name: '利润', type: 'line' as const, data: [53000, 64000, 73000, 83000, 87000, 94800], smooth: true, lineStyle: { width: 3, color: '#E8784A' }, itemStyle: { color: '#E8784A' } },
  ],
}

export const payDistOption = {
  tooltip: { trigger: 'item' as const },
  legend: { bottom: 0, textStyle: { color: '#d0d6e0' } },
  series: [{
    type: 'pie' as const, radius: '70%', center: ['50%', '45%'],
    data: [
      { value: 65, name: '学期制付费' },
      { value: 20, name: '课时卡' },
      { value: 10, name: '月付' },
      { value: 5, name: '单次付费' },
    ],
    itemStyle: { borderRadius: 6, borderColor: '#010102', borderWidth: 3 },
    label: { formatter: '{b}: {d}%', color: '#d0d6e0' },
  }],
}
