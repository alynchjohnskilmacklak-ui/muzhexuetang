'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Button, Modal, Space } from 'antd'
import type { ButtonProps, ModalProps } from 'antd'
import { useIsMobile } from '@/hooks/useIsMobile'

type BrandModalBaseProps = Omit<
  ModalProps,
  | 'open'
  | 'title'
  | 'children'
  | 'onCancel'
  | 'onOk'
  | 'confirmLoading'
  | 'okText'
  | 'cancelText'
  | 'footer'
  | 'maskClosable'
  | 'keyboard'
  | 'closable'
  | 'width'
  | 'styles'
  | 'bodyStyle'
>

export type BrandModalProps = BrandModalBaseProps & {
  open: boolean
  title: ReactNode
  children: ReactNode
  onClose?: () => void
  onCancel?: ModalProps['onCancel']
  onOk?: () => void
  okText?: ReactNode
  cancelText?: ReactNode
  confirmLoading?: boolean
  footer?: ModalProps['footer']
  width?: number | string
  mobileHeight?: number | string
  mobileFullHeight?: boolean
  maskClosable?: boolean
  keyboard?: boolean
  closable?: boolean
  bodyStyle?: CSSProperties
  okButtonProps?: ButtonProps
  cancelButtonProps?: ButtonProps
  styles?: ModalProps['styles']
}

function asCssSize(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value
}

/**
 * One modal contract for admin, teacher, and parent flows.
 * Keeps mobile height/gutter settings real and prevents dismissing a pending save.
 */
export function BrandModal({
  open,
  title,
  children,
  onClose,
  onCancel,
  onOk,
  okText = '确定',
  cancelText = '取消',
  confirmLoading = false,
  footer,
  width = 560,
  mobileHeight = '90dvh',
  mobileFullHeight = false,
  maskClosable = true,
  keyboard = true,
  closable = true,
  bodyStyle,
  okButtonProps,
  cancelButtonProps,
  styles,
  className,
  rootClassName,
  ...restProps
}: BrandModalProps) {
  const isMobile = useIsMobile() ?? false
  const isBusy = confirmLoading
  const modalClassName = [
    'mzu-brand-modal',
    isMobile && 'mzu-brand-modal-mobile',
    isMobile && mobileFullHeight && 'mzu-brand-modal-fullscreen',
    className,
  ].filter(Boolean).join(' ')

  const handleCancel: NonNullable<ModalProps['onCancel']> = (event) => {
    if (isBusy) return
    if (onClose) onClose()
    else onCancel?.(event)
  }

  const defaultFooter = onOk ? (
    <Space style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <Button
        {...cancelButtonProps}
        onClick={handleCancel}
        disabled={isBusy || cancelButtonProps?.disabled}
      >
        {cancelText}
      </Button>
      <Button
        type="primary"
        {...okButtonProps}
        onClick={onOk}
        loading={isBusy || Boolean(okButtonProps?.loading)}
      >
        {okText}
      </Button>
    </Space>
  ) : null

  const renderedFooter = footer === undefined ? defaultFooter : footer
  const mobileHeightCss = asCssSize(mobileFullHeight ? '100dvh' : mobileHeight)
  const baseStyles: NonNullable<ModalProps['styles']> = {
    mask: {
      background: 'rgba(13, 55, 50, .48)',
      backdropFilter: 'blur(2px)',
      ...styles?.mask,
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      isolation: 'isolate',
      overflow: 'hidden',
      borderRadius: isMobile && mobileFullHeight ? 0 : 16,
      maxHeight: isMobile ? mobileHeightCss : '88dvh',
      minHeight: isMobile && mobileFullHeight ? '100dvh' : undefined,
      height: isMobile && mobileFullHeight ? '100dvh' : undefined,
      ...styles?.content,
    },
    header: {
      flex: '0 0 auto',
      padding: isMobile ? '16px 18px 12px' : '18px 24px 14px',
      borderBottom: '1px solid var(--color-hairline)',
      background: 'transparent',
      ...styles?.header,
    },
    body: {
      minHeight: 0,
      flex: '1 1 auto',
      maxHeight: isMobile
        ? `calc(${mobileHeightCss} - 132px)`
        : 'calc(88dvh - 132px)',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      WebkitOverflowScrolling: 'touch',
      padding: isMobile ? 16 : '20px 24px',
      ...bodyStyle,
      ...styles?.body,
    },
    footer: {
      flex: '0 0 auto',
      padding: isMobile
        ? '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))'
        : '12px 24px 18px',
      borderTop: '1px solid var(--color-hairline)',
      background: 'transparent',
      ...styles?.footer,
    },
  }

  return (
    <Modal
      {...restProps}
      className={modalClassName}
      rootClassName={rootClassName}
      title={title}
      open={open}
      onCancel={handleCancel}
      onOk={onOk}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={confirmLoading}
      footer={renderedFooter}
      width={isMobile ? (mobileFullHeight ? '100vw' : 'calc(100vw - 24px)') : width}
      centered
      maskClosable={!isBusy && maskClosable}
      keyboard={!isBusy && keyboard}
      closable={!isBusy && closable}
      styles={baseStyles}
    >
      {children}
    </Modal>
  )
}
