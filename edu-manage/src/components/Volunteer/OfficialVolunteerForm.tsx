'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import NextImage from 'next/image'
import { Button } from 'antd'
import { ArrowLeftOutlined, SyncOutlined } from '@ant-design/icons'
import { drawBrandHeader, applyWatermark, domToCanvas } from '@/lib/export-brand'
import { VolunteerReferenceNotice } from './VolunteerReferenceNotice'

const BRAND_BAR_HEIGHT = 74

type School = {
  schoolId: string
  name: string
  fullName: string
  xinleStatus: string[]
  isProvincialDemo: boolean
}

type SegmentKey = 'allocation' | 'shifan' | 'putong'
type StoredSchool = { schoolId?: string } | null
type StoredForm = { allocation?: StoredSchool[]; shifan?: StoredSchool[]; putong?: StoredSchool[]; tagBySchoolId?: Record<string, string> }
type RadioValue = 'clear' | 'major' | 'special'

const EMPTY_SEGMENTS = {
  allocation: Array<string>(3).fill(''),
  shifan: Array<string>(6).fill(''),
  putong: Array<string>(6).fill(''),
}

const MAJOR_OPTIONS = ['美术', '音乐', '体育']

function readIds(items: StoredSchool[] | undefined, length: number) {
  return Array.from({ length }, (_, index) => items?.[index]?.schoolId || '')
}

