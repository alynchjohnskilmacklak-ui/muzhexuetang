'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Divider,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  CloudUploadOutlined,
  DeleteOutlined,
  HistoryOutlined,
  ReloadOutlined,
  UndoOutlined,
  WarningOutlined,
} from '@ant-design/icons'

const { Text, Title } = Typography

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CONFIRM_PHRASES: Record<string, string> = {
  restore: '恢复并覆盖现有数据',
  reset: '清空',
}

const DIVISION_OPTIONS = [
  { label: '初中部', value: 'JUNIOR' },
  { label: '高中部', value: 'SENIOR' },
  { label: '全部', value: 'BOTH' },
]

interface CleanupCategory {
  key: string
  label: string
  preset: boolean
}

function buildResetPhrase(division: string, selected: string[], cats: CleanupCategory[]): string {
  const scope = division === 'BOTH' ? '全部' : division === 'SENIOR' ? '高中部' : '初中部'
  const names = selected
    .map((k) => cats.find((c) => c.key === k)?.label ?? k)
    .join('、')
  return `清空${scope}的${names}`
}

export default function BackupRestorePanel() {
  const { message, modal } = App.useApp()

  // ---- Backup state ----
  const [backing, setBacking] = useState(false)
  const { data: historyData, mutate: refreshHistory, isLoading: historyLoading } = useSWR(
    '/api/admin/data-admin/backup',
    fetcher,
  )
  const history = historyData?.data ?? []

  // ---- Restore state ----
  const [restorePassword, setRestorePassword] = useState('')
  const [restoreDivision, setRestoreDivision] = useState<string>('JUNIOR')
  const [restoreConfirm, setRestoreConfirm] = useState('')
  const [selectedBackup, setSelectedBackup] = useState<string | undefined>()
  const [restoring, setRestoring] = useState(false)

  // ---- Reset state ----
  const { data: catData } = useSWR('/api/admin/data-admin/reset', fetcher)
  const categories: CleanupCategory[] = catData?.data ?? []
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [resetPassword, setResetPassword] = useState('')
  const [resetDivision, setResetDivision] = useState<string>('BOTH')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetResults, setResetResults] = useState<Record<string, Record<string, number>> | null>(null)

  const expectedResetPhrase = buildResetPhrase(resetDivision, selectedCats, categories)

  // ---- Handlers ----

  const handleBackup = useCallback(async () => {
    setBacking(true)
    try {
      const res = await fetch('/api/admin/data-admin/backup', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        message.success(`备份完成：${data.path}`)
        refreshHistory()
      } else {
        message.error(data.error || '备份失败')
      }
    } catch {
      message.error('备份请求失败')
    } finally {
      setBacking(false)
    }
  }, [refreshHistory])

  const handleRestore = useCallback(async () => {
    if (!selectedBackup) {
      message.warning('请选择备份')
      return
    }
    modal.confirm({
      title: '确认恢复',
      icon: <WarningOutlined />,
      content: `将用备份覆盖 ${restoreDivision === 'BOTH' ? '全部' : restoreDivision === 'SENIOR' ? '高中部' : '初中部'} 数据。此操作不可撤销。`,
      okText: '确认恢复',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setRestoring(true)
        try {
          const res = await fetch('/api/admin/data-admin/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              password: restorePassword,
              confirmPhrase: restoreConfirm,
              expectedPhrase: CONFIRM_PHRASES.restore,
              backupFile: selectedBackup,
              targetDivision: restoreDivision === 'BOTH' ? undefined : restoreDivision,
            }),
          })
          const data = await res.json()
          if (res.ok && data.success) {
            message.success('恢复完成')
            setRestorePassword('')
            setRestoreConfirm('')
          } else {
            message.error(data.error || '恢复失败')
          }
        } catch {
          message.error('恢复请求失败')
        } finally {
          setRestoring(false)
        }
      },
    })
  }, [selectedBackup, restoreDivision, restorePassword, restoreConfirm])

  const handleReset = useCallback(async () => {
    if (selectedCats.length === 0) {
      message.warning('请至少选择一个清理类别')
      return
    }
    modal.confirm({
      title: '确认清空数据',
      icon: <WarningOutlined />,
      content: (
        <div>
          <p>即将清空以下数据：</p>
          <ul>{selectedCats.map((k) => <li key={k}>{categories.find((c) => c.key === k)?.label ?? k}</li>)}</ul>
          <p>范围：{resetDivision === 'BOTH' ? '初中部 + 高中部' : resetDivision === 'SENIOR' ? '高中部' : '初中部'}</p>
          <p style={{ color: 'red' }}>此操作不可撤销！建议先创建备份。</p>
        </div>
      ),
      okText: '确认清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      width: 480,
      onOk: async () => {
        setResetting(true)
        try {
          const res = await fetch('/api/admin/data-admin/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              password: resetPassword,
              confirmPhrase: resetConfirm,
              expectedPhrase: expectedResetPhrase,
              division: resetDivision,
              categories: selectedCats,
            }),
          })
          const data = await res.json()
          if (res.ok && data.success) {
            message.success('数据清理完成')
            setResetResults(data.results)
            setResetPassword('')
            setResetConfirm('')
          } else {
            message.error(data.error || '清理失败')
          }
        } catch {
          message.error('清理请求失败')
        } finally {
          setResetting(false)
        }
      },
    })
  }, [selectedCats, resetDivision, resetPassword, resetConfirm, expectedResetPhrase, categories])

  const handlePresetAll = useCallback(() => {
    const presetKeys = categories.filter((c) => c.preset).map((c) => c.key)
    setSelectedCats(presetKeys)
  }, [categories])

  // ---- Backup history columns ----
  const historyCols = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '路径', dataIndex: 'path', key: 'path', ellipsis: true },
  ]

  return (
    <div style={{ maxWidth: 900 }}>
      {/* ======== Backup Section ======== */}
      <Card
        title={<><CloudUploadOutlined /> 一键备份</>}
        extra={<Button icon={<ReloadOutlined />} onClick={() => refreshHistory()} size="small">刷新</Button>}
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="info"
            message="备份将包含两个数据库的 pg_dump + 上传文件打包，保存在服务器备份目录中。"
            showIcon
          />
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleBackup}
            loading={backing}
            size="large"
          >
            创建备份
          </Button>

          {historyLoading ? (
            <Spin />
          ) : history.length > 0 ? (
            <Table
              dataSource={history}
              columns={historyCols}
              rowKey="name"
              size="small"
              pagination={false}
              scroll={{ x: 600 }}
            />
          ) : (
            <Empty description="暂无备份记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Space>
      </Card>

      {/* ======== Restore Section ======== */}
      <Card
        title={<><UndoOutlined /> 数据恢复</>}
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="error"
            message="危险操作：恢复将用备份数据覆盖当前数据。强烈建议先在测试环境验证流程。"
            showIcon
            icon={<WarningOutlined />}
          />

          <div>
            <Text strong>选择备份</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="选择要恢复的备份"
              value={selectedBackup}
              onChange={setSelectedBackup}
              options={history.map((h: { name: string; path: string }) => ({ label: h.name, value: h.path }))}
            />
          </div>

          <div>
            <Text strong>目标学部</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={restoreDivision}
              onChange={setRestoreDivision}
              options={DIVISION_OPTIONS}
            />
          </div>

          <div>
            <Text strong>输入确认短语：</Text>
            <Tag color="error" style={{ marginLeft: 8, fontSize: 14 }}>{CONFIRM_PHRASES.restore}</Tag>
          </div>
          <Input
            placeholder="请输入确认短语"
            value={restoreConfirm}
            onChange={(e) => setRestoreConfirm(e.target.value)}
          />

          <div>
            <Text strong>输入您的登录密码</Text>
          </div>
          <Input.Password
            placeholder="请输入密码"
            value={restorePassword}
            onChange={(e) => setRestorePassword(e.target.value)}
          />

          <Button
            danger
            type="primary"
            icon={<UndoOutlined />}
            onClick={handleRestore}
            loading={restoring}
            disabled={!selectedBackup || !restoreConfirm || !restorePassword}
          >
            执行恢复
          </Button>
        </Space>
      </Card>

      {/* ======== Reset Section ======== */}
      <Card
        title={<><DeleteOutlined /> 清理测试数据</>}
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="error"
            message="危险操作：将按类别清空数据。建议清空前先创建备份！"
            showIcon
            icon={<WarningOutlined />}
          />

          <div>
            <Text strong>清理范围</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={resetDivision}
              onChange={setResetDivision}
              options={DIVISION_OPTIONS}
            />
          </div>

          <div>
            <Space style={{ marginBottom: 8 }}>
              <Text strong>选择清理类别：</Text>
              <Button size="small" onClick={handlePresetAll}>清空全部交易数据</Button>
              <Button size="small" onClick={() => setSelectedCats([])}>取消全选</Button>
            </Space>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map((cat) => (
                <Checkbox
                  key={cat.key}
                  checked={selectedCats.includes(cat.key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCats((prev) => [...prev, cat.key])
                    } else {
                      setSelectedCats((prev) => prev.filter((k) => k !== cat.key))
                    }
                  }}
                >
                  {cat.label}
                </Checkbox>
              ))}
            </div>
          </div>

          <div>
            <Text strong>确认短语（请逐字输入）：</Text>
            <Tag color="error" style={{ marginLeft: 8, fontSize: 14, whiteSpace: 'pre-wrap' }}>
              {expectedResetPhrase}
            </Tag>
          </div>
          <Input
            placeholder="逐字输入上方确认短语"
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
          />

          <div>
            <Text strong>输入您的登录密码</Text>
          </div>
          <Input.Password
            placeholder="请输入密码"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />

          <Button
            danger
            type="primary"
            icon={<DeleteOutlined />}
            onClick={handleReset}
            loading={resetting}
            disabled={selectedCats.length === 0 || !resetConfirm || !resetPassword}
          >
            执行清理
          </Button>

          {resetResults && (
            <>
              <Divider />
              <Title level={5}>清理结果</Title>
              {Object.entries(resetResults).map(([div, counts]) => (
                <Card key={div} size="small" title={div === 'JUNIOR' ? '初中部' : '高中部'} style={{ marginBottom: 8 }}>
                  {Object.entries(counts).map(([cat, count]) => (
                    <Tag key={cat} style={{ margin: 4 }}>
                      {categories.find((c) => c.key === cat)?.label ?? cat}: {count} 条
                    </Tag>
                  ))}
                </Card>
              ))}
            </>
          )}
        </Space>
      </Card>
    </div>
  )
}
