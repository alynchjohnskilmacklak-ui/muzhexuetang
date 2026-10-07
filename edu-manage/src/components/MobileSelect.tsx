'use client'

import type { CSSProperties } from 'react'
import { useMemo, useRef, useState } from 'react'
import { CloseCircleFilled, SearchOutlined } from '@ant-design/icons'
import { Input, Select } from 'antd'
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
  listHeight?: number
  searchable?: boolean
  nativeOnMobile?: boolean
}

const isGroup = (option: MobileSelectOption | MobileSelectGroup): option is MobileSelectGroup => (
  Array.isArray((option as MobileSelectGroup).options)
)

const labelMatches = (label: string, keyword: string) => label.toLowerCase().includes(keyword)

// antd Select 类型未暴露 inputAutoComplete，但运行时 rc-select 支持，用于关闭 iOS Safari 自动填充
const selectAutoCompleteOff = { inputAutoComplete: 'off' } as Record<string, string>

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
  listHeight = 220,
  searchable = true,
  nativeOnMobile = false,
}: MobileSelectProps) {
  const isMobile = useIsMobile() ?? false
  const [searchText, setSearchText] = useState('')
  const [open, setOpen] = useState(false)
  // mousedown 生效时抑制随后的 click 兜底（避免 antd 自身开关被重复触发）；
  // mousedown 失效的 WebView（部分手机浏览器）则由 click 兜底 toggle 开关。
  const suppressClick = useRef(false)
  const handleSelectMouseDown = () => {
    suppressClick.current = true
    window.setTimeout(() => { suppressClick.current = false }, 300)
  }
  const handleSelectClick = () => {
    if (!suppressClick.current) setOpen((o) => !o)
  }

  const filteredOptions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return options

    return options.reduce<MobileSelectOptions>((items, option) => {
      if (!isGroup(option)) {
        if (labelMatches(option.label, keyword)) items.push(option)
        return items
      }

      const matchedChildren = option.options.filter((child) => labelMatches(child.label, keyword))
      if (matchedChildren.length) items.push({ ...option, options: matchedChildren })
      return items
    }, [])
  }, [options, searchText])

  // A native picker avoids rc-select's click/mousedown ordering differences in
  // embedded and third-party mobile browsers. Opt in only for simple selects.
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

  if (!isMobile) {
    return (
      <Select
        open={open}
        onDropdownVisibleChange={setOpen}
        onMouseDown={handleSelectMouseDown}
        onClick={handleSelectClick}
        showSearch={searchable}
        allowClear={allowClear}
        placeholder={placeholder}
        style={style}
        size={size}
        disabled={disabled}
        value={value || undefined}
        clearIcon={<CloseCircleFilled style={{ fontSize: 18 }} />}
        {...selectAutoCompleteOff}
        onChange={(nextValue) => onChange?.(nextValue || '')}
        onClear={() => { onChange?.(''); onClear?.() }}
        filterOption={searchable ? ((input, option) =>
          String(option?.label || '').toLowerCase().includes(input.toLowerCase())
        ) : false}
        options={options}
        popupMatchSelectWidth={popupMatchSelectWidth}
        dropdownStyle={dropdownStyle}
        listHeight={listHeight}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...(style || {}) }}>
      {searchable && <Input
        prefix={<SearchOutlined style={{ color: '#98A2B3' }} />}
        placeholder={`搜索${placeholder.replace('选择', '').replace('请选择', '')}`}
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        allowClear
        size={size}
        style={{ borderRadius: 8 }}
      />}
      <Select
        open={open}
        onDropdownVisibleChange={setOpen}
        onMouseDown={handleSelectMouseDown}
        onClick={handleSelectClick}
        allowClear={allowClear}
        placeholder={placeholder}
        style={{ width: '100%' }}
        size={size}
        disabled={disabled}
        value={value || undefined}
        clearIcon={<CloseCircleFilled style={{ fontSize: 18 }} />}
        {...selectAutoCompleteOff}
        onClear={() => {
          onChange?.('')
          setSearchText('')
          onClear?.()
        }}
        onChange={(nextValue) => {
          onChange?.(nextValue || '')
          setSearchText('')
        }}
        options={filteredOptions}
        showSearch={false}
        virtual={false}
        listHeight={listHeight}
        popupMatchSelectWidth={popupMatchSelectWidth}
        dropdownStyle={dropdownStyle}
        getPopupContainer={() => document.body}
      />
    </div>
  )
}