export default function OfficialVolunteerForm({ portal = 'admin' }: { portal?: 'admin' | 'parent' }) {
  const simulatorPath = portal === 'parent' ? '/parent/volunteer/simulation' : '/volunteer-sim'
  const router = useRouter()
  const pageRef = useRef<HTMLDivElement>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tagBySchoolId, setTagBySchoolId] = useState<Record<string, string>>({})
  const [segments, setSegments] = useState(EMPTY_SEGMENTS)
  const [firstARadio, setFirstARadio] = useState<RadioValue>('clear')
  const [firstASchool, setFirstASchool] = useState('')
  const [firstBSchool, setFirstBSchool] = useState('')
  const [firstBMajor, setFirstBMajor] = useState('')
  const [secondARadio, setSecondARadio] = useState<RadioValue>('clear')
  const [secondASchool, setSecondASchool] = useState('')
  const [secondBSchool, setSecondBSchool] = useState('')
  const [secondBMajor, setSecondBMajor] = useState('')

  useEffect(() => {
    let stored: StoredForm = {}
    try {
      stored = JSON.parse(sessionStorage.getItem('volunteer_form_data') || '{}') as StoredForm
    } catch {
      toast.warning('未能读取志愿篮数据，已打开空白模拟表')
    }

    const allocation = readIds(stored.allocation, 3)
    const allocationSet = new Set(allocation.filter(Boolean))
    const shifan = readIds(stored.shifan, 6).map((id) => allocationSet.has(id) ? '' : id)
    setSegments({ allocation, shifan, putong: readIds(stored.putong, 6) })
    setTagBySchoolId(stored.tagBySchoolId || {})

    fetch('/api/volunteer/schools')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || '学校数据加载失败')
        setSchools(Array.isArray(data.schools) ? data.schools : [])
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : '学校数据加载失败'))
      .finally(() => setLoading(false))
  }, [])

  const options = useMemo(() => {
    const tongzhao = schools.filter((school) => school.xinleStatus.includes('统招可报'))
    return {
      all: tongzhao,
      allocation: schools.filter((school) => school.xinleStatus.includes('分配生可报')),
      shifan: tongzhao.filter((school) => school.isProvincialDemo),
      putong: tongzhao.filter((school) => !school.isProvincialDemo),
    }
  }, [schools])

  function updateSegment(segment: SegmentKey, index: number, schoolId: string) {
    if (schoolId && segments[segment].some((value, ownIndex) => ownIndex !== index && value === schoolId)) {
      toast.warning('同一学校不能在同一段重复填报')
      return
    }
    if (schoolId && segment === 'allocation' && segments.shifan.includes(schoolId)) {
      toast.warning('该校已在D段填报，请先移除D段志愿')
      return
    }
    if (schoolId && segment === 'shifan' && segments.allocation.includes(schoolId)) {
      toast.warning('该校已在C段填报，无需重复')
      return
    }
    setSegments((current) => {
      const next = { ...current, [segment]: [...current[segment]] }
      next[segment][index] = schoolId
      return next
    })
  }

  function saveSimulation() {
    if (saving) return
    setSaving(true)
    try {
      const selectedIds = [...segments.allocation, ...segments.shifan, ...segments.putong].filter(Boolean)
      const selectedTags = selectedIds.map((id) => tagBySchoolId[id]).filter(Boolean)
      if (selectedTags.includes('冲刺') && !selectedTags.some((tag) => tag === '稳妥' || tag === '保底')) {
        toast.warning('当前方案没有保底学校，滑档风险高，建议至少加入 1 所稳妥/保底', { duration: 6000 })
      }
      const byId = new Map(schools.map((school) => [school.schoolId, school]))
      sessionStorage.setItem('volunteer_form_data', JSON.stringify({
        allocation: segments.allocation.map((id) => byId.get(id) || null),
        shifan: segments.shifan.map((id) => byId.get(id) || null),
        putong: segments.putong.map((id) => byId.get(id) || null),
        tagBySchoolId,
        officialExtras: {
          firstA: { mode: firstARadio, schoolId: firstASchool },
          firstB: { schoolId: firstBSchool, major: firstBMajor },
          secondA: { mode: secondARadio, schoolId: secondASchool },
          secondB: { schoolId: secondBSchool, major: secondBMajor },
        },
      }))
      toast.info('此为模拟填报，非官方，实际填报请登录石家庄市教育考试院官方平台', { duration: 6000 })
    } finally {
      setSaving(false)
    }
  }

  async function exportPdf() {
    if (!pageRef.current) return
    try {
      setExporting(true)
      const { jsPDF } = await import('jspdf')
      const canvas = await domToCanvas(pageRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        onclone: (clone) => {
          clone.querySelectorAll<HTMLSelectElement>('.page select').forEach((select) => {
            const replacement = document.createElement('div')
            const computed = select.ownerDocument.defaultView?.getComputedStyle(select)
            replacement.textContent = select.options[select.selectedIndex]?.text || '请选择'
            if (computed) {
              replacement.style.cssText = [
                `flex:${computed.flex}`,
                `min-width:${computed.minWidth}`,
                `max-width:${computed.maxWidth}`,
                `width:${computed.width}`,
                `height:${computed.height}`,
                `border:${computed.border}`,
                `border-radius:${computed.borderRadius}`,
                `background:${computed.backgroundColor}`,
                `padding:${computed.padding}`,
                `font:${computed.font}`,
                `color:${computed.color}`,
                'display:flex',
                'align-items:center',
                'overflow:hidden',
                'white-space:nowrap',
              ].join(';')
            }
            select.replaceWith(replacement)
          })
        },
      })
      // 顶部叠加标准品牌条（Logo + 标题 + 品牌名），原表单内容整体下移 BRAND_BAR_HEIGHT
      const brandCanvas = document.createElement('canvas')
      brandCanvas.width = canvas.width
      brandCanvas.height = canvas.height + BRAND_BAR_HEIGHT
      const bctx = brandCanvas.getContext('2d')!
      await drawBrandHeader(bctx, brandCanvas.width, '志愿填报模拟表')
      bctx.drawImage(canvas, 0, BRAND_BAR_HEIGHT)
      // 全页斜向低透明度水印（canvas 烤入，中文可正常显示）
      applyWatermark(bctx, brandCanvas.width, brandCanvas.height)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const imageHeight = brandCanvas.height * pageWidth / brandCanvas.width
      const image = brandCanvas.toDataURL('image/png')
      let heightLeft = imageHeight
      let position = 0
      pdf.addImage(image, 'PNG', 0, position, pageWidth, imageHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position = heightLeft - imageHeight
        pdf.addPage()
        pdf.addImage(image, 'PNG', 0, position, pageWidth, imageHeight)
        heightLeft -= pageHeight
      }
      pdf.save(`志愿填报模拟_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF已生成')
    } catch (error) {
      console.error('导出志愿填报PDF失败', error)
      toast.error('PDF导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  const allocationSet = new Set(segments.allocation.filter(Boolean))
  const dOptions = options.shifan.filter((school) => !allocationSet.has(school.schoolId))

  const totalFilled = segments.allocation.filter(Boolean).length + segments.shifan.filter(Boolean).length + segments.putong.filter(Boolean).length
  const tagCounts = useMemo(() => {
    const selectedIds = [...segments.allocation, ...segments.shifan, ...segments.putong].filter(Boolean)
    let chong = 0
    let wen = 0
    let bao = 0
    selectedIds.forEach((id) => {
      const tag = tagBySchoolId[id]
      if (tag === '冲刺' || tag === '分配生机会') chong++
      else if (tag === '稳妥') wen++
      else if (tag === '保底') bao++
    })
    return { chong, wen, bao, total: selectedIds.length }
  }, [segments, tagBySchoolId])

  const reimportFromSimulator = () => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('volunteer_form_data') || '{}') as StoredForm
      const allocation = readIds(stored.allocation, 3)
      const aSet = new Set(allocation.filter(Boolean))
      const shifan = readIds(stored.shifan, 6).map((id) => aSet.has(id) ? '' : id)
      setSegments({ allocation, shifan, putong: readIds(stored.putong, 6) })
      setTagBySchoolId(stored.tagBySchoolId || {})
      toast.success('已从模拟方案重新同步')
    } catch {
      toast.error('未能读取模拟方案数据')
    }
  }

  const clearForm = () => {
    setSegments(EMPTY_SEGMENTS)
    toast.info('已清空表单中所有志愿')
  }

  return (
    <div className="volunteer-official-form">
      <div className="page" ref={pageRef}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(simulatorPath)}
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            返回模拟测算
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              icon={<SyncOutlined />}
              onClick={reimportFromSimulator}
              style={{ borderRadius: 8, fontSize: 13 }}
            >
              从模拟方案同步
            </Button>
            <Button
              onClick={clearForm}
              style={{ borderRadius: 8, fontSize: 13, color: '#cf1322' }}
            >
              清空重选
            </Button>
          </div>
        </div>

        <div className="brand"><NextImage src="/images/volunteer-form-logo.jpg" alt="牧哲学堂 MOREJOY" width={360} height={96} /></div>
        <div className="page-title">2026中考志愿填报（模拟填报）</div>
        <VolunteerReferenceNotice />

        {/* 梯队健康度与填报进度卡片 */}
        <div style={{
          background: 'var(--color-surface-3)',
          border: '1px solid var(--color-hairline-strong)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)' }}>
              📋 官方模拟表进度：已选 {totalFilled}/15 个志愿
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-subtle)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>第一批分配生 {segments.allocation.filter(Boolean).length}/3</span>
              <span>·</span>
              <span>第一批省示范 {segments.shifan.filter(Boolean).length}/6</span>
              <span>·</span>
              <span>第二批普高 {segments.putong.filter(Boolean).length}/6</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 6, background: '#fdf4e3', color: '#C77F00', border: '1px solid #f0dca8', fontWeight: 600 }}>
              冲刺 {tagCounts.chong} 所
            </span>
            <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 6, background: '#eaf1f9', color: '#185FA5', border: '1px solid #bcd4ec', fontWeight: 600 }}>
              稳妥 {tagCounts.wen} 所
            </span>
            <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 6, background: '#eaf7f1', color: '#1D9E75', border: '1px solid #b6e2d2', fontWeight: 600 }}>
              保底 {tagCounts.bao} 所
            </span>
          </div>
        </div>

        {totalFilled >= 5 && tagCounts.bao === 0 && (
          <div style={{
            background: '#FFF2F0',
            border: '1px solid #FFCCC7',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            color: '#cf1322',
            fontSize: 12.5,
            lineHeight: 1.6,
          }}>
            ⚠️ <strong>滑档风险预警</strong>：当前填报方案中未包含任何保底学校！建议在第二批非省级示范普高文化类（C段）中至少填报 2 所保底高中，确保底线安全。
          </div>
        )}

        <div className="batch-wrap">
          <span className="batch-bar">第一批：省级示范性普通高中及国家中等职业教育改革发展示范校、国家和省级重点中等职业学校艺体类</span>

          <div className="seg">
            <div className="seg-head">
              <span className="seg-title"><span className="tag">A段：</span><span className="desc">省级示范性普通高中艺体类</span></span>
              <RadioGroup name="b1a" value={firstARadio} onChange={(value) => { setFirstARadio(value); if (value === 'clear') setFirstASchool('') }} />
            </div>
            <div className="vol-row center">
              <div className="vol-item push">
                <span className="vol-label">志愿1</span>
                <SchoolSelect value={firstASchool} options={options.all} loading={loading} onChange={setFirstASchool} tagBySchoolId={tagBySchoolId} />
              </div>
            </div>
          </div>

          <div className="seg">
            <div className="seg-head">
              <span className="seg-title"><span className="tag">B段：</span><span className="desc">国重省重中职学校艺术类</span></span>
            </div>
            <div className="vol-row center">
              <div className="vol-item push">
                <span className="vol-label">志愿1</span>
                <SchoolSelect value={firstBSchool} options={options.all} loading={loading} onChange={setFirstBSchool} style={{ maxWidth: 240 }} tagBySchoolId={tagBySchoolId} />
                <span className="vol-sub-label">专业</span>
                <MajorSelect value={firstBMajor} onChange={setFirstBMajor} />
              </div>
            </div>
          </div>

          <VolunteerSegment code="C段：" description="省级示范性普通高中分配生类" values={segments.allocation} options={options.allocation} loading={loading} tagBySchoolId={tagBySchoolId} onChange={(index, value) => updateSegment('allocation', index, value)} />
          <VolunteerSegment code="D段：" description="省级示范性普通高中（含综合高中）文化类" values={segments.shifan} options={dOptions} loading={loading} tagBySchoolId={tagBySchoolId} onChange={(index, value) => updateSegment('shifan', index, value)} />
        </div>

        <div className="batch-wrap">
          <span className="batch-bar">第二批：非省级示范性普通高中及普通中等职业学校艺体类</span>

          <div className="seg">
            <div className="seg-head">
              <span className="seg-title"><span className="tag">A段：</span><span className="desc">非省级示范性普通高中艺体类</span></span>
              <RadioGroup name="b2a" value={secondARadio} onChange={(value) => { setSecondARadio(value); if (value === 'clear') setSecondASchool('') }} />
            </div>
            <div className="vol-row center">
              <div className="vol-item push">
                <span className="vol-label">志愿1</span>
                <SchoolSelect value={secondASchool} options={options.all} loading={loading} onChange={setSecondASchool} tagBySchoolId={tagBySchoolId} />
              </div>
            </div>
          </div>

          <div className="seg">
            <div className="seg-head"><span className="seg-title"><span className="tag">B段：</span><span className="desc">普通中等职业学校艺术类</span></span></div>
            <div className="vol-row center">
              <div className="vol-item push">
                <span className="vol-label">志愿1</span>
                <SchoolSelect value={secondBSchool} options={options.all} loading={loading} onChange={setSecondBSchool} style={{ maxWidth: 240 }} tagBySchoolId={tagBySchoolId} />
                <span className="vol-sub-label">专业</span>
                <MajorSelect value={secondBMajor} onChange={setSecondBMajor} />
              </div>
            </div>
          </div>

          <VolunteerSegment code="C段：" description="非省级示范性普通高中文化类" values={segments.putong} options={options.putong} loading={loading} tagBySchoolId={tagBySchoolId} onChange={(index, value) => updateSegment('putong', index, value)} />
        </div>

        <div className="actions">
          <button type="button" className="btn btn-save" onClick={saveSimulation} disabled={saving}>{saving ? '正在保存...' : '保存志愿'}</button>
          <button type="button" className="btn btn-back" onClick={exportPdf} disabled={exporting}>{exporting ? '正在导出...' : '导出PDF'}</button>
          <button type="button" className="btn btn-back" onClick={() => router.push(simulatorPath)}>返回模拟测算</button>
        </div>
      </div>

      <style>{`
        .volunteer-official-form * { box-sizing: border-box; margin: 0; padding: 0; }
        .volunteer-official-form {
          font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
          background: var(--color-canvas);
          width: 100%;
          max-width: 100%;
          color: var(--color-ink);
          padding: 0;
        }
        .volunteer-official-form .page {
          max-width: 1120px;
          margin: 0 auto;
          background: var(--color-surface-1);
          border-radius: 14px;
          box-shadow: 0 2px 12px rgba(0,0,0,.06);
          padding: 28px 36px 40px;
        }
        .volunteer-official-form .brand { text-align: center; margin-bottom: 14px; }
        .volunteer-official-form .brand img { height: auto; width: 100%; max-width: 240px; }
        .volunteer-official-form .page-title {
          text-align: center;
          font-size: 32px;
          font-weight: 800;
          color: var(--color-ink);
          letter-spacing: 1px;
          margin-bottom: 26px;
        }
        /* 批次蓝条 */
        .volunteer-official-form .batch-bar {
          display: inline-block;
          background: var(--color-primary);
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          padding: 9px 18px;
          border-radius: 6px;
          margin: 22px 0 14px;
          box-shadow: 0 1px 3px rgba(26,115,216,.3);
        }
        .volunteer-official-form .batch-wrap:first-of-type .batch-bar { margin-top: 4px; }
        /* 段 */
        .volunteer-official-form .seg {
          background: var(--color-surface-3);
          border-radius: 6px;
          padding: 16px 20px 18px;
          margin-bottom: 14px;
        }
        .volunteer-official-form .seg-head {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 22px;
          margin-bottom: 14px;
        }
        .volunteer-official-form .seg-title { font-size: 15px; font-weight: 700; }
        .volunteer-official-form .seg-title .tag { color: var(--color-ink); }
        .volunteer-official-form .seg-title .desc { color: var(--color-brand-gold); }
        .volunteer-official-form .radio-group { display: flex; flex-wrap: wrap; align-items: center; gap: 26px; }
        .volunteer-official-form .radio-item { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
        .volunteer-official-form .radio-item input { width: 16px; height: 16px; accent-color: var(--color-primary); cursor: pointer; }
        .volunteer-official-form .radio-item.clear span { color: var(--color-error); font-weight: 600; }
        /* 志愿行 */
        .volunteer-official-form .vol-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px 30px;
          align-items: center;
        }
        .volunteer-official-form .vol-row.single { grid-template-columns: 1fr; }
        .volunteer-official-form .vol-row.center { justify-items: end; }
        .volunteer-official-form .vol-item { min-width: 0; display: flex; align-items: center; gap: 12px; }
        .volunteer-official-form .vol-item.push { justify-content: flex-end; }
        .volunteer-official-form .vol-label { font-size: 14px; font-weight: 700; color: var(--color-ink); white-space: nowrap; }
        .volunteer-official-form .vol-sub-label { font-size: 14px; font-weight: 700; color: var(--color-ink); margin-left: 10px; white-space: nowrap; }
        .volunteer-official-form select {
          flex: 1;
          min-width: 0;
          width: 100%;
          max-width: 100%;
          height: 34px;
          border: 1px solid var(--color-hairline-strong);
          border-radius: 3px;
          background: var(--color-surface-1);
          padding: 0 10px;
          font-size: 14px;
          color: var(--color-ink-muted);
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23bbb' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }
        .volunteer-official-form select:invalid { color: #b3b3b3; }
        .volunteer-official-form select:hover { border-color: var(--color-primary); }
        /* 操作按钮 */
        .volunteer-official-form .actions { text-align: center; margin-top: 30px; }
        .volunteer-official-form .btn {
          border: none;
          border-radius: 4px;
          padding: 9px 30px;
          font-size: 15px;
          cursor: pointer;
          margin: 0 10px;
        }
        .volunteer-official-form .btn-save { background: var(--color-primary); color: #fff; box-shadow: 0 2px 4px rgba(46,170,59,.3); }
        .volunteer-official-form .btn-save:hover { background: var(--color-primary-hover); }
        .volunteer-official-form .btn-back { background: var(--color-surface-3); color: var(--color-ink-muted); border: 1px solid var(--color-hairline-strong); }
        .volunteer-official-form .btn-back:hover { background: var(--color-surface-4); }
        @media (max-width: 760px) {
          .volunteer-official-form .vol-row { grid-template-columns: 1fr; }
          .volunteer-official-form .seg { padding: 12px; }
          .volunteer-official-form .vol-item { width: 100%; flex-wrap: wrap; }
          .volunteer-official-form .vol-item select { flex-basis: 100%; }
          .volunteer-official-form .radio-group { gap: 12px; }
          .volunteer-official-form .btn { padding: 9px 14px; }
          .volunteer-official-form .page { padding: 16px 12px 24px; }
          .volunteer-official-form .page-title { font-size: 24px; }
          .volunteer-official-form .actions {
            position: sticky;
            bottom: 0;
            z-index: 20;
            margin: 24px -12px 0;
            padding: 12px 8px calc(12px + env(safe-area-inset-bottom));
            background: var(--color-surface-1);
            border-top: 1px solid var(--color-hairline);
          }
          .volunteer-official-form .actions .btn { margin: 4px; }
        }
      `}</style>
    </div>
  )
}

function RadioGroup({ name, value, onChange }: { name: string; value: RadioValue; onChange: (value: RadioValue) => void }) {
  return (
    <div className="radio-group">
      <label className="radio-item clear"><input type="radio" name={name} checked={value === 'clear'} onChange={() => onChange('clear')} /><span>清空本段志愿</span></label>
      <label className="radio-item"><input type="radio" name={name} checked={value === 'major'} onChange={() => onChange('major')} /><span>专业班（专过文排）</span></label>
      <label className="radio-item"><input type="radio" name={name} checked={value === 'special'} onChange={() => onChange('special')} /><span>特长生（文过专排）</span></label>
    </div>
  )
}

function VolunteerSegment({ code, description, values, options, loading, onChange, tagBySchoolId }: {
  code: string
  description: string
  values: string[]
  options: School[]
  loading: boolean
  onChange: (index: number, value: string) => void
  tagBySchoolId?: Record<string, string>
}) {
  return (
    <div className="seg">
      <div className="seg-head"><span className="seg-title"><span className="tag">{code}</span><span className="desc">{description}</span></span></div>
      <div className="vol-row">
        {values.map((value, index) => (
          <div className="vol-item" key={`${code}-${index}`}>
            <span className="vol-label">志愿{index + 1}</span>
            <SchoolSelect
              value={value}
              options={options}
              loading={loading}
              tagBySchoolId={tagBySchoolId}
              onChange={(schoolId) => onChange(index, schoolId)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function SchoolSelect({ value, options, loading, onChange, style, tagBySchoolId }: {
  value: string
  options: School[]
  loading: boolean
  onChange: (value: string) => void
  style?: { maxWidth: number }
  tagBySchoolId?: Record<string, string>
}) {
  const currentTag = value && tagBySchoolId ? tagBySchoolId[value] : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
      <select required value={value} style={style} onChange={(event) => onChange(event.target.value)}>
        <option value="" disabled>{loading ? '正在加载学校...' : '请选择志愿学校'}</option>
        {options.map((school) => {
          const tag = tagBySchoolId?.[school.schoolId]
          const prefix = tag ? `[${tag}] ` : ''
          return (
            <option key={school.schoolId} value={school.schoolId}>
              {prefix}{school.fullName || school.name}
            </option>
          )
        })}
      </select>
      {currentTag && (
        <span
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            background: currentTag === '冲刺' ? '#fdf4e3' : currentTag === '稳妥' ? '#eaf1f9' : currentTag === '保底' ? '#eaf7f1' : '#f5f2ee',
            color: currentTag === '冲刺' ? '#C77F00' : currentTag === '稳妥' ? '#185FA5' : currentTag === '保底' ? '#1D9E75' : '#9a8e7a',
            border: `1px solid ${currentTag === '冲刺' ? '#f0dca8' : currentTag === '稳妥' ? '#bcd4ec' : currentTag === '保底' ? '#b6e2d2' : '#e5ddd0'}`,
            whiteSpace: 'nowrap',
          }}
        >
          {currentTag}
        </span>
      )}
    </div>
  )
}

function MajorSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select required value={value} style={{ maxWidth: 240 }} onChange={(event) => onChange(event.target.value)}>
      <option value="" disabled>请选择</option>
      {MAJOR_OPTIONS.map((major) => <option key={major} value={major}>{major}</option>)}
    </select>
  )
}
