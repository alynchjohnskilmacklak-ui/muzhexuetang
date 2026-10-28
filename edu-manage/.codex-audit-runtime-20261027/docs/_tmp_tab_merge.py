# -*- coding: utf-8 -*-
import io

p = r'D:\01muzhexuetang\muzhexuetang\coding\edu-manage\src\app\parent\archive\client.tsx'
t = io.open(p, encoding='utf-8-sig').read()

def rep(old, new, must=1):
    global t
    c = t.count(old)
    assert c == must, (old[:60], c)
    t = t.replace(old, new)

# 1) TABS 5 -> 3
rep("""const TABS = [
  { key: 'overview', label: '概览', icon: '📊', hint: '总览' },
  { key: 'timeline', label: '时间线', icon: '🗓', hint: '记录' },
  { key: 'grades', label: '成绩分析', icon: '🎯', hint: '考试' },
  { key: 'hours', label: '出勤课时', icon: '🕐', hint: '考勤' },
  { key: 'materials', label: '资料文件', icon: '📁', hint: '讲义' },
]""",
"""const TABS = [
  { key: 'overview', label: '概览', icon: '📊', hint: '总览' },
  { key: 'timeline', label: '时间线', icon: '🗓', hint: '记录' },
  { key: 'grades', label: '成绩分析', icon: '🎯', hint: '考试' },
]""")

# 2) 数据加载条件
rep("const hoursRecordsQuery = studentId && activeTab === 'hours' ? `/api/parent/hour-records?studentId=${studentId}` : null",
    "const hoursRecordsQuery = studentId && (activeTab === 'overview' || activeTab === 'hours') ? `/api/parent/hour-records?studentId=${studentId}` : null")
rep("const materialsQuery = activeTab === 'materials' ? `/api/parent/materials?grade=${encodeURIComponent(selectedGrade || '初一')}` : null",
    "const materialsQuery = activeTab === 'timeline' || activeTab === 'materials' ? `/api/parent/materials?grade=${encodeURIComponent(selectedGrade || '初一')}` : null")

# 3) overview 块尾部插入「出勤概况」卡（在学情报告按钮 div 之后）
rep("""              {/* 学情报告 */}
              <div className="parent-growth-report-action">
                <Button type="primary" size="large" icon={<FileTextOutlined />} onClick={() => setReportOpen(true)}
                  style={{ borderRadius: 10, background: '#E8784A', border: 'none', padding: '10px 28px', fontSize: 14, height: 'auto' }}>
                  查看本期学情报告
                </Button>
              </div>
            </div>
          )}""",
"""              {/* 学情报告 */}
              <div className="parent-growth-report-action">
                <Button type="primary" size="large" icon={<FileTextOutlined />} onClick={() => setReportOpen(true)}
                  style={{ borderRadius: 10, background: '#E8784A', border: 'none', padding: '10px 28px', fontSize: 14, height: 'auto' }}>
                  查看本期学情报告
                </Button>
              </div>

              {/* 出勤概况（原「出勤课时」并入概览） */}
              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><ClockCircleOutlined style={{ color: '#E8784A' }} />出勤概况 <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9A8E7A', fontWeight: 400 }}>本月 · 按考勤结算口径</span></Text>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginTop: 11 }}>
                  {[
                    { label: '出勤', value: `${hourStats.present}`, color: '#1D9E75' },
                    { label: '请假', value: `${hourStats.leave}`, color: '#C77F00' },
                    { label: '旷课', value: `${hourStats.absent}`, color: '#E24B4A' },
                    { label: '补课', value: `${hourStats.makeup}`, color: '#534AB7' },
                    { label: '课时调整', value: `${hourStats.adjustment}`, color: '#8D806F' },
                    { label: '课时记录', value: `${hourStats.total} 条`, color: '#E8784A' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', background: '#FAF8F5', border: '1px solid #F0E7DE', borderRadius: 12, padding: '11px 5px' }}>
                      <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                      <div style={{ fontSize: 10.5, color: '#9A8E7A', marginTop: 3 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                {hourStats.lines.length > 0 && (
                  <div style={{ marginTop: 11, padding: '10px 12px', background: '#FFFBF7', border: '1px solid #F0E7DE', borderRadius: 10 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>当前课时余额</Text>
                    <div style={{ display: 'grid', gap: 4, marginTop: 5 }}>
                      {hourStats.lines.map(line => <div key={line} style={{ fontSize: 12.5, color: '#5A4E3A', fontWeight: 600 }}>{line}</div>)}
                    </div>
                  </div>
                )}
                {hourRecords.length > 0 && (
                  <Button type="link" style={{ padding: '8px 0 0', fontSize: 12.5 }} onClick={() => router.push('/parent/schedule')}>查看课时明细 ›</Button>
                )}
              </Card>
            </div>
          )}""")

