'use client'

import { Card, Timeline, Typography, Tag } from 'antd'
import type { ActivityLog } from '@/types/dashboard'

const { Title, Text } = Typography

const ACTION_LABELS: Record<string, string> = {
  TEACHER_LOGIN: '教师登录',
  ATTENDANCE_SUBMIT: '提交考勤',
  EXAM_PAPER_CREATE: '上传试卷',
  CLASSROOM_FEEDBACK_PUBLISH: '发布课堂反馈',
  PERFORMANCE_POST_CREATE: '发布表现动态',
  STUDENT_CREATE: '新增学员',
  STUDENT_UPDATE: '更新学员',
  CLASS_LESSON_CREATE: '创建课次',
}

export function ActivityLogCard({ data }: { data: ActivityLog[] }) {
  return (
    <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
      <Title level={5} style={{ marginBottom: 16 }}>最近操作日志</Title>
      <Timeline
        items={data.map((item) => ({
          color: 'blue',
          children: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <Text strong>{item.user}</Text>
                <Text> {ACTION_LABELS[item.action] ?? item.action} </Text>
                <Tag style={{ marginLeft: 4 }}>{item.target}</Tag>
              </span>
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{item.time}</Text>
            </div>
          ),
        }))}
      />
    </Card>
  )
}
