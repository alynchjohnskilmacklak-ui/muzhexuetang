'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Alert, Button, Card, Collapse, Empty, Image, Input, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined, LinkOutlined, MessageOutlined, ReadOutlined, SearchOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'

type Step = { id: string; order: number; title: string; content: string; tipContent?: string | null; imageUrl?: string | null; batchTags: string[] }
type Quota = { id: string; schoolName: string; district: string; allocQuota: number; normalQuota: number; totalQuota: number; note?: string | null }
type Doc = { id: string; name: string; fileUrl: string; type: string }
type Guide = { title: string; subtitle?: string | null; year: number; steps: Step[]; documents: Doc[]; quotaData: Quota[] } | null

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const BATCH_HELP = [
  { key: 'normal', label: '普通高中', children: '第一批省级示范高中：C段分配生（仅1个）+ D段6个平行志愿。填了C段等于同时填了该校分配生和统招，无需再填D段。第二批非省级示范高中：C段6个平行志愿，是多数学生的保底选择，必须认真填报。' },
  { key: '34', label: '提前批3+4', children: '中本一体，7年直达本科，但通常需要参加转段考试，适合目标明确、愿意走职业本科路径的学生。' },
  { key: '32', label: '3+2中高职', children: '中专3年+大专2年，需要转段考试。优势是路径清晰，注意课程衔接和专业适配。' },
  { key: '5', label: '五年一贯制', children: '大专5年直读，无转段顾虑，课程更连贯，适合希望稳定完成专科培养的学生。' },
  { key: 'vocational', label: '普通中职', children: '偏职业技能培养，可结合专业兴趣、升学路径和就业方向综合判断。' },
]

function MissingImage() {
  return <div style={{ height: 380, borderRadius: 8, border: '1px dashed #34343a', background: '#FCFBF9', display: 'grid', placeItems: 'center', color: '#98A2B3' }}>图片缺失，等待管理员上传截图</div>
}

