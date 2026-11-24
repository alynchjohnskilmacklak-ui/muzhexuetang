'use client'

import type { CSSProperties } from 'react'
import { useRef, useState } from 'react'
import { CloseCircleFilled } from '@ant-design/icons'
import { Select } from 'antd'
import { AdaptiveSelect } from '@/components/AdaptiveSelect'
import { useIsMobile } from '@/hooks/useIsMobile'

export type MobileSelectOption = { label: string; value: string; [key: string]: unknown }
export type MobileSelectGroup = { label: string; options: MobileSelectOption[] }
export type MobileSelectOptions = Array<MobileSelectOption | MobileSelectGroup>

interface MobileSelectProps {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  options: MobileSelectOptions
  placeholder?: string
  allowClear?: boolean
  style?: CSSProperties
  size?: 'large' | 'middle' | 'small'
  disabled?: boolean
  popupMatchSelectWidth?: boolean | number
  dropdownStyle?: CSSProperties
  styles?: { popup?: { root?: CSSProperties } }
  listHeight?: number
  searchable?: boolean
  nativeOnMobile?: boolean
}

const isGroup = (option: MobileSelectOption | MobileSelectGroup): option is MobileSelectGroup => (
  Array.isArray((option as MobileSelectGroup).options)
)

export function MobileSelect({
  value,
  onChange,
  onClear,
  options,
  placeholder = '请选择',
  allowClear,
  style,
  size,
  disabled,
  popupMatchSelectWidth,
  dropdownStyle,
  styles: customStyles,
  listHeight = 220,
  searchable = true,
  nativeOnMobile = false,
}: MobileSelectProps) {
  const isMobile = useIsMobile() ?? false
  const [open, setOpen] = useState(false)
  // mousedown 生效时抑制随后的 click 兜底（避免 antd 自身开关被重复触发）；
  // mousedown 失效的 WebView（部分手机浏览器）则由 click 兜底 toggle 开关。
  const suppressClick = useRef(false)
  const handleSelectMouseDown = () => {
    suppressClick.current = true
    window.setTimeout(() => { suppressClick.current = false }, 300)
  }
  const handleSelectClick = () => {
    if (!suppressClick.current) setOpen((current) => !current)
  }

  const mergedStyles = dropdownStyle
    ? { popup: { root: dropdownStyle }, ...customStyles }
    : customStyles
  const allowClearProp = allowClear ? { clearIcon: <CloseCircleFilled style={{ fontSize: 18 }} /> } : false

  // Native picker is reserved for simple controls; it never focuses a text input.
  if (isMobile && nativeOnMobile) {
    return (
      <select
        aria-label={placeholder}
        className="mobile-native-select"
        value={value || ''}
        onChange={(event) => {
          onChange?.(event.target.value)
          if (!event.target.value) onClear?.()
        }}
        disabled={disabled}
        style={style}
      >
        <option value="" disabled={!allowClear}>{placeholder}</option>
        {options.map((option) => isGroup(option)
          ? <optgroup key={option.label} label={option.label}>
              {option.options.map((child) => <option key={child.value} value={child.value}>{child.label}</option>)}
            </optgroup>
          : <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    )
  }

  if (isMobile) {
    return (
      <AdaptiveSelect
        open={open}
        onOpenChange={setOpen}
        onMouseDown={handleSelectMouseDown}
        onClick={handleSelectClick}
        showSearch={searchable}
        mobileSearch={searchable}
        allowClear={allowClearProp}
        placeholder={placeholder}
        style={style}
        size={size}
        disabled={disabled}
        value={value || undefined}
        onChange={(nextValue) => onChange?.(typeof nextValue === 'string' ? nextValue : String(nextValue ?? ''))}
        onClear={() => { onChange?.(''); onClear?.() }}
        options={options}
        popupMatchSelectWidth={popupMatchSelectWidth}
        styles={mergedStyles}
        listHeight={listHeight}
        virtual={false}
        getPopupContainer={() => document.body}
      />
    )
  }

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      onMouseDown={handleSelectMouseDown}
      onClick={handleSelectClick}
      showSearch={searchable}
      allowClear={allowClearProp}
      placeholder={placeholder}
      style={style}
      size={size}
      disabled={disabled}
      value={value || undefined}
      onChange={(nextValue) => onChange?.(nextValue || '')}
      onClear={() => { onChange?.(''); onClear?.() }}
      filterOption={searchable ? ((input, option) =>
        String(option?.label || '').toLowerCase().includes(input.toLowerCase())
      ) : false}
      options={options}
      popupMatchSelectWidth={popupMatchSelectWidth}
      styles={mergedStyles}
      listHeight={listHeight}
    />
  )
}
