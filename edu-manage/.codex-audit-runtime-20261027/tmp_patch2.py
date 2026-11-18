# -*- coding: utf-8 -*-
import io, sys

path = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent\archive\client.tsx'
with io.open(path, encoding='utf-8', newline='') as f:
    t = f.read()

old = """              {/* 学习趋势 */}
              {growth && trendPres && (
                <Card bordered={false} style={{ marginBottom: 13, borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', background: trendPres.background }} styles={{ body: { padding: isMobile ? 14 : 18 } }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ color: trendPres.color, fontSize: 22, lineHeight: 1 }}>{trendPres.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}>学习趋势</div>
                      <div style={{ color: trendPres.color, fontSize: isMobile ? 17 : 19, fontWeight: 750, marginTop: 2 }}>{trendPres.label}</div>
                      {growth.trend.description && <div style={{ color: 'var(--color-ink-muted)', lineHeight: 1.7, marginTop: 5, fontSize: 13 }}>{growth.trend.description}</div>}
                    </div>
                  </div>
                </Card>
              )}"""

new = """              {/* 学习趋势：状态标签 + 近N个月各科掌握率迷你折线 */}
              {growth && trendPres && (
                <Card bordered={false} style={{ marginBottom: 13, borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }} styles={{ body: { padding: isMobile ? 14 : 18 } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 10, background: trendPres.background, color: trendPres.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{trendPres.icon}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1A1B1C' }}>学习趋势</div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: trendPres.color, background: trendPres.background, padding: '2px 9px', borderRadius: 999 }}>{trendPres.label}</span>
                    {overviewTrendSeries && overviewTrendSeries.length > 1 && <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>近{months}个月各科掌握率</Text>}
                  </div>
                  {overviewTrendSeries && overviewTrendSeries.length > 1 ? (
                    <ReactECharts style={{ height: 150, marginTop: 8 }} option={{ backgroundColor: 'transparent', tooltip: { trigger: 'axis', triggerOn: 'click', renderMode: 'richText', confine: true, textStyle: { fontSize: 10, lineHeight: 14 }, padding: [6, 8] }, grid: { left: 36, right: 16, top: 14, bottom: 24, containLabel: true }, xAxis: { type: 'time', axisLabel: { fontSize: 9, formatter: '{MM}-{dd}', color: '#9A8E7A' }, axisLine: { lineStyle: { color: 'rgba(0,0,0,.08)' } }, axisTick: { show: false } }, yAxis: { type: 'value', min: 0, max: 100, axisLabel: { fontSize: 9, formatter: '{value}%', color: '#9A8E7A' }, splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } } }, series: [{ type: 'line', smooth: true, data: overviewTrendSeries, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2.5, color: '#E8784A' }, itemStyle: { color: '#E8784A' }, areaStyle: { color: 'rgba(232,120,74,.12)' }, label: { show: true, position: 'top', fontSize: 9, color: '#C2541F', formatter: function (p: any) { return p.value ? String(p.value[1]) + '%' : '' }, labelLayout: { hideOverlap: true } } }] }} opts={{ renderer: 'svg' }} />
                  ) : (
                    <div style={{ color: 'var(--color-ink-muted)', lineHeight: 1.7, marginTop: 8, fontSize: 13 }}>{growth.trend.description}</div>
                  )}
                </Card>
              )}"""

if t.count(old) != 1:
    print('old count:', t.count(old))
    sys.exit(1)
t = t.replace(old, new, 1)
with io.open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(t)
print('trend card patched OK')
