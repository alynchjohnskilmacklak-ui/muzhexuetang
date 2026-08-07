'use client'

import { useState } from 'react'
import { Modal, Button, Upload, Table, message, Alert, Typography } from 'antd'
import { DownloadOutlined, InboxOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'

const { Dragger } = Upload

const TEMPLATE_HEADERS = ['姓名', '性别', '年级', '学校', '家长姓名', '家长手机']
const TEMPLATE_DATA = [
  ['张三', '男', '高一', '石家庄一中', '张爸爸', '13800001111'],
  ['李四', '女', '初三', '衡水中学', '李妈妈', '13900002222'],
]

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [credentials, setCredentials] = useState<Array<{ name: string; email: string; password: string }>>([])

  const handleParse = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: 'binary' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)
      const errs: string[] = []
      data.forEach((row, i) => {
        if (!row['姓名']) errs.push(`第${i + 2}行：姓名为空`)
        if (row['家长手机'] && !/^\d{11}$/.test(row['家长手机'])) errs.push(`第${i + 2}行：手机格式错误`)
      })
      setRows(data)
      setErrors(errs)
    }
    reader.readAsBinaryString(file)
    return false
  }

  const handleImport = async () => {
    if (errors.length > 0) { message.warning('请先修正错误行再导入'); return }
    setImporting(true)
    let success = 0, fail = 0
    const issued: Array<{ name: string; email: string; password: string }> = []
    for (const row of rows) {
      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: row['姓名'],
            gender: row['性别'] || null,
            grade: row['年级'] || null,
            school: row['学校'] || null,
            parentName: row['家长姓名'] || null,
            parentPhone: row['家长手机'] || null,
            source: '批量导入',
          }),
        })
        const payload = await res.json().catch(() => ({}))
        if (res.ok) {
          success++
          if (payload.parentPlainPassword && payload.parentEmail) {
            issued.push({
              name: row['家长姓名'] || `${row['姓名']}家长`,
              email: payload.parentEmail,
              password: payload.parentPlainPassword,
            })
          }
        } else fail++
      } catch { fail++ }
    }
    message.success(`导入完成：成功 ${success} 条，失败 ${fail} 条`)
    setImporting(false)
    setCredentials(issued)
    if (!issued.length) handleClose()
  }

  const handleClose = () => {
    setRows([])
    setErrors([])
    setCredentials([])
    onClose()
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_DATA])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '学员导入模板')
    XLSX.writeFile(wb, '学员导入模板.xlsx')
  }

  const columns = TEMPLATE_HEADERS.map(h => ({ title: h, dataIndex: h, key: h }))

  const downloadCredentials = () => {
    const ws = XLSX.utils.json_to_sheet(credentials.map((item) => ({
      家长姓名: item.name,
      登录账号: item.email,
      初始密码: item.password,
      安全提示: '首次登录后请立即修改密码',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '新建家长账号')
    XLSX.writeFile(wb, `家长初始账号_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <Modal
      title={credentials.length ? '保存新建家长账号' : '批量导入学员'}
      open={open}
      onCancel={handleClose}
      onOk={credentials.length ? handleClose : handleImport}
      okText={credentials.length ? '我已安全保存' : '确认导入'}
      width={720}
      confirmLoading={importing}
      okButtonProps={{ disabled: !credentials.length && rows.length === 0 }}
    >
      {credentials.length ? (
        <>
          <Alert
            type="warning"
            showIcon
            icon={<SafetyCertificateOutlined />}
            message="初始密码仅在本次导入后显示"
            description="请立即下载并通过安全方式交给家长。关闭窗口后，管理端只能查看密码变更记录，不能再次查看明文。"
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" icon={<DownloadOutlined />} onClick={downloadCredentials} style={{ marginBottom: 16 }}>
            下载初始账号表
          </Button>
          <Table
            size="small"
            rowKey="email"
            pagination={false}
            scroll={{ x: 560 }}
            dataSource={credentials}
            columns={[
              { title: '家长', dataIndex: 'name', width: 120 },
              { title: '登录账号', dataIndex: 'email', width: 240, render: (value: string) => <Typography.Text copyable>{value}</Typography.Text> },
              { title: '初始密码', dataIndex: 'password', width: 180, render: (value: string) => <Typography.Text strong copyable>{value}</Typography.Text> },
            ]}
          />
        </>
      ) : (
        <>
      <Button icon={<DownloadOutlined />} onClick={downloadTemplate} style={{ marginBottom: 16 }}>
        下载导入模板
      </Button>

      <Dragger accept=".xlsx,.xls" beforeUpload={handleParse} maxCount={1} style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽 xlsx 文件上传</p>
        <p className="ant-upload-hint">支持 .xlsx / .xls 格式</p>
      </Dragger>

      {errors.length > 0 && (
        <Alert type="error" message={`${errors.length} 个错误`}
          description={errors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)} style={{ marginBottom: 16 }} />
      )}

      {rows.length > 0 && (
        <Table columns={columns} dataSource={rows.map((r, i) => ({ ...r, key: i }))}
          size="small" scroll={{ x: 600 }} pagination={false} />
      )}
        </>
      )}
    </Modal>
  )
}
