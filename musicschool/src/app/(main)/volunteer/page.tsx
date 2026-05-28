'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Input, Space, Spin } from 'antd'
import { ReadOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { PageLayout } from '@/components/Layout/PageLayout'
import { ConsultReply } from './_components/ConsultReply'
import { DocManager } from './_components/DocManager'
import { StepEditor } from './_components/StepEditor'
import { StepList } from './_components/StepList'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('加载失败')
  return res.json()
})

export default function VolunteerAdminPage() {
  const { data, mutate, isLoading } = useSWR('/api/volunteer', fetcher)
  const { data: consultData, mutate: mutateConsults } = useSWR('/api/volunteer/consultation', fetcher)
  const steps = Array.isArray(data?.steps) ? data.steps : []
  const documents = Array.isArray(data?.documents) ? data.documents : []
  const consultations = Array.isArray(consultData?.consultations) ? consultData.consultations : []
  const [selectedId, setSelectedId] = useState('')
  const selected = useMemo(() => steps.find((step: { id: string }) => step.id === (selectedId || steps[0]?.id)), [steps, selectedId])

  const patchGuide = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/volunteer', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) return toast.error('保存失败')
    toast.success('指南信息已更新')
    mutate()
  }

  const addStep = async () => {
    const res = await fetch('/api/volunteer/steps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const step = await res.json()
    if (!res.ok) return toast.error(step.error || '新增失败')
    setSelectedId(step.id)
    mutate()
  }

  const deleteStep = async (id: string) => {
    const res = await fetch(`/api/volunteer/steps/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('删除失败')
    toast.success('步骤已删除')
    setSelectedId('')
    mutate()
  }

  return (
    <PageLayout
      title="志愿填报"
      subtitle="管理填报流程、政策附件、分配生名额和家长咨询"
      actions={<Button icon={<ReadOutlined />} href="/volunteer/guide">填报指南</Button>}
    >
      {isLoading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <StepList
              steps={steps}
              selectedId={selected?.id}
              published={Boolean(data?.isPublished)}
              onSelect={setSelectedId}
              onAdd={addStep}
              onDelete={deleteStep}
              onPublishedChange={(value) => patchGuide({ isPublished: value })}
            />
            <div style={{ height: 16 }} />
            <DocManager documents={documents} onChanged={() => mutate()} />
          </Card>

          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Input value={data?.title || ''} onChange={(event) => patchGuide({ title: event.target.value })} addonBefore="标题" />
                <Input value={data?.subtitle || ''} onChange={(event) => patchGuide({ subtitle: event.target.value })} addonBefore="副标题" />
              </Space>
            </Card>
            <Card title="步骤编辑" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
              <StepEditor step={selected} onSaved={() => mutate()} />
            </Card>
            <Card title="家长咨询回复" bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {consultations.length ? consultations.map((item: never) => <ConsultReply key={(item as { id: string }).id} item={item} onReplied={() => mutateConsults()} />) : <div style={{ color: '#98A2B3' }}>暂无咨询</div>}
              </Space>
            </Card>
          </Space>
        </div>
      )}
    </PageLayout>
  )
}