export default function VolunteerClient({ guide }: { guide: Guide }) {
  const isMobile = useIsMobile() ?? false
  const { data } = useSWR('/api/volunteer', fetcher, { fallbackData: guide, refreshInterval: 300_000 })
  const currentGuide: Guide = data || guide
  const steps = currentGuide?.steps || []
  const [current, setCurrent] = useState(0)
  const [quotaQ, setQuotaQ] = useState('')
  const [question, setQuestion] = useState('')
  const { data: consultData, mutate: mutateConsults } = useSWR('/api/volunteer/consultation', fetcher)
  const consultations = Array.isArray(consultData?.consultations) ? consultData.consultations : []

  useEffect(() => {
    const saved = Number(localStorage.getItem('volunteer:step') || 0)
    if (Number.isFinite(saved)) setCurrent(saved)
  }, [])

  const selectStep = (index: number) => {
    setCurrent(index)
    localStorage.setItem('volunteer:step', String(index))
  }

  const step = steps[current] || steps[0]
  const quotas = useMemo(() => {
    const list = currentGuide?.quotaData || []
    if (!quotaQ.trim()) return list
    return list.filter((item) => `${item.schoolName} ${item.district} ${item.note || ''}`.includes(quotaQ.trim()))
  }, [currentGuide, quotaQ])

  const columns: ColumnsType<Quota> = [
    { title: '目标高中', dataIndex: 'schoolName' },
    { title: '区县', dataIndex: 'district', width: 140 },
    { title: '生源初中', dataIndex: 'note', width: 150 },
    { title: '分配名额', dataIndex: 'allocQuota', width: 120 },
  ]

  const submitQuestion = async () => {
    if (!question.trim()) return toast.error('请输入问题')
    const res = await fetch('/api/volunteer/consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    if (!res.ok) return toast.error('提交失败')
    toast.success('问题已提交，老师会尽快回复')
    setQuestion('')
    mutateConsults()
  }

  if (!currentGuide) return <Empty description="志愿填报指南暂未发布" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={{ borderRadius: isMobile ? 12 : 8, padding: isMobile ? 16 : 24, background: 'linear-gradient(135deg, rgba(94,106,210,0.34), rgba(245,166,35,0.10))', border: '1px solid #34343a' }}>
        <h1 style={{ margin: 0, color: '#1F2329', fontSize: isMobile ? 16 : 28 }}>{currentGuide.title}</h1>
        <div style={{ color: '#5B6472', marginTop: 8 }}>牧哲学堂整理 · {currentGuide.year}年版 · {currentGuide.subtitle}</div>
        <Space wrap style={{ marginTop: 18 }}>
          <Button icon={<ReadOutlined />} href="/parent/volunteer/guide">填报指南</Button>
          <Button icon={<LinkOutlined />} href="http://www.sjzjyksxx.com.cn/" target="_blank">官网直达</Button>
          <Button icon={<DownloadOutlined />} onClick={() => document.getElementById('volunteer-docs')?.scrollIntoView({ behavior: 'smooth' })}>政策文件</Button>
          <Button icon={<SearchOutlined />} onClick={() => document.getElementById('volunteer-quota')?.scrollIntoView({ behavior: 'smooth' })}>分配生查询</Button>
          <Button icon={<MessageOutlined />} onClick={() => document.getElementById('volunteer-consult')?.scrollIntoView({ behavior: 'smooth' })}>咨询老师</Button>
        </Space>
      </section>

      <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : `repeat(${Math.max(steps.length, 1)}, minmax(84px, 1fr))`, gap: 8 }}>
          {steps.map((item, index) => (
            <button key={item.id} onClick={() => selectStep(index)} style={{ border: `1px solid ${index === current ? '#5e6ad2' : index < current ? '#1D9E75' : '#23252a'}`, background: index === current ? 'rgba(94,106,210,0.18)' : '#141516', color: '#1F2329', borderRadius: 8, padding: 10, cursor: 'pointer' }}>
              <div style={{ fontWeight: 700 }}>第{item.order}步</div>
              <div style={{ fontSize: 12, color: '#98A2B3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
            </button>
          ))}
        </div>
      </Card>

      {step && (
        <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 480px', gap: 20 }}>
            <div>
              <Tag color="#5e6ad2">第{step.order}步</Tag>
              <h2 style={{ color: '#1F2329', marginTop: 10, fontSize: isMobile ? 16 : undefined }}>{step.title}</h2>
              <div style={{ color: '#5B6472', lineHeight: isMobile ? 1.6 : 1.9, whiteSpace: 'pre-wrap', fontSize: isMobile ? 14 : undefined }}>{step.content}</div>
              {!!step.batchTags.length && <Space wrap style={{ marginTop: 14 }}>{step.batchTags.map((tag) => <Tag key={tag} color="blue">{tag}</Tag>)}</Space>}
              {step.tipContent && <Alert style={{ marginTop: 16 }} type="info" showIcon message="温馨提示" description={step.tipContent} />}
              <Space style={{ marginTop: 18 }}>
                <Button disabled={current === 0} onClick={() => selectStep(Math.max(0, current - 1))}>上一步</Button>
                <Button type="primary" disabled={current >= steps.length - 1} onClick={() => selectStep(Math.min(steps.length - 1, current + 1))}>下一步</Button>
              </Space>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              {step.imageUrl ? (
                <Image src={normalizeUploadUrl(step.imageUrl)} alt={step.title} width="100%" height={380} style={{ objectFit: 'cover', borderRadius: 8, background: '#FCFBF9' }} fallback="/file.svg" />
              ) : <MissingImage />}
            </div>
          </div>
        </Card>
      )}

      <Card title="批次解读" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Collapse items={BATCH_HELP} defaultActiveKey={['normal']} />
      </Card>

      <Card id="volunteer-quota" title="分配生名额查询" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Input.Search placeholder="搜索学校或区县" value={quotaQ} onChange={(event) => setQuotaQ(event.target.value)} style={{ maxWidth: 320, marginBottom: 12 }} />
        <Table rowKey="id" columns={columns} dataSource={quotas} pagination={{ pageSize: 8 }} scroll={{ x: 720 }} />
      </Card>

      <Card id="volunteer-docs" title="文件下载" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {(currentGuide.documents || []).map((doc) => (
            <a key={doc.id} href={`/api/volunteer/documents/${doc.id}/download`} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 8, background: '#FCFBF9', color: '#1F2329' }}>
              <span>{doc.name}</span><DownloadOutlined />
            </a>
          ))}
        </Space>
      </Card>

      <Card id="volunteer-consult" title="在线咨询" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {consultations.map((item: Record<string, unknown>) => <div key={item.id as string} style={{ padding: 12, borderRadius: 8, background: '#FCFBF9' }}><div style={{ color: '#1F2329' }}>问：{item.question as string}</div>{item.reply ? <div style={{ color: '#5B6472', marginTop: 8 }}>答：{item.reply as string}</div> : <Tag color="orange" style={{ marginTop: 8 }}>等待回复</Tag>}</div>)}
          <Input.TextArea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} showCount autoSize={{ minRows: 3, maxRows: 6 }} placeholder="把您的志愿填报问题写在这里..." />
          <Button type="primary" onClick={submitQuestion}>提交我的问题</Button>
        </Space>
      </Card>
    </div>
  )
}
