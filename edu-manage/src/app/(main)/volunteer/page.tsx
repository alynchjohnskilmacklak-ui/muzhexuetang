'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Col, Input, Row, Space, Spin } from 'antd'
import {
  FileTextOutlined,
  MessageOutlined,
  OrderedListOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { PageLayout } from '@/components/Layout/PageLayout'
import { ConsultReply } from './_components/ConsultReply'
import { DocManager } from './_components/DocManager'
import { StepEditor } from './_components/StepEditor'
import { StepList } from './_components/StepList'
import { useIsMobile } from '@/hooks/useIsMobile'

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('加载失败')
    return res.json()
  })

export default function VolunteerAdminPage() {
  const isMobile = useIsMobile() ?? false
  const { data, mutate, isLoading } = useSWR('/api/volunteer', fetcher)
  const { data: consultData, mutate: mutateConsults } = useSWR('/api/volunteer/consultation', fetcher)
  const steps = useMemo(() => (Array.isArray(data?.steps) ? data.steps : []), [data])
  const documents = Array.isArray(data?.documents) ? data.documents : []
  const consultations = Array.isArray(consultData?.consultations) ? consultData.consultations : []
  const pendingConsultCount = consultations.filter((c: { isReplied: boolean }) => !c.isReplied).length
  const [selectedId, setSelectedId] = useState('')
  const selected = useMemo(
    () => steps.find((step: { id: string }) => step.id === (selectedId || steps[0]?.id)),
    [steps, selectedId],
  )

  const patchGuide = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/volunteer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return toast.error('保存失败')
    toast.success('指南信息已更新')
    mutate()
  }

  const addStep = async () => {
    const res = await fetch('/api/volunteer/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
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
      title="中考升学咨询"
      subtitle="管理填报流程、政策附件、分配生名额说明和家长升学咨询回复"
      actions={
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            mutate()
            mutateConsults()
          }}
          loading={isLoading}
        >
          刷新
        </Button>
      }
    >
      {/* 3 KPI Overview Metrics */}
      <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#FAF8F5' }}
            styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px', textAlign: 'center' } }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontSize: 12,
                color: '#8D806F',
              }}
            >
              <OrderedListOutlined style={{ color: '#14574D' }} />
              <span>流程步骤</span>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#14574D', marginTop: 2 }}>
              {steps.length} <span style={{ fontSize: 12, fontWeight: 400 }}>步</span>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, border: '1px solid #EEE7E1', background: '#F0FDF4' }}
            styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px', textAlign: 'center' } }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontSize: 12,
                color: '#8D806F',
              }}
            >
              <FileTextOutlined style={{ color: '#27A644' }} />
              <span>政策附件</span>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#27A644', marginTop: 2 }}>
              {documents.length} <span style={{ fontSize: 12, fontWeight: 400 }}>份</span>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              border: pendingConsultCount > 0 ? '2px solid #E8784A' : '1px solid #EEE7E1',
              background: '#FFF9F5',
            }}
            styles={{ body: { padding: isMobile ? '10px 4px' : '12px 14px', textAlign: 'center' } }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontSize: 12,
                color: '#8D806F',
              }}
            >
              <MessageOutlined style={{ color: '#E8784A' }} />
              <span>家长咨询</span>
            </div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#E8784A', marginTop: 2 }}>
              {pendingConsultCount} <span style={{ fontSize: 12, fontWeight: 400 }}>待回复</span>
            </div>
          </Card>
        </Col>
      </Row>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: isMobile ? 32 : 80 }}>
          <Spin />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '280px minmax(0, 1fr)',
            gap: isMobile ? 12 : 16,
            alignItems: 'start',
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #EEE7E1',
              width: '100%',
              maxWidth: '100%',
            }}
            styles={{ body: { padding: isMobile ? 12 : 20 } }}
          >
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
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid #EEE7E1',
                width: '100%',
                maxWidth: '100%',
              }}
              styles={{ body: { padding: isMobile ? 12 : 20 } }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Input
                  value={data?.title || ''}
                  onChange={(event) => patchGuide({ title: event.target.value })}
                  addonBefore="指南主标题"
                />
                <Input
                  value={data?.subtitle || ''}
                  onChange={(event) => patchGuide({ subtitle: event.target.value })}
                  addonBefore="指南副标题"
                />
              </Space>
            </Card>

            <Card
              title="步骤详情编辑"
              bordered={false}
              style={{
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid #EEE7E1',
                width: '100%',
                maxWidth: '100%',
              }}
              styles={{ body: { padding: isMobile ? 12 : 20 } }}
            >
              <StepEditor step={selected} onSaved={() => mutate()} />
            </Card>

            <Card
              title="家长升学咨询回复"
              bordered={false}
              style={{
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid #EEE7E1',
                width: '100%',
                maxWidth: '100%',
              }}
              styles={{ body: { padding: isMobile ? 12 : 20 } }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {consultations.length ? (
                  consultations.map((item: never) => (
                    <ConsultReply
                      key={(item as { id: string }).id}
                      item={item}
                      onReplied={() => mutateConsults()}
                    />
                  ))
                ) : (
                  <div style={{ color: '#98A2B3', textAlign: 'center', padding: '24px 0' }}>
                    暂无家长升学咨询
                  </div>
                )}
              </Space>
            </Card>
          </Space>
        </div>
      )}
    </PageLayout>
  )
}
