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

import useSWR from 'swr'
import { resolveTier, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'

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

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TeacherMaterialUploadPage() {
  const router = useRouter()
  const { data: dashData } = useSWR('/api/teacher/dashboard', fetcher)
  const currentTier: TeacherTier = resolveTier(dashData?.teacher?.tierLevel)
  const theme = TIER_THEME[currentTier]

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
      toast.success('上传成功，已收录至校区资料库')
      router.push('/teacher/materials?tab=mine')
    } catch {
      toast.error('网络异常，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="teacher-upload-page">
      {/* 沉浸式梯队主题 Header */}
      <div
        className="upload-page-header"
        style={{
          background: theme.heroBg,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}
      >
        <Button
          type="text"
          className="upload-back mobile-shell-back"
          icon={<ArrowLeftOutlined style={{ color: '#ffffff', fontSize: 18 }} />}
          onClick={() => router.back()}
          aria-label="返回"
        />
        <div className="upload-page-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#ffffff', fontSize: 17, fontWeight: 750, letterSpacing: '0.3px' }}>
              上传教学资料
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.28)',
                backdropFilter: 'blur(4px)',
                fontWeight: 600,
              }}
            >
              {theme.roleTag || theme.name}
            </span>
          </div>
          <span style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.80)', marginTop: 2 }}>
            资料入库后将同步支持教师备课下载与家长端微课自学
          </span>
        </div>
      </div>

      <div className="upload-body">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ audience: 'BOTH', materialType: 'HANDOUT' }}
          className="upload-page-form"
        >
          <Form.Item name="title" label="资料标题" rules={[{ required: true, message: '请输入资料标题' }]}>
            <Input maxLength={80} showCount placeholder="例如：二次函数图象与性质常考题型专练讲义" style={{ borderRadius: 10, padding: '9px 12px' }} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="grade" label="适用年级" rules={[{ required: true, message: '请选择年级' }]}>
                <Select
                  virtual={false}
                  listHeight={220}
                  placeholder="选择年级"
                  getPopupContainer={(node) => node.parentElement}
                  options={GRADES.map((item) => ({ label: item, value: item }))}
                  onChange={() => form.setFieldValue('subject', undefined)}
                  style={{ height: 40 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subject" label="所属科目" rules={[{ required: true, message: '请选择科目' }]}>
                <Select
                  virtual={false}
                  listHeight={220}
                  placeholder="选择科目"
                  getPopupContainer={(node) => node.parentElement}
                  options={uploadSubjects}
                  style={{ height: 40 }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="materialType" label="资料类型" rules={[{ required: true, message: '请选择资料类型' }]}>
            <Select
              virtual={false}
              listHeight={220}
              getPopupContainer={(node) => node.parentElement}
              options={[
                { label: '讲义（名师整理 / 课前预习导学案）', value: 'HANDOUT' },
                { label: '题库（精选分层习题 / 变式训练）', value: 'EXERCISE' },
                { label: '课本（官方教材 / 同步教参）', value: 'TEXTBOOK' },
                { label: '试卷（月考 / 期中 / 期末 / 中考真题）', value: 'EXAM' },
                { label: '答案（解析与得分步骤）', value: 'ANSWER' },
                { label: '参考（思维导图 / 公式定律速记）', value: 'REFERENCE' },
              ]}
              style={{ height: 40 }}
            />
          </Form.Item>

          <Form.Item name="audience" label="开放受众" rules={[{ required: true }]}>
            <div className="audience-grid">
              <Button.Group className="audience-group">
                <Button
                  value="BOTH"
                  onClick={() => form.setFieldValue('audience', 'BOTH')}
                  type={form.getFieldValue('audience') === 'BOTH' ? 'primary' : 'default'}
                  style={form.getFieldValue('audience') === 'BOTH' ? { background: theme.primary, borderColor: theme.primary } : {}}
                >
                  双端互通（家长和教师）
                </Button>
                <Button
                  value="STUDENT"
                  onClick={() => form.setFieldValue('audience', 'STUDENT')}
                  type={form.getFieldValue('audience') === 'STUDENT' ? 'primary' : 'default'}
                  style={form.getFieldValue('audience') === 'STUDENT' ? { background: theme.primary, borderColor: theme.primary } : {}}
                >
                  仅家长端可见
                </Button>
                <Button
                  value="TEACHER"
                  onClick={() => form.setFieldValue('audience', 'TEACHER')}
                  type={form.getFieldValue('audience') === 'TEACHER' ? 'primary' : 'default'}
                  style={form.getFieldValue('audience') === 'TEACHER' ? { background: theme.primary, borderColor: theme.primary } : {}}
                >
                  仅教师内部教研
                </Button>
              </Button.Group>
            </div>
          </Form.Item>

          <Form.Item name="description" label="教学说明与使用建议">
            <TextArea rows={3} maxLength={200} showCount placeholder="选填，如：适合九年级二轮冲刺，建议打印后让学生先闭卷自测30分钟…" style={{ borderRadius: 10 }} />
          </Form.Item>

          <Form.Item label="上传文件" required className="file-field">
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
              <div
                className="file-drop-zone"
                style={{
                  borderColor: fileList.length > 0 ? theme.primary : 'rgba(0,0,0,0.15)',
                  background: fileList.length > 0 ? `linear-gradient(180deg, ${theme.secondary}12, #ffffff)` : '#ffffff',
                }}
              >
                <InboxOutlined className="file-drop-icon" style={{ color: theme.primary }} />
                <div className="file-drop-title">
                  {fileList[0] ? fileList[0].name : '点击选择或将教学文件拖曳至此'}
                </div>
                <div className="file-drop-sub">
                  {fileList[0] ? (
                    <>已选课件 · <Tag style={{ color: theme.primary, borderColor: `${theme.primary}40`, background: `${theme.primary}10`, borderRadius: 6, fontWeight: 600 }}>{fileKindLabel(fileList[0].name)}</Tag> · 点击可替换</>
                  ) : (
                    '支持 PDF / Word / PPT / Excel / 图片 / 课件压缩包'
                  )}
                </div>
              </div>
            </Upload>
          </Form.Item>

          <div
            className="upload-tip"
            style={{
              background: `${theme.primary}08`,
              borderColor: `${theme.primary}25`,
              color: '#332a18',
            }}
          >
            <CheckCircleOutlined style={{ color: theme.primary, marginTop: 3 }} />
            <div>
              <strong>智能资源归档：</strong>
              资料保存后将根据学科自动生成分类索引。家长端可直接在手机端全屏查阅，教师可在电脑端或备课平板随时一键投屏或下载。
            </div>
          </div>
        </Form>
      </div>

      <div className="upload-page-footer">
        <Button className="upload-cancel" onClick={() => router.back()} disabled={uploading}>
          取消
        </Button>
        <Button
          type="primary"
          className="upload-submit"
          icon={<UploadOutlined />}
          loading={uploading}
          onClick={handleUpload}
          style={{
            background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})`,
            borderColor: 'transparent',
            boxShadow: `0 6px 18px ${theme.primary}35`,
          }}
        >
          {uploading ? '正在归档上传…' : '确认上传并入库'}
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
          gap: 12px;
          padding: 14px 18px 12px;
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(10px);
        }

        .upload-back {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.16) !important;
          border-radius: 10px;
        }

        .upload-page-title {
          min-width: 0;
        }

        .upload-body {
          flex: 1;
          padding: 16px 16px 24px;
        }

        .upload-page-form :global(.ant-form-item) {
          margin-bottom: 18px;
        }

        .upload-page-form :global(.ant-form-item-label > label) {
          font-size: 13.5px;
          font-weight: 650;
          color: #1a1201;
        }

        .audience-grid :global(.ant-btn-group) {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .audience-grid :global(.ant-btn) {
          text-align: center;
          padding-inline: 4px;
          font-size: 12.5px;
          height: 38px;
          border-radius: 8px;
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
          padding: 22px 14px;
          border: 1.5px dashed rgba(0, 0, 0, 0.15);
          border-radius: 14px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .file-drop-icon {
          font-size: 34px;
        }

        .file-drop-title {
          font-size: 14.5px;
          font-weight: 650;
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

        .upload-tip {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px 14px;
          border-radius: 12px;
          border-width: 1px;
          border-style: solid;
          font-size: 12.5px;
          line-height: 1.6;
        }

        .upload-page-footer {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.8fr);
          gap: 12px;
          padding: 12px 16px calc(14px + env(safe-area-inset-bottom));
          border-top: 1px solid rgba(0, 0, 0, .06);
          background: #ffffff;
          position: sticky;
          bottom: 0;
          z-index: 20;
          box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.04);
        }

        .upload-page-footer :global(.ant-btn) {
          min-height: 46px;
          border-radius: 12px;
          font-weight: 650;
        }

        .upload-cancel {
          background: #f7f5f0 !important;
          border-color: rgba(0, 0, 0, .08) !important;
          color: #554a3a !important;
        }
      `}</style>
    </div>
  )
}
