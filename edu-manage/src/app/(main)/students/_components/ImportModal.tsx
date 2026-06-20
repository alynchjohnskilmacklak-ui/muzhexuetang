'use client'

import { useState } from 'react'
import { Modal, Button, Upload, Table, Alert } from 'antd'
import { toast } from 'sonner'
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons'
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
    if (errors.length > 0) { toast.warning('请先修正错误行再导入'); return }
    setImporting(true)
    let success = 0, fail = 0
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
        if (res.ok) success++; else fail++
      } catch { fail++ }
    }
    toast.success(`导入完成：成功 ${success} 条，失败 ${fail} 条`)
    setImporting(false)
    onClose()
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_DATA])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '学员导入模板')
    XLSX.writeFile(wb, '学员导入模板.xlsx')
  }

  const columns = TEMPLATE_HEADERS.map(h => ({ title: h, dataIndex: h, key: h }))

  return (
    <Modal title="批量导入学员" open={open} onCancel={onClose} onOk={handleImport} okText="确认导入"
      width={720} confirmLoading={importing} okButtonProps={{ disabled: rows.length === 0 }}>
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
    </Modal>
  )
}
