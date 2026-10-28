'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button, Col, Form, Input, Row, Select, Tag, Typography, Upload,
} from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, InboxOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { GRADE_SUBJECTS, GRADES } from '@/data/subjects'

const { Title, Text } = Typography
const { TextArea } = Input

/** 根据文件名判断文件类型标签 */
function fileKindLabel(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    pdf: 'PDF', doc: 'Word', docx: 'Word',
    xls: 'Excel', xlsx: 'Excel',
    ppt: 'PPT', pptx: 'PPT',
    jpg: '图片', jpeg: '图片', png: '图片', gif: '图片', webp: '图片',
    zip: '压缩包', rar: '压缩包', '7z': '压缩包',
  }
  return map[ext] || ext.toUpperCase() || '文件'
}

export default function TeacherMaterialUploadPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()
  const uploadGrade = Form.useWatch('grade', form)

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  const uploadSubjects = useMemo(() => {
    const source = uploadGrade ? GRADE_SUBJECTS[uploadGrade] || [] : []
    return source.map((item) => ({ label: item, value: item }))
  }, [uploadGrade])

  const handleUpload = async () => {
    const values = await form.validateFields()
    if (!fileList[0]?.originFileObj) {
      toast.warning('请选择文件')
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', fileList[0].originFileObj as File)
    formData.append('title', values.title)
    formData.append('grade', values.grade)
    formData.append('subject', values.subject)
    formData.append('audience', values.audience)
    formData.append('status', 'PUBLISHED')
    formData.append('materialType', values.materialType)
    if (values.description) formData.append('description', values.description)

    try {
      const res = await fetch('/api/teacher/materials', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || '上传失败')
        return
      }
      toast.success('上传成功，已进入资料库')
      router.push('/teacher/materials?tab=mine')
    } catch {
      toast.error('网络异常，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="teacher-upload-page">
      <div className="upload-page-header">
        <Button type="text" className="upload-back" icon={<ArrowLeftOutlined />} onClick={() => router.back()} aria-label="返回" />
        <div className="upload-page-title">
          <Title level={5}>上传普通资料</Title>
          <Text type="secondary">资料将进入学习资料库，可按年级与科目分类查看</Text>
        </div>
      </div>

      <div className="upload-body">
        <Form form={form} layout="vertical" initialValues={{ audience: 'BOTH', materialType: 'HANDOUT' }} className="upload-page-form">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input maxLength={80} showCount placeholder="例如：二次函数图象与性质复习讲义" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="grade" label="年级" rules={[{ required: true, message: '请选择年级' }]}>
                <Select virtual={false} listHeight={220} getPopupContainer={(node) => node.parentElement} options={GRADES.map((item) => ({ label: item, value: item }))} onChange={() => form.setFieldValue('subject', undefined)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subject" label="科目" rules={[{ required: true, message: '请选择科目' }]}>
                <Select virtual={false} listHeight={220} getPopupContainer={(node) => node.parentElement} options={uploadSubjects} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="materialType" label="资料类型" rules={[{ required: true, message: '请选择资料类型' }]}>
            <Select
              virtual={false}
              listHeight={220}
              getPopupContainer={(node) => node.parentElement}
              options={[
                { label: '课本（电子教材）', value: 'TEXTBOOK' },
                { label: '讲义（老师整理）', value: 'HANDOUT' },
                { label: '题库（练习题）', value: 'EXERCISE' },
                { label: '试卷（考试卷）', value: 'EXAM' },
                { label: '答案（参考答案）', value: 'ANSWER' },
                { label: '参考（其他资料）', value: 'REFERENCE' },
              ]}
            />
          </Form.Item>

          <Form.Item name="audience" label="谁可以查看" rules={[{ required: true }]}>
            <div className="audience-grid">
              <Button.Group className="audience-group">
                <Button value="BOTH" onClick={() => form.setFieldValue('audience', 'BOTH')} type={form.getFieldValue('audience') === 'BOTH' ? 'primary' : 'default'}>家长和教师</Button>
                <Button value="STUDENT" onClick={() => form.setFieldValue('audience', 'STUDENT')} type={form.getFieldValue('audience') === 'STUDENT' ? 'primary' : 'default'}>仅家长</Button>
                <Button value="TEACHER" onClick={() => form.setFieldValue('audience', 'TEACHER')} type={form.getFieldValue('audience') === 'TEACHER' ? 'primary' : 'default'}>仅教师</Button>
              </Button.Group>
            </div>
          </Form.Item>

          <Form.Item name="description" label="说明">
            <TextArea rows={3} maxLength={200} showCount placeholder="选填，简单说明资料用途（会展示在资料详情里）" />
          </Form.Item>

          <Form.Item label="文件" required className="file-field">
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              fileList={fileList}
              onChange={({ fileList: list }) => {
                setFileList(list)
                const fileName = list[0]?.name
                if (fileName && !form.getFieldValue('title')) {
                  form.setFieldValue('title', fileName.replace(/\.[^.]+$/, ''))
                }
              }}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z"
              className="upload-page-picker"
            >
              <div className="file-drop-zone">
                <InboxOutlined className="file-drop-icon" />
                <div className="file-drop-title">{fileList[0] ? fileList[0].name : '点击选择文件或从聊天中选择'}</div>
                <div className="file-drop-sub">
                  {fileList[0]
                    ? <>已选文件 · <Tag className="file-kind-tag">{fileKindLabel(fileList[0].name)}</Tag> · 点击可更换</>
                    : '支持 PDF / Word / 图片 / 表格 / 演示文稿 / 压缩包'}
                </div>
              </div>
            </Upload>
          </Form.Item>

          <div className="upload-tip">
            <CheckCircleOutlined /> 上传后立即可用：家长可在「学习资料」中在线预览，教师端可随时下载复用。
          </div>
        </Form>
      </div>

      <div className="upload-page-footer">
        <Button className="upload-cancel" onClick={() => router.back()} disabled={uploading}>取消</Button>
        <Button type="primary" className="upload-submit" icon={<UploadOutlined />} loading={uploading} onClick={handleUpload}>
          {uploading ? '上传中…' : '上传到资料库'}
        </Button>
      </div>

      <style jsx>{`
        .teacher-upload-page {
          width: 100%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          background: #faf8f5;
        }

        .upload-page-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px 10px;
          position: sticky;
          top: 0;
          z-index: 5;
          background: #faf8f5;
          border-bottom: 1px solid rgba(0, 0, 0, .05);
        }

        .upload-back {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          font-size: 18px;
        }

        .upload-page-title {
          min-width: 0;
        }

        .upload-page-title :global(.ant-typography) {
          margin: 0 !important;
        }

        .upload-page-title h5 {
          font-size: 17px !important;
          color: #1a1201 !important;
        }

        .upload-page-title span {
          display: block;
          font-size: 12px;
          margin-top: 2px;
        }

        .upload-body {
          flex: 1;
          padding: 14px 16px 20px;
        }

        .upload-page-form :global(.ant-form-item) {
          margin-bottom: 16px;
        }

        .upload-page-form :global(.ant-form-item-label > label) {
          font-size: 13.5px;
          font-weight: 600;
          color: #1a1201;
        }

        .audience-grid :global(.ant-btn-group) {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .audience-grid :global(.ant-btn) {
          text-align: center;
          padding-inline: 6px;
          font-size: 13px;
        }

        .upload-page-picker,
        .upload-page-picker :global(.ant-upload) {
          width: 100%;
        }

        .file-drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 140px;
          padding: 20px 14px;
          border: 1.5px dashed rgba(30, 60, 50, .30);
          border-radius: 14px;
          background: linear-gradient(180deg, #EFF7F2, #F7FBF8);
          transition: border-color .18s ease, background .18s ease;
          cursor: pointer;
        }

        .file-drop-zone:hover {
          border-color: #3E8E6E;
          background: #EDF6F0;
        }

        .file-drop-icon {
          font-size: 32px;
          color: #3E8E6E;
        }

        .file-drop-title {
          font-size: 14.5px;
          font-weight: 600;
          color: #1a1201;
          text-align: center;
          word-break: break-all;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .file-drop-sub {
          font-size: 12px;
          color: #7a8a80;
          text-align: center;
        }

        .file-kind-tag {
          border-radius: 6px;
          margin-inline-end: 0;
          color: #3E8E6E;
          background: rgba(62, 142, 110, .12);
          border: 1px solid rgba(62, 142, 110, .20);
        }

        .upload-tip {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #FFF8E8;
          border: 1px solid rgba(220, 170, 60, .30);
          color: #6B5B2E;
          font-size: 12.5px;
          line-height: 1.6;
        }

        .upload-tip :global(.anticon) {
          margin-top: 3px;
          color: #C9A45C;
        }

        .upload-page-footer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
          gap: 10px;
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
          border-top: 1px solid rgba(0, 0, 0, .05);
          background: #faf8f5;
          position: sticky;
          bottom: 0;
        }

        .upload-page-footer :global(.ant-btn) {
          min-height: 46px;
          border-radius: 12px;
          font-weight: 600;
        }

        .upload-cancel {
          background: #fff !important;
          border-color: rgba(0, 0, 0, .12) !important;
        }

        .upload-submit {
          background: linear-gradient(135deg, #2C6E52, #285247) !important;
          border-color: transparent !important;
          box-shadow: 0 6px 16px rgba(40, 82, 71, .30);
        }
      `}</style>
    </div>
  )
}
