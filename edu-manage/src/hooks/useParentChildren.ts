'use client'

import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { fetchJson } from '@/lib/fetch-json'
import { rememberParentChild, rememberParentChildGender } from '@/lib/parent-child-preference'
import { useRouter, useSearchParams } from 'next/navigation'

export interface ParentChildItem {
  id: string
  name: string
  grade: string | null
  membershipLevel: string | null
  termName?: string | null
  gender?: string | null
}

interface ChildrenApiResponse {
  children: ParentChildItem[]
  activeChildId: string
  invalidChild?: boolean
}

const fetcher = (url: string) => fetchJson<ChildrenApiResponse>(url)

export function useParentChildren() {
  const { data: session } = useSession()
  const isParent = (session?.user as { role?: string })?.role === 'parent'
  const router = useRouter()
  const searchParams = useSearchParams()

  const { data, error, mutate, isLoading } = useSWR<ChildrenApiResponse>(
    isParent ? '/api/parent/children' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )

  const rawChildren = data?.children ?? []
  // Deduplicate children with identical names and grades to prevent duplicate pills
  const children = rawChildren.filter((child, index, self) =>
    index === self.findIndex((c) => c.name === child.name && c.grade === child.grade)
  )
  const childIdFromUrl = searchParams?.get('childId') || ''
  
  // Resolve active child from URL param first, then API activeChildId, then first child
  const activeChildId = childIdFromUrl && children.some(c => c.id === childIdFromUrl)
    ? childIdFromUrl
    : (data?.activeChildId || children[0]?.id || '')

  const activeChild = children.find(c => c.id === activeChildId) || children[0]

  const switchChild = (studentId: string) => {
    const target = children.find(c => c.id === studentId)
    if (!target) return
    rememberParentChild(target.id, target.membershipLevel)
    if (target.gender) {
      rememberParentChildGender(target.gender)
    }

    // Update URL query string with new childId
    const currentParams = new URLSearchParams(window.location.search)
    currentParams.set('childId', studentId)
    const newUrl = `${window.location.pathname}?${currentParams.toString()}`
    router.replace(newUrl)

    // Update local cache
    mutate({ children, activeChildId: studentId }, false)
  }

  return {
    children,
    activeChildId,
    activeChild,
    switchChild,
    hasMultipleChildren: children.length > 1,
    isLoading,
    error,
    mutate,
  }
}
