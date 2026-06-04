'use client'

import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { Input, Select } from 'antd'
import { useIsMobile } from '@/hooks/useIsMobile'

export type MobileSelectOption = { label: string; value: string; [key: string]: unknown }
export type MobileSelectGroup = { label: string; options: MobileSelectOption[] }
export type MobileSelectOptions = Array<MobileSelectOption | MobileSelectGroup>

interface MobileSelectProps {
  value?: string
  onChange?: (value: string) => void
  options: MobileSelectOptions
  placeholder?: string
  allowClear?: boolean
  style?: CSSProperties
  size?: 'large' | 'middle' | 'small'
  disabled?: boolean
  popupMatchSelectWidth?: boolean | number
  dropdownStyle?: CSSProperties
  listHeight?: number
}

const isGroup = (option: MobileSelectOption | MobileSelectGroup): option is MobileSelectGroup => (
  Array.isArray((option as MobileSelectGroup).options)
)

const labelMatches = (label: string, keyword: string) => label.toLowerCase().includes(keyword)

export function MobileSelect({
  value,
  onChange,
  options,
  placeholder = '请选择',
  allowClear,
  style,
  size,
  disabled,
  popupMatchSelectWidth,
  dropdownStyle,
  listHeight = 220,
}: MobileSelectProps) {
  const isMobile = useIsMobile() ?? false
  const [searchText, setSearchText] = useState('')

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

  if (!isMobile) {
    return (
      <Select
        showSearch
        allowClear={allowClear}
        placeholder={placeholder}
        style={style}
        size={size}
        disabled={disabled}
        value={value || undefined}
        onChange={(nextValue) => onChange?.(nextValue || '')}
        filterOption={(input, option) =>
          String(option?.label || '').toLowerCase().includes(input.toLowerCase())
        }
        options={options}
        popupMatchSelectWidth={popupMatchSelectWidth}
        dropdownStyle={dropdownStyle}
        listHeight={listHeight}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...(style || {}) }}>
      <Input
        prefix={<SearchOutlined style={{ color: '#98A2B3' }} />}
        placeholder={`搜索${placeholder.replace('选择', '').replace('请选择', '')}`}
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        allowClear
        size={size}
        style={{ borderRadius: 8 }}
      />
      <Select
        allowClear={allowClear}
        placeholder={placeholder}
        style={{ width: '100%' }}
        size={size}
        disabled={disabled}
        value={value || undefined}
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
        getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
      />
    </div>
  )
}