# 4) 删除原 hours Tab 块（出勤课时整块）
hours_block_start = """          {/* ============ 出勤课时 Tab ============ */}"""
idx = t.find(hours_block_start)
assert idx > 0, 'hours block not found'
# 找到 materials 块开始作为结束
materials_block_start = """          {/* ============ 资料文件 Tab ============ */}"""
midx = t.find(materials_block_start)
assert midx > idx, 'materials block order'
t = t[:idx] + t[midx:]

# 5) 删除 materials 块（资料文件整块），结束于 </> 之前
# materials 块结尾是 973 行 }} 然后 974 </>——找到 '</>        )}' 前的位置
tail_marker = """            </div>
          )}
        </>
      )}"""
tid = t.find(tail_marker)
assert tid > 0, 'tail marker not found'
t = t[:tid] + tail_marker

# 6) timeline 块尾部插入「学习资料」（在成长记录 Card 之后、</div>)} 之前）
rep("""                  </section>
                )}
                {profile.record.timeline.length === 0 && <GuidedEmpty title="还没有成长记录" description="老师的课堂反馈、试卷与徽章会按时间沉淀在这里。" compact />}
              </Card>
            </div>
          )}""",
"""                  </section>
                )}
                {profile.record.timeline.length === 0 && <GuidedEmpty title="还没有成长记录" description="老师的课堂反馈、试卷与徽章会按时间沉淀在这里。" compact />}
              </Card>

              {/* 学习资料（原「资料文件」并入时间线） */}
              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13, overflow: 'hidden' }}>
                <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 2px 4px' }}><HistoryOutlined style={{ color: '#534AB7' }} />下节课讲义预告</Text>
                <ParentLessonPreviewHistory />
              </Card>

              <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', marginBottom: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 11 }}>
                  <Text strong style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}><FolderOpenOutlined style={{ color: '#E8784A' }} />学习资料</Text>
                  <Select size="small" value={selectedGrade} onChange={(value) => setSelectedGrade(value)} style={{ width: 120 }} options={['初一', '初二', '初三', '高一', '高二', '高三'].map(g => ({ label: g, value: g }))} />
                </div>
                {materialsLoading ? <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div> : materials.length === 0 ? (
                  <GuidedEmpty title="这个年级还没有学习资料" description="老师准备的讲义和练习会显示在这里，帮助孩子课后复习。" actionLabel="看看课堂反馈" onAction={() => router.push('/parent/class-feedback')} compact />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {materials.slice(0, 30).map(material => (
                      <div key={material.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', border: '1px solid #F0E7DE', borderRadius: 12, background: '#fff' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0, color: '#E8784A', background: 'rgba(232,120,74,.10)' }}>
                          <FileTextOutlined />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis={{ tooltip: material.title }}>{material.title}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>{material.subject} · {material.grade} · {fmtDate(material.createdAt)}</Text>
                        </div>
                        <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => window.open(`/api/materials/${material.id}/view?download=1`, '_blank')} style={{ background: '#E8784A', border: 'none', flexShrink: 0 }}>下载</Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}""")

io.open(p, 'w', encoding='utf-8-sig').write(t)
print('OK done')
