'use client'

import { Select } from 'antd'
import { useRouter } from 'next/navigation'
import { useDivision } from '@/contexts/DivisionContext'
import { DIVISION_OPTIONS, type Division } from '@/lib/division'

export function DivisionSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const { division, setDivision } = useDivision()

  const handleChange = (value: Division) => {
    setDivision(value)
    router.refresh()
  }

  return (
    <Select
      value={division}
      onChange={handleChange}
      options={DIVISION_OPTIONS.map((item) => ({ value: item.value, label: compact ? item.label : `当前：${item.label}` }))}
      style={{ minWidth: compact ? 112 : 148 }}
      size={compact ? 'small' : 'middle'}
      popupMatchSelectWidth={false}
      getPopupContainer={(trigger) => trigger.parentElement || document.body}
      aria-label="切换学部"
    />
  )
}
