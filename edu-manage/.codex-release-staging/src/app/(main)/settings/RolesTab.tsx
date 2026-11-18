'use client'

import useSWR from 'swr'
import { Card, Switch, Descriptions, Typography, message } from 'antd'

const { Text } = Typography
const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function RolesTab() {
  const { data, isLoading, mutate } = useSWR('/api/settings/roles', fetcher)

  const patch = async (values: Record<string, unknown>) => {
    await fetch('/api/settings/roles', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
    })
    message.success('角色权限已更新')
    mutate()
  }

  if (!data) return null

  return (
    <Card bordered={false} style={{ borderRadius: 10 }} loading={isLoading}>
      <div style={{ maxWidth: 600 }}>
        <Card size="small" style={{ marginBottom: 16, background: '#faf8f5' }}>
          <Descriptions title="管理员 (Admin)" column={1} size="small">
            <Descriptions.Item label="权限">全部权限：学员管理、教师管理、课程管理、排课系统、考勤、成绩、收费、报表、系统设置</Descriptions.Item>
          </Descriptions>
        </Card>
        <Card size="small" style={{ marginBottom: 16, background: '#faf8f5' }}>
          <Descriptions title="教师 (Teacher)" column={1} size="small">
            <Descriptions.Item label="权限">学员查看、试卷管理、考勤记录、在校表现发布</Descriptions.Item>
          </Descriptions>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <Text>教师可查看财务数据</Text>
            <Switch checked={data.teacherViewFee} onChange={(v) => patch({ teacherViewFee: v })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <Text>教师可查看其他教师的学员</Text>
            <Switch checked={data.teacherViewOthers} onChange={(v) => patch({ teacherViewOthers: v })} />
          </div>
        </Card>
        <Card size="small" style={{ background: '#faf8f5' }}>
          <Descriptions title="家长 (Parent)" column={1} size="small">
            <Descriptions.Item label="权限">查看子女信息、试卷、课表、留言互动</Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    </Card>
  )
}
