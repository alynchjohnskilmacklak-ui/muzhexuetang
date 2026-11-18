'use client'

import { Children, cloneElement, isValidElement, useMemo, useRef, useState, type ReactNode } from 'react'
import { Input, Select } from 'antd'
import type { InputRef, SelectProps } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

type SelectOption = {
  label?: ReactNode
  title?: ReactNode
  value?: unknown
  options?: SelectOption[]
  [key: string]: unknown
}

type AdaptiveSelectProps = SelectProps & {
  /** Whether mobile users should get an explicit search field inside the opened menu. */
  mobileSearch?: boolean
  children?: ReactNode
}

function getNodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join(' ')
  if (isValidElement<{ children?: ReactNode }>(node)) return getNodeText(node.props.children)
  return ''
}

function matchesOption(
  option: SelectOption,
  keyword: string,
  optionFilterProp: string | undefined,
  filterOption: SelectProps['filterOption'],
) {
  if (typeof filterOption === 'function') {
    return filterOption(keyword, option as never)
  }

  const field = optionFilterProp || 'label'
  const text = getNodeText(option[field] as ReactNode)
    || getNodeText(option.label)
    || getNodeText(option.title)
    || getNodeText(option.children as ReactNode)
    || getNodeText(option.value as ReactNode)
  return text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
}

function filterOptionTree(
  options: SelectOption[] | undefined,
  keyword: string,
  optionFilterProp: string | undefined,
  filterOption: SelectProps['filterOption'],
): SelectOption[] | undefined {
  if (!options || !keyword || filterOption === false) return options

  return options.flatMap((option) => {
    if (!Array.isArray(option.options)) {
      return matchesOption(option, keyword, optionFilterProp, filterOption) ? [option] : []
    }

    const children = filterOptionTree(option.options, keyword, optionFilterProp, filterOption) || []
    if (children.length || matchesOption(option, keyword, optionFilterProp, filterOption)) {
      return [{ ...option, options: children.length ? children : option.options }]
    }
    return []
  })
}

function filterOptionChildren(
  children: ReactNode,
  keyword: string,
  optionFilterProp: string | undefined,
  filterOption: SelectProps['filterOption'],
): ReactNode {
  if (!keyword || filterOption === false) return children

  return Children.map(children, (child) => {
    if (!isValidElement<{ children?: ReactNode; options?: SelectOption[] } & SelectOption>(child)) return child

    const props = child.props
    const isGroup = Array.isArray(props.options) || (!('value' in props) && props.children !== undefined)
    if (isGroup) {
      if (Array.isArray(props.options)) {
        const options = filterOptionTree(props.options, keyword, optionFilterProp, filterOption) || []
        return options.length || matchesOption(props, keyword, optionFilterProp, filterOption)
          ? cloneElement(child, { options: options.length ? options : props.options })
          : null
      }

      const nested = filterOptionChildren(props.children, keyword, optionFilterProp, filterOption)
      const groupMatches = matchesOption(props, keyword, optionFilterProp, filterOption)
      return groupMatches || Children.count(nested) > 0 ? cloneElement(child, undefined, groupMatches ? props.children : nested) : null
    }

    return matchesOption(props, keyword, optionFilterProp, filterOption) ? child : null
  })
}

/**
 * Ant Design Select wrapper with a predictable mobile keyboard policy:
 * tapping the field opens choices without focusing an editable search input;
 * search remains available as a deliberate field inside the opened menu.
 */
export function AdaptiveSelect({ mobileSearch, ...props }: AdaptiveSelectProps) {
  const isMobile = useIsMobile() ?? false
  const [localSearch, setLocalSearch] = useState('')
  const searchInputRef = useRef<InputRef>(null)
  const {
    children,
    options,
    mode,
    showSearch,
    searchValue,
    onSearch,
    onChange,
    popupRender,
    optionFilterProp,
    filterOption,
    autoClearSearchValue,
  } = props

  const searchEnabled = mobileSearch ?? (
    Boolean(showSearch) || ((mode === 'multiple' || mode === 'tags') && showSearch !== false)
  )
  const showMobileSearch = isMobile && searchEnabled
  const activeSearch = searchValue ?? localSearch
  const filteredOptions = useMemo(
    () => showMobileSearch
      ? filterOptionTree(options as SelectOption[] | undefined, activeSearch.trim(), optionFilterProp, filterOption)
      : options,
    [activeSearch, filterOption, optionFilterProp, options, showMobileSearch],
  )
  const filteredChildren = useMemo(
    () => showMobileSearch
      ? filterOptionChildren(children, activeSearch.trim(), optionFilterProp, filterOption)
      : children,
    [activeSearch, children, filterOption, optionFilterProp, showMobileSearch],
  )

  const updateSearch = (value: string) => {
    setLocalSearch(value)
    onSearch?.(value)
  }

  const handleChange: NonNullable<SelectProps['onChange']> = (value, option) => {
    onChange?.(value, option)
    if (showMobileSearch) {
      searchInputRef.current?.blur()
      const clearAfterPick = autoClearSearchValue ?? true
      if (clearAfterPick) updateSearch('')
    }
  }

  const mobilePopupRender = showMobileSearch
    ? (menu: ReactNode) => (
        <div className="adaptive-select-popup">
          <div
            className="adaptive-select-popup__search"
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <Input
              ref={searchInputRef}
              value={activeSearch}
              onChange={(event) => updateSearch(event.target.value)}
              allowClear
              prefix={<SearchOutlined />}
              placeholder="在选项中搜索"
              aria-label="在下拉选项中搜索"
            />
          </div>
          {popupRender ? popupRender(menu as React.ReactElement) : menu}
        </div>
      )
    : popupRender

  return (
    <Select
      {...props}
      options={filteredOptions as SelectProps['options']}
      showSearch={isMobile ? false : showSearch}
      searchValue={isMobile ? undefined : searchValue}
      onSearch={isMobile ? undefined : onSearch}
      onChange={handleChange}
      popupRender={mobilePopupRender}
    >
      {filteredChildren}
    </Select>
  )
}
