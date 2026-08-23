'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Button, Drawer, Modal, Space } from 'antd'
import type { ButtonProps, DrawerProps, ModalProps } from 'antd'
import { useIsMobile } from '@/hooks/useIsMobile'

export type ResponsiveDialogProps = {
  open: boolean
  title: ReactNode
  children: ReactNode
  onClose: () => void
  onOk?: () => void
  okText?: ReactNode
  cancelText?: ReactNode
  confirmLoading?: boolean
  footer?: ReactNode | null
  width?: number | string
  mobileHeight?: number | string
  mobileFullHeight?: boolean
  destroyOnHidden?: boolean
  maskClosable?: boolean
  keyboard?: boolean
  closable?: boolean
  rootClassName?: string
  bodyStyle?: CSSProperties
  okButtonProps?: ButtonProps
  cancelButtonProps?: ButtonProps
  getContainer?: ModalProps['getContainer']
  afterOpenChange?: (open: boolean) => void
}

export function ResponsiveDialog({
  open,
  title,
  children,
  onClose,
  onOk,
  okText = '确定',
  cancelText = '取消',
  confirmLoading = false,
  footer,
  width = 560,
  mobileHeight = '90dvh',
  mobileFullHeight = false,
  destroyOnHidden = true,
  maskClosable = true,
  keyboard = true,
  closable = true,
  rootClassName,
  bodyStyle,
  okButtonProps,
  cancelButtonProps,
  getContainer,
  afterOpenChange,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile() ?? false
  const defaultFooter = onOk ? (
    <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button onClick={onClose} disabled={confirmLoading} {...cancelButtonProps}>{cancelText}</Button>
      <Button type="primary" onClick={onOk} loading={confirmLoading} {...okButtonProps}>{okText}</Button>
    </Space>
  ) : null
  const renderedFooter = footer === undefined ? defaultFooter : footer

  if (isMobile) {
    const drawerStyles: DrawerProps['styles'] = {
      content: {
        borderRadius: mobileFullHeight ? 0 : '18px 18px 0 0',
        overflow: 'hidden',
      },
      header: {
        flex: '0 0 auto',
        paddingTop: mobileFullHeight ? 'calc(16px + env(safe-area-inset-top, 0px))' : 16,
        borderBottom: '1px solid var(--color-hairline)',
      },
      body: {
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        padding: 16,
        ...bodyStyle,
      },
      footer: {
        flex: '0 0 auto',
        padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid var(--color-hairline)',
      },
    }

    return (
      <Drawer
        rootClassName={rootClassName}
        title={title}
        open={open}
        onClose={onClose}
        placement="bottom"
        height={mobileFullHeight ? '100dvh' : mobileHeight}
        footer={renderedFooter}
        destroyOnHidden={destroyOnHidden}
        maskClosable={maskClosable}
        keyboard={keyboard}
        closable={closable}
        styles={drawerStyles}
        afterOpenChange={afterOpenChange}
      >
        {children}
      </Drawer>
    )
  }

  return (
    <Modal
      rootClassName={rootClassName}
      title={title}
      open={open}
      onCancel={onClose}
      onOk={onOk}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={confirmLoading}
      footer={renderedFooter}
      width={width}
      centered
      destroyOnHidden={destroyOnHidden}
      maskClosable={maskClosable}
      keyboard={keyboard}
      closable={closable}
      styles={{ body: bodyStyle }}
      getContainer={getContainer}
      afterOpenChange={afterOpenChange}
    >
      {children}
    </Modal>
  )
}
