'use client'

import { useEffect, useState } from 'react'
import { Card, Col, Empty, Modal, Row, Skeleton, Tag, Typography } from 'antd'
import { BookOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons'
import { GRADE_SUBJECTS, GRADES, SUBJECT_COLORS } from '@/data/subjects'

const { Title, Text } = Typography

interface Material {
  id: string
  title: string
  grade: string
  subject: string
  fileName: string
  fileType: string
  description: string | null
  createdAt: string
}

export default function ParentMaterialsPage() {
  const [selectedGrade, setSelectedGrade] = useState<string>('初一')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | 'word'>('pdf')

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true)
      const params = new URLSearchParams({ grade: selectedGrade })
      if (selectedSubject) params.set('subject', selectedSubject)
      const res = await fetch(`/api/parent/materials?${params}`)
      const data = await res.json()
      setMaterials(data.materials || [])
      setLoading(false)
    }
    fetchMaterials()
  }, [selectedGrade, selectedSubject])

  const subjects = GRADE_SUBJECTS[selectedGrade] || []

  const handleView = async (material: Material) => {
    setPreviewTitle(material.title)
    if (material.fileType === 'word') {
      const res = await fetch(`/api/materials/${material.id}/view`)
      const data = await res.json()
      if (data.viewerUrl) {
        setPreviewType('word')
        setPreviewUrl(data.viewerUrl)
      }
      return
    }
    setPreviewType(material.fileType as 'pdf' | 'image')
    setPreviewUrl(`/api/materials/${material.id}/view`)
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={5} style={{ marginBottom: 4, fontSize: 16 }}>
          <BookOutlined style={{ marginRight: 8, color: '#E87545' }} />
          学习资料
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>选择年级和学科，查看老师上传的学习资料</Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>选择年级</Text>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {GRADES.map((grade) => (
            <div
              key={grade}
              onClick={() => { setSelectedGrade(grade); setSelectedSubject('') }}
              style={{
                padding: '8px 20px',
                borderRadius: 24,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: selectedGrade === grade ? 600 : 400,
                backgroundColor: selectedGrade === grade ? '#E87545' : 'rgba(0,0,0,.04)',
                color: selectedGrade === grade ? '#fff' : '#5a4e3a',
                border: selectedGrade === grade ? '1px solid #E87545' : '1px solid rgba(0,0,0,.08)',
                transition: 'all 0.2s',
              }}
            >
              {grade}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>选择学科</Text>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div
            onClick={() => setSelectedSubject('')}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: 13,
              backgroundColor: !selectedSubject ? '#5e6ad2' : 'rgba(0,0,0,.04)',
              color: !selectedSubject ? '#fff' : '#5a4e3a',
              border: !selectedSubject ? '1px solid #5e6ad2' : '1px solid rgba(0,0,0,.08)',
              transition: 'all 0.2s',
            }}
          >
            全部
          </div>
          {subjects.map((subject) => (
            <div
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 13,
                backgroundColor: selectedSubject === subject ? (SUBJECT_COLORS[subject] || '#5e6ad2') : 'rgba(0,0,0,.04)',
                color: selectedSubject === subject ? '#fff' : '#5a4e3a',
                border: selectedSubject === subject ? `1px solid ${SUBJECT_COLORS[subject] || '#5e6ad2'}` : '1px solid rgba(0,0,0,.08)',
                transition: 'all 0.2s',
              }}
            >
              {subject}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton active />
      ) : materials.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary">{selectedSubject ? `${selectedGrade}${selectedSubject}暂无资料` : `${selectedGrade}暂无资料`}</Text>} />
      ) : (
        <Row gutter={[12, 12]}>
          {materials.map((material) => (
            <Col key={material.id} xs={24} sm={12} md={8}>
              <Card hoverable onClick={() => handleView(material)} style={{ borderRadius: 12, cursor: 'pointer' }} styles={{ body: { padding: '14px 16px' } }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    flexShrink: 0,
                    backgroundColor: material.fileType === 'pdf' ? 'rgba(255,77,79,.1)' : 'rgba(22,119,255,.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FileTextOutlined style={{ fontSize: 20, color: material.fileType === 'pdf' ? '#ff4d4f' : '#1677ff' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 14, display: 'block' }} ellipsis>{material.title}</Text>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <Tag style={{ fontSize: 11, margin: 0 }}>{material.grade}</Tag>
                      <Tag color={SUBJECT_COLORS[material.subject]} style={{ fontSize: 11, margin: 0 }}>{material.subject}</Tag>
                      <Tag color={material.fileType === 'pdf' ? 'red' : material.fileType === 'word' ? 'blue' : 'cyan'} style={{ fontSize: 11, margin: 0 }}>
                        {material.fileType === 'pdf' ? 'PDF' : material.fileType === 'word' ? 'Word' : '图片'}
                      </Tag>
                    </div>
                    {material.description && <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }} ellipsis>{material.description}</Text>}
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                      <EyeOutlined style={{ marginRight: 4 }} />
                      点击查看
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={previewTitle}
        open={!!previewUrl}
        onCancel={() => setPreviewUrl(null)}
        footer={null}
        width="95vw"
        style={{ top: 10 }}
        styles={{ body: { padding: 0 } }}
      >
        {previewUrl && previewType === 'pdf' && <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} style={{ width: '100%', height: '85vh', border: 'none' }} title="PDF预览" />}
        {previewUrl && previewType === 'word' && <iframe src={previewUrl} style={{ width: '100%', height: '85vh', border: 'none' }} title="Word预览" />}
        {previewUrl && previewType === 'image' && (
          <div style={{ textAlign: 'center', padding: 16, background: '#f0f0f0' }}>
            <img src={previewUrl} alt={previewTitle} style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain' }} onContextMenu={(event) => event.preventDefault()} draggable={false} />
          </div>
        )}
        <div style={{ padding: '8px 16px', backgroundColor: '#fff8f6', borderTop: '1px solid rgba(0,0,0,.06)', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>本资料仅供在线查看，版权归牧哲学堂所有</Text>
        </div>
      </Modal>
    </div>
  )
}
