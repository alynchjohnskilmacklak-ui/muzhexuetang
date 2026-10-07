'use client'

import { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Divider,
  DatePicker,
  Empty,
  Input,
  Modal,
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
  EditOutlined,
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

export default function BackupRestorePanel({ backupOnly = false }: { backupOnly?: boolean }) {
  const { message, modal } = App.useApp()

  // ---- Backup state ----
  const [backing, setBacking] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
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
  const { data: termData } = useSWR('/api/admin/academic-terms', fetcher)
  const { data: classData } = useSWR('/api/class-groups', fetcher)
  const { data: studentData } = useSWR('/api/students?limit=500', fetcher)
  const categories: CleanupCategory[] = useMemo(() => catData?.data ?? [], [catData?.data])
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [resetPassword, setResetPassword] = useState('')
  const [resetDivision, setResetDivision] = useState<string>('JUNIOR')
  const [resetTermId, setResetTermId] = useState('')
  const [resetDateRange, setResetDateRange] = useState<[string, string] | null>(null)
  const [resetClassId, setResetClassId] = useState<string | undefined>()
  const [resetStudentId, setResetStudentId] = useState<string | undefined>()
  const [resetPreview, setResetPreview] = useState<{ total: number; data: Record<string, { counts: Record<string, number>; total: number }> } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetResults, setResetResults] = useState<Record<string, Record<string, number>> | null>(null)

  const expectedResetPhrase = buildResetPhrase(resetDivision, selectedCats, categories)
  const academicTerms = Array.isArray(termData?.terms) ? termData.terms : []
  const effectiveTermId = resetTermId || termData?.selectedTermId || 'ALL'
  const classOptions = (Array.isArray(classData) ? classData : []).map((item: { id: string; name: string }) => ({ label: item.name, value: item.id }))
  const studentRows = Array.isArray(studentData?.students) ? studentData.students : Array.isArray(studentData?.data) ? studentData.data : []
  const studentOptions = studentRows.map((item: { id: string; name: string }) => ({ label: item.name, value: item.id }))

  // ---- Handlers ----

  const handleBackup = useCallback(async () => {
    setBacking(true)
    try {
      const res = await fetch('/api/admin/data-admin/backup', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        message.success(`备份完成：${data.backupId}`)
        refreshHistory()
      } else {
        message.error(data.error || '备份失败')
      }
    } catch {
      message.error('备份请求失败')
    } finally {
      setBacking(false)
    }
  }, [message, refreshHistory])

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
              backupId: selectedBackup,
              targetDivision: restoreDivision,
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
  }, [message, modal, selectedBackup, restoreDivision, restorePassword, restoreConfirm])

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
          <p>预估影响：约 {resetPreview?.total || 0} 条。执行后将进入回收站，30 天内可恢复。</p>
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
              division: resetDivision,
              categories: selectedCats,
              termId: effectiveTermId === 'ALL' ? undefined : effectiveTermId,
              dateFrom: resetDateRange?.[0],
              dateTo: resetDateRange?.[1],
              classId: resetClassId,
              studentId: resetStudentId,
            }),
          })
          const data = await res.json()
          if (res.ok && data.success) {
            message.success('数据已移入回收站，可在 30 天内恢复')
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
  }, [categories, effectiveTermId, message, modal, resetClassId, resetConfirm, resetDateRange, resetDivision, resetPassword, resetPreview?.total, resetStudentId, selectedCats])

  const handlePreviewReset = useCallback(async () => {
    if (!selectedCats.length) { message.warning('请至少选择一个清理类别'); return }
    setPreviewing(true)
    try {
      const response = await fetch('/api/admin/data-admin/reset/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ division: resetDivision, categories: selectedCats, termId: effectiveTermId === 'ALL' ? undefined : effectiveTermId, dateFrom: resetDateRange?.[0], dateTo: resetDateRange?.[1], classId: resetClassId, studentId: resetStudentId }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '预估失败')
      setResetPreview(payload)
      message.success('影响条数预估已更新')
    } catch (error) { message.error(error instanceof Error ? error.message : '预估失败') } finally { setPreviewing(false) }
  }, [effectiveTermId, message, resetClassId, resetDateRange, resetDivision, resetStudentId, selectedCats])

  const handlePresetAll = useCallback(() => {
    const presetKeys = categories.filter((c) => c.preset).map((c) => c.key)
    setSelectedCats(presetKeys)
  }, [categories])

  const handleRename = useCallback(async () => {
    if (!renameTarget || !renameValue.trim()) return
    setRenaming(true)
    try {
      const response = await fetch('/api/admin/data-admin/backup', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backupId: renameTarget.id, displayName: renameValue.trim() }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '重命名失败')
      message.success('备份名称已更新')
      setRenameTarget(null)
      await refreshHistory()
    } catch (error) { message.error(error instanceof Error ? error.message : '重命名失败') } finally { setRenaming(false) }
  }, [message, refreshHistory, renameTarget, renameValue])

  const handleDeleteBackup = useCallback((record: { id: string; name: string }) => {
    modal.confirm({
      title: '删除这份备份？',
      icon: <WarningOutlined />,
      content: `「${record.name}」将从服务器中删除，删除后这份备份将无法再用于恢复数据，这个操作不可撤销。`,
      okText: '确认删除备份', okButtonProps: { danger: true }, cancelText: '取消',
      onOk: async () => {
        const response = await fetch('/api/admin/data-admin/backup', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backupId: record.id }) })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '删除失败')
        if (selectedBackup === record.id) setSelectedBackup(undefined)
        message.success('备份已删除')
        await refreshHistory()
      },
    })
  }, [message, modal, refreshHistory, selectedBackup])

  // ---- Backup history columns ----
  const historyCols = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '操作', key: 'actions', width: 190, render: (_: unknown, record: { id: string; name: string }) => <Space size={4}><Button size="small" icon={<EditOutlined />} onClick={() => { setRenameTarget(record); setRenameValue(record.name) }}>重命名</Button><Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteBackup(record)}>删除</Button></Space> },
  ]

  return (
    <div style={{ maxWidth: 900 }}>
      <Modal title="重命名备份" open={!!renameTarget} onCancel={() => setRenameTarget(null)} onOk={handleRename} confirmLoading={renaming} okText="保存名称" cancelText="取消">
        <Text type="secondary">只修改列表显示名称，不会改变备份目录和备份内容。</Text>
        <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={80} showCount autoFocus style={{ marginTop: 12 }} />
      </Modal>
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

      {!backupOnly && <>
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
              options={history.map((h: { id: string; name: string }) => ({ label: h.name, value: h.id }))}
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
            <Text strong>清理范围（学部）</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={resetDivision}
              onChange={(value) => { setResetDivision(value); setResetPreview(null) }}
              options={DIVISION_OPTIONS}
            />
          </div>

          <div>
            <Text strong>运营批次</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={effectiveTermId} onChange={(value) => { setResetTermId(value); setResetClassId(undefined); setResetPreview(null) }} options={[...academicTerms.map((term: { id: string; name: string; status: string }) => ({ label: `${term.name}${term.status === 'ACTIVE' ? '（当前）' : '（历史）'}`, value: term.id })), { label: '全部批次（高危）', value: 'ALL' }]} />
          </div>
          {effectiveTermId === 'ALL' && <Alert type="warning" showIcon message="当前选择全部批次，将跨当前与历史批次清理数据，影响范围更大。" />}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div><Text strong>日期范围（可选）</Text><DatePicker.RangePicker style={{ width: '100%', marginTop: 8 }} onChange={(_, values) => { setResetDateRange(values[0] && values[1] ? [values[0], values[1]] : null); setResetPreview(null) }} /></div>
            <div><Text strong>指定班级（可选）</Text><Select allowClear showSearch optionFilterProp="label" style={{ width: '100%', marginTop: 8 }} placeholder="留空为批次内全部班级" value={resetClassId} onChange={(value) => { setResetClassId(value); setResetPreview(null) }} options={classOptions} /></div>
            <div><Text strong>指定学员（可选）</Text><Select allowClear showSearch optionFilterProp="label" style={{ width: '100%', marginTop: 8 }} placeholder="留空为范围内全部学员" value={resetStudentId} onChange={(value) => { setResetStudentId(value); setResetPreview(null) }} options={studentOptions} /></div>
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
                    setResetPreview(null)
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

          <Button icon={<ReloadOutlined />} loading={previewing} onClick={handlePreviewReset}>预估影响条数</Button>
          {resetPreview && <Alert className="preview-box" type={resetPreview.total > 0 ? 'warning' : 'info'} showIcon message={`本次将清理${effectiveTermId === 'ALL' ? '全部批次' : `「${academicTerms.find((term: { id: string }) => term.id === effectiveTermId)?.name || '所选批次'}」`}内的${selectedCats.map((key) => categories.find((category) => category.key === key)?.label).filter(Boolean).join('、')}，共约 ${resetPreview.total} 条。`} description="清理结果会先进入回收站，30 天内可整批恢复。请确认数字符合预期后再继续。" />}

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
            disabled={selectedCats.length === 0 || !resetConfirm || !resetPassword || !resetPreview}
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
      </>}
    </div>
  )
}
