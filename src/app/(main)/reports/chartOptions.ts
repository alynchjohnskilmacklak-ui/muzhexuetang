export const funnelOption = {
  tooltip: { trigger: 'item' as const },
  series: [{
    type: 'funnel' as const, left: '10%', top: 20, bottom: 20, width: '80%',
    sort: 'descending' as const, gap: 2,
    label: { show: true, position: 'inside' as const, fontSize: 13 },
    data: [
      { value: 320, name: '潜客咨询', itemStyle: { color: '#1677ff' } },
      { value: 180, name: '预约试听', itemStyle: { color: '#69b1ff' } },
      { value: 95, name: '报名缴费', itemStyle: { color: '#91caff' } },
      { value: 62, name: '续费留存', itemStyle: { color: '#bae0ff' } },
    ],
  }],
}

export const retentionOption = {
  tooltip: { position: 'top' as const },
  grid: { top: 10, right: 20, bottom: 30, left: 80 },
  xAxis: { type: 'category' as const, data: ['1月', '2月', '3月', '4月', '5月', '6月'], splitArea: { show: true } },
  yAxis: { type: 'category' as const, data: ['续费3期', '续费2期', '续费1期', '新报'], splitArea: { show: true } },
  visualMap: { min: 60, max: 100, calculable: true, orient: 'horizontal' as const, left: 'center', bottom: 0, inRange: { color: ['#fff7e6', '#ffd591', '#ffa940', '#fa8c16', '#d46b08'] } },
  series: [{
    type: 'heatmap' as const,
    data: [[0,0,78],[1,0,85],[2,0,92],[3,0,88],[4,0,82],[5,0,90],[0,1,72],[1,1,80],[2,1,88],[3,1,85],[4,1,78],[5,1,86],[0,2,68],[1,2,75],[2,2,82],[3,2,78],[4,2,72],[5,2,80],[0,3,95],[1,3,90],[2,3,88],[3,3,92],[4,3,96],[5,3,94]],
    label: { show: true, fontSize: 12 },
  }],
}

export const pieOption = {
  tooltip: { trigger: 'item' as const, formatter: '{b}: {c}课时 ({d}%)' },
  legend: { bottom: 0 },
  series: [{
    type: 'pie' as const, radius: ['45%', '75%'], center: ['50%', '45%'],
    itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 4 },
    label: { show: true, position: 'outside' as const, formatter: '{b}\n{d}%' },
    data: [
      { value: 280, name: '音乐', itemStyle: { color: '#1677ff' } },
      { value: 210, name: '数学', itemStyle: { color: '#52c41a' } },
      { value: 180, name: '英语', itemStyle: { color: '#eb2f96' } },
      { value: 120, name: '编程', itemStyle: { color: '#722ed1' } },
      { value: 95, name: '美术', itemStyle: { color: '#fa8c16' } },
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
    label: { show: true, position: 'right' as const, fontSize: 12 },
    itemStyle: { borderRadius: [0, 4, 4, 0],
      color: { type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0,
        colorStops: [{ offset: 0, color: '#1677ff' }, { offset: 1, color: '#69b1ff' }] } },
  }],
}

export const financeOption = {
  tooltip: { trigger: 'axis' as const },
  legend: { data: ['收入', '支出', '利润'], bottom: 0 },
  grid: { top: 20, right: 20, bottom: 40, left: 60 },
  xAxis: { type: 'category' as const, data: ['11月', '12月', '1月', '2月', '3月', '4月'] },
  yAxis: { type: 'value' as const, name: '元' },
  series: [
    { name: '收入', type: 'line' as const, data: [98000, 112000, 125000, 138000, 145000, 156800], smooth: true, lineStyle: { width: 3, color: '#52c41a' }, itemStyle: { color: '#52c41a' } },
    { name: '支出', type: 'line' as const, data: [45000, 48000, 52000, 55000, 58000, 62000], smooth: true, lineStyle: { width: 3, color: '#ff4d4f' }, itemStyle: { color: '#ff4d4f' } },
    { name: '利润', type: 'line' as const, data: [53000, 64000, 73000, 83000, 87000, 94800], smooth: true, lineStyle: { width: 3, color: '#1677ff' }, itemStyle: { color: '#1677ff' } },
  ],
}

export const payDistOption = {
  tooltip: { trigger: 'item' as const },
  legend: { bottom: 0 },
  series: [{
    type: 'pie' as const, radius: '70%', center: ['50%', '45%'],
    data: [
      { value: 65, name: '学期制付费' },
      { value: 20, name: '课时卡' },
      { value: 10, name: '月付' },
      { value: 5, name: '单次付费' },
    ],
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
    label: { formatter: '{b}: {d}%' },
  }],
}
