'use client'

import { useState } from 'react'
import { Button, DatePicker, message, Modal, Space, Tag, Alert, Descriptions, List, Divider } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useDivision } from '@/contexts/DivisionContext'

interface PreviewItem {
  sourceLessonId: string
  groupId: string
  groupName: string
  courseName: string
  teacherName: string
  roomName: string | null
  studentCount: number
  oldDate: string
  newDate: string
  startTime: string
  endTime: string
}

interface ConflictInfo {
  type: string
  teacherName?: string
  groupName?: string
  timeRange: string
  message: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CopyFridayToSaturdayModal({ open, onClose, onSuccess }: Props) {
  const { division } = useDivision()
  const [fridayDate, setFridayDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewItem[]>([])
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])
  const [skipped, setSkipped] = useState<{ sourceLessonId: string; reason: string }[]>([])
  const [stage, setStage] = useState<'select' | 'preview' | 'done'>('select')

  const disabledDate = (current: dayjs.Dayjs) => {
    if (!current) return false
    return current.day() !== 5
  }

  const handlePreview = async () => {
    if (!fridayDate) {
      message.warning('请选择周五日期')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/class-lessons/copy-friday-to-saturday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fridayDate, division, dryRun: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '预检查失败')
      setPreview(data.preview || [])
      setConflicts(data.conflicts || [])
      setSkipped(data.skipped || [])
      setStage('preview')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '预检查失败')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/class-lessons/copy-friday-to-saturday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fridayDate, division, dryRun: false, overwrite: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '复制失败')
      message.success(`已创建 ${data.createdCount} 节周六课程，跳过 ${data.skippedCount} 节`)
      setStage('done')
      onSuccess()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '复制失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStage('select')
    setFridayDate('')
    setPreview([])
    setConflicts([])
    setSkipped([])
    onClose()
  }

  const saturdayDate = fridayDate ? dayjs(fridayDate).add(1, 'day').format('YYYY-MM-DD') : ''
  const hasConflict = conflicts.length > 0
  const conflictTypes = [...new Set(conflicts.map((c) => c.type))]

  return (
    <Modal
      title="复制周五课程到周六"
      open={open}
      onCancel={handleClose}
      footer={null}
      width="min(960px, 100vw)"
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Alert
          type="info"
          showIcon
          message="系统只会复制课程安排，不会复制考勤、扣课时、反馈和工资记录。周六上课后，老师正常提交考勤，系统再按原流程扣课时、生成反馈和工资。"
          style={{ fontSize: 12 }}
        />

        {stage === 'select' && (
          <>
            <DatePicker
              style={{ width: '100%' }}
              placeholder="选择周五日期"
              value={fridayDate ? dayjs(fridayDate) : null}
              disabledDate={disabledDate}
              onChange={(d) => setFridayDate(d ? d.format('YYYY-MM-DD') : '')}
            />
            <Button
              type="primary"
              block
              icon={<CalendarOutlined />}
              loading={loading}
              onClick={handlePreview}
              disabled={!fridayDate}
              style={{ background: '#e8784a', borderColor: '#e8784a' }}
            >
              预检查
            </Button>
          </>
        )}

        {stage === 'preview' && (
          <>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="周五">{fridayDate}</Descriptions.Item>
              <Descriptions.Item label="周六">{saturdayDate}</Descriptions.Item>
              <Descriptions.Item label="将创建">{preview.length} 节</Descriptions.Item>
              <Descriptions.Item label="跳过">{skipped.length} 节</Descriptions.Item>
            </Descriptions>

            {hasConflict && (
              <Alert
                type="error"
                showIcon
                message={`存在 ${conflicts.length} 个冲突（${conflictTypes.join('、')}），请先处理冲突再生成`}
              />
            )}

            {skipped.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`${skipped.length} 节课周六已存在相同课程，系统已自动跳过，避免重复生成。`}
              />
            )}

            {preview.length > 0 && (
              <>
                <Divider style={{ margin: '4px 0' }}>课程预览</Divider>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <List
                    size="small"
                    dataSource={preview}
                    renderItem={(item: PreviewItem) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space size={4} wrap>
                              <span style={{ fontWeight: 600 }}>{item.groupName}</span>
                              <Tag style={{ fontSize: 11 }}>{item.courseName}</Tag>
                            </Space>
                          }
                          description={
                            <Space size={6} wrap style={{ fontSize: 11, color: '#8d806f' }}>
                              <span>{item.teacherName}</span>
                              <span>|</span>
                              <span>{item.roomName || '未分配教室'}</span>
                              <span>|</span>
                              <span>{item.startTime}-{item.endTime}</span>
                              <span>|</span>
                              <span>{item.studentCount}人</span>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              </>
            )}

            {preview.length === 0 && !hasConflict && (
              <Alert type="info" showIcon message="该周五没有符合条件的课程可复制" />
            )}

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setStage('select')}>返回</Button>
              <Button
                type="primary"
                loading={loading}
                disabled={hasConflict || preview.length === 0}
                onClick={handleConfirm}
                style={{ background: '#e8784a', borderColor: '#e8784a' }}
              >
                确认生成周六课程
              </Button>
            </Space>
          </>
        )}

        {stage === 'done' && (
          <>
            <Alert type="success" showIcon message={`已完成！从 ${fridayDate} 复制到 ${saturdayDate}`} />
            <Button type="primary" block onClick={handleClose}>
              关闭
            </Button>
          </>
        )}
      </Space>
    </Modal>
  )
}
