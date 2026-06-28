'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type School = {
  schoolId: string
  name: string
  fullName: string
  xinleStatus: string[]
  isProvincialDemo: boolean
}

type SegmentKey = 'allocation' | 'shifan' | 'putong'
type StoredSchool = { schoolId?: string } | null
type StoredForm = { allocation?: StoredSchool[]; shifan?: StoredSchool[]; putong?: StoredSchool[] }
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

export default function OfficialVolunteerFormPage() {
  const router = useRouter()
  const pageRef = useRef<HTMLDivElement>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
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
    const byId = new Map(schools.map((school) => [school.schoolId, school]))
    sessionStorage.setItem('volunteer_form_data', JSON.stringify({
      allocation: segments.allocation.map((id) => byId.get(id) || null),
      shifan: segments.shifan.map((id) => byId.get(id) || null),
      putong: segments.putong.map((id) => byId.get(id) || null),
      officialExtras: {
        firstA: { mode: firstARadio, schoolId: firstASchool },
        firstB: { schoolId: firstBSchool, major: firstBMajor },
        secondA: { mode: secondARadio, schoolId: secondASchool },
        secondB: { schoolId: secondBSchool, major: secondBMajor },
      },
    }))
    toast.info('此为模拟填报，非官方，实际填报请登录石家庄市教育考试院官方平台', { duration: 6000 })
  }

  async function exportPdf() {
    if (!pageRef.current) return
    try {
      setExporting(true)
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(pageRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        onclone: (documentClone) => {
          documentClone.querySelectorAll<HTMLSelectElement>('.page select').forEach((select) => {
            const replacement = documentClone.createElement('div')
            const computed = documentClone.defaultView?.getComputedStyle(select)
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
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const imageHeight = canvas.height * pageWidth / canvas.width
      const image = canvas.toDataURL('image/png')
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

  return (
    <>
      <div className="page" ref={pageRef}>
        <div className="brand"><img src="/images/volunteer-form-logo.jpg" alt="牧哲学堂 MOREJOY" /></div>
        <div className="page-title">2026中考志愿填报（模拟填报）</div>

        <div className="batch-wrap">
          <span className="batch-bar">第一批：省级示范性普通高中及国家中等职业教育改革发展示范校、国家和省级重点中等职业学校艺体类</span>

          <div className="seg">
            <div className="seg-head">
              <span className="seg-title"><span className="tag">A段：</span><span className="desc">省级示范性普通高中艺体类</span></span>
              <RadioGroup name="b1a" value={firstARadio} onChange={(value) => { setFirstARadio(value); if (value === 'clear') setFirstASchool('') }} />
            </div>
            <div className="vol-row center">
              <div className="vol-item push"><span className="vol-label">志愿1</span><SchoolSelect value={firstASchool} options={options.all} loading={loading} onChange={setFirstASchool} /></div>
            </div>
          </div>

          <div className="seg">
            <div className="seg-head">
              <span className="seg-title"><span className="tag">B段：</span><span className="desc">国重省重中职学校艺术类</span></span>
            </div>
            <div className="vol-row center">
              <div className="vol-item push">
                <span className="vol-label">志愿1</span>
                <SchoolSelect value={firstBSchool} options={options.all} loading={loading} onChange={setFirstBSchool} style={{ maxWidth: 240 }} />
                <span className="vol-sub-label">专业</span>
                <MajorSelect value={firstBMajor} onChange={setFirstBMajor} />
              </div>
            </div>
          </div>

          <VolunteerSegment code="C段：" description="省级示范性普通高中分配生类" values={segments.allocation} options={options.allocation} loading={loading} onChange={(index, value) => updateSegment('allocation', index, value)} />
          <VolunteerSegment code="D段：" description="省级示范性普通高中（含综合高中）文化类" values={segments.shifan} options={dOptions} loading={loading} onChange={(index, value) => updateSegment('shifan', index, value)} />
        </div>

        <div className="batch-wrap">
          <span className="batch-bar">第二批：非省级示范性普通高中及普通中等职业学校艺体类</span>

          <div className="seg">
            <div className="seg-head">
              <span className="seg-title"><span className="tag">A段：</span><span className="desc">非省级示范性普通高中艺体类</span></span>
              <RadioGroup name="b2a" value={secondARadio} onChange={(value) => { setSecondARadio(value); if (value === 'clear') setSecondASchool('') }} />
            </div>
            <div className="vol-row center">
              <div className="vol-item push"><span className="vol-label">志愿1</span><SchoolSelect value={secondASchool} options={options.all} loading={loading} onChange={setSecondASchool} /></div>
            </div>
          </div>

          <div className="seg">
            <div className="seg-head"><span className="seg-title"><span className="tag">B段：</span><span className="desc">普通中等职业学校艺术类</span></span></div>
            <div className="vol-row center">
              <div className="vol-item push">
                <span className="vol-label">志愿1</span>
                <SchoolSelect value={secondBSchool} options={options.all} loading={loading} onChange={setSecondBSchool} style={{ maxWidth: 240 }} />
                <span className="vol-sub-label">专业</span>
                <MajorSelect value={secondBMajor} onChange={setSecondBMajor} />
              </div>
            </div>
          </div>

          <VolunteerSegment code="C段：" description="非省级示范性普通高中文化类" values={segments.putong} options={options.putong} loading={loading} onChange={(index, value) => updateSegment('putong', index, value)} />
        </div>

        <div className="actions">
          <button type="button" className="btn btn-save" onClick={saveSimulation}>保存志愿</button>
          <button type="button" className="btn btn-back" onClick={exportPdf} disabled={exporting}>{exporting ? '正在导出...' : '导出PDF'}</button>
          <button type="button" className="btn btn-back" onClick={() => router.push('/volunteer-sim')}>返回</button>
        </div>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
          background: #f0f2f5;
          color: #333;
          padding: 24px 12px 60px;
        }
        .page {
          max-width: 1120px;
          margin: 0 auto;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,.06);
          padding: 28px 36px 40px;
        }
        .brand { text-align: center; margin-bottom: 14px; }
        .brand img { height: 64px; }
        .page-title {
          text-align: center;
          font-size: 32px;
          font-weight: 800;
          color: #1a1a1a;
          letter-spacing: 1px;
          margin-bottom: 26px;
        }
        /* 批次蓝条 */
        .batch-bar {
          display: inline-block;
          background: linear-gradient(180deg, #2f8df0 0%, #1a73d8 100%);
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          padding: 9px 18px;
          border-radius: 6px;
          margin: 22px 0 14px;
          box-shadow: 0 1px 3px rgba(26,115,216,.3);
        }
        .batch-wrap:first-of-type .batch-bar { margin-top: 4px; }
        /* 段 */
        .seg {
          background: linear-gradient(180deg, #f7f8fa 0%, #eef0f3 100%);
          border-radius: 6px;
          padding: 16px 20px 18px;
          margin-bottom: 14px;
        }
        .seg-head {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 22px;
          margin-bottom: 14px;
        }
        .seg-title { font-size: 15px; font-weight: 700; }
        .seg-title .tag { color: #1a1a1a; }
        .seg-title .desc { color: #a81f6e; }
        .radio-group { display: flex; align-items: center; gap: 26px; }
        .radio-item { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
        .radio-item input { width: 16px; height: 16px; accent-color: #1a73d8; cursor: pointer; }
        .radio-item.clear span { color: #e23a3a; font-weight: 600; }
        /* 志愿行 */
        .vol-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px 30px;
          align-items: center;
        }
        .vol-row.single { grid-template-columns: 1fr; }
        .vol-row.center { justify-items: end; }
        .vol-item { display: flex; align-items: center; gap: 12px; }
        .vol-item.push { justify-content: flex-end; }
        .vol-label { font-size: 14px; font-weight: 700; color: #333; white-space: nowrap; }
        .vol-sub-label { font-size: 14px; font-weight: 700; color: #333; margin-left: 10px; white-space: nowrap; }
        select {
          flex: 1;
          min-width: 180px;
          height: 34px;
          border: 1px solid #d9d9d9;
          border-radius: 3px;
          background: #fff;
          padding: 0 10px;
          font-size: 14px;
          color: #555;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23bbb' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }
        select:invalid { color: #b3b3b3; }
        select:hover { border-color: #4096ff; }
        /* 操作按钮 */
        .actions { text-align: center; margin-top: 30px; }
        .btn {
          border: none;
          border-radius: 4px;
          padding: 9px 30px;
          font-size: 15px;
          cursor: pointer;
          margin: 0 10px;
        }
        .btn-save { background: #2eaa3b; color: #fff; box-shadow: 0 2px 4px rgba(46,170,59,.3); }
        .btn-save:hover { background: #279a33; }
        .btn-back { background: #f5f5f5; color: #555; border: 1px solid #d9d9d9; }
        .btn-back:hover { background: #e8e8e8; }
        @media (max-width: 760px) {
          .vol-row { grid-template-columns: 1fr; }
          .page { padding: 18px 14px 30px; }
          .page-title { font-size: 24px; }
        }
      `}</style>
    </>
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

function VolunteerSegment({ code, description, values, options, loading, onChange }: {
  code: string
  description: string
  values: string[]
  options: School[]
  loading: boolean
  onChange: (index: number, value: string) => void
}) {
  return (
    <div className="seg">
      <div className="seg-head"><span className="seg-title"><span className="tag">{code}</span><span className="desc">{description}</span></span></div>
      <div className="vol-row">
        {values.map((value, index) => (
          <div className="vol-item" key={`${code}-${index}`}><span className="vol-label">志愿{index + 1}</span><SchoolSelect value={value} options={options} loading={loading} onChange={(schoolId) => onChange(index, schoolId)} /></div>
        ))}
      </div>
    </div>
  )
}

function SchoolSelect({ value, options, loading, onChange, style }: {
  value: string
  options: School[]
  loading: boolean
  onChange: (value: string) => void
  style?: { maxWidth: number }
}) {
  return (
    <select required value={value} style={style} onChange={(event) => onChange(event.target.value)}>
      <option value="" disabled>{loading ? '正在加载学校...' : '请选择志愿学校'}</option>
      {options.map((school) => <option key={school.schoolId} value={school.schoolId}>{school.fullName || school.name}</option>)}
    </select>
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
