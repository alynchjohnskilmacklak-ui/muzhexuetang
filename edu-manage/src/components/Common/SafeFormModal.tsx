'use client'

import { useCallback, useState } from 'react'
import { Button, Modal, Typography } from 'antd'
import { ExclamationOutlined } from '@ant-design/icons'
import { BrandModal, type BrandModalProps } from './BrandModal'

export type SafeFormModalProps = Omit<BrandModalProps, 'onClose'> & {
  onClose: () => void
  dirty?: boolean
  closeConfirmTitle?: string
  closeConfirmDescription?: string
}

export function SafeFormModal({
  onClose,
  dirty = false,
  confirmLoading = false,
  closeConfirmTitle = '放弃未保存的修改？',
  closeConfirmDescription = '关闭后，本次填写的内容不会保存。',
  ...dialogProps
}: SafeFormModalProps) {
  const [discardOpen, setDiscardOpen] = useState(false)

  const requestClose = useCallback(() => {
    if (confirmLoading) return
    if (!dirty) {
      onClose()
      return
    }

    setDiscardOpen(true)
  }, [confirmLoading, dirty, onClose])

  const confirmDiscard = useCallback(() => {
    setDiscardOpen(false)
    onClose()
  }, [onClose])

  return (
    <>
      <BrandModal
        {...dialogProps}
        confirmLoading={confirmLoading}
        onClose={requestClose}
        maskClosable={!confirmLoading}
        keyboard={!confirmLoading}
        closable={!confirmLoading}
      />
      <Modal
        open={discardOpen}
        centered
        footer={null}
        closable={false}
        width={420}
        className="safe-form-discard-modal"
        rootClassName="safe-form-discard-root"
        onCancel={() => setDiscardOpen(false)}
      >
        <div className="safe-form-discard-content">
          <div className="safe-form-discard-icon" aria-hidden><ExclamationOutlined /></div>
          <Typography.Title level={4}>{closeConfirmTitle}</Typography.Title>
          <Typography.Paragraph>{closeConfirmDescription}</Typography.Paragraph>
          <div className="safe-form-discard-actions">
            <Button onClick={() => setDiscardOpen(false)}>继续编辑</Button>
            <Button type="primary" onClick={confirmDiscard}>放弃修改</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
