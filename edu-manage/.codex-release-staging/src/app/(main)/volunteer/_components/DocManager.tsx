'use client'

import { Button, Popconfirm, Space, Upload } from 'antd'
import { FileTextOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { toast } from 'sonner'

type Doc = { id: string; name: string; fileUrl: string; type: string }

export function DocManager({ documents, onChanged }: { documents: Doc[]; onChanged: () => void }) {
  const remove = async (id: string) => {
    const res = await fetch(`/api/volunteer/documents/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('删除失败')
    toast.success('附件已删除')
    onChanged()
  }

  return (
    <div style={{ borderTop: '1px solid #EEE7E1', paddingTop: 12 }}>
      <div style={{ color: '#1F2329', fontWeight: 700, marginBottom: 8 }}>附件管理</div>
      <Space direction="vertical" style={{ width: '100%' }}>
        {documents.map((doc) => (
          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <Space style={{ minWidth: 0 }}>
              <FileTextOutlined />
              <a href={doc.fileUrl} target="_blank" style={{ color: '#5a4e3a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{doc.name}</a>
            </Space>
            <Popconfirm title="删除附件？" okText="删除" cancelText="取消" onConfirm={() => remove(doc.id)}>
              <Button size="small" danger type="text" icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        ))}
        <Upload
          name="file"
          action="/api/volunteer/documents"
          showUploadList={false}
          onChange={(info) => {
            if (info.file.status === 'done') {
              toast.success('附件已上传')
              onChanged()
            }
            if (info.file.status === 'error') toast.error('上传失败')
          }}
        >
          <Button block icon={<UploadOutlined />}>上传新文件</Button>
        </Upload>
      </Space>
    </div>
  )
}
