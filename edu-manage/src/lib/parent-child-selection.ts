export type ParentChildSelectionRecord = {
  id: string
  recordIds?: readonly string[]
}

/** Resolve a remembered student record ID to the current child identity. */
export function findParentChildSelection<T extends ParentChildSelectionRecord>(
  children: readonly T[],
  requestedId?: string | null,
): T | undefined {
  if (!requestedId) return undefined
  return children.find((child) => child.id === requestedId || child.recordIds?.includes(requestedId))
}

/** URL IDs win; then the remembered child; only then use the first linked child. */
export function resolveParentChildSelection<T extends ParentChildSelectionRecord>(
  children: readonly T[],
  candidates: readonly (string | null | undefined)[],
): T | undefined {
  for (const candidate of candidates) {
    const match = findParentChildSelection(children, candidate)
    if (match) return match
  }
  return children[0]
}

export function resolveParentChildId<T extends ParentChildSelectionRecord>(
  children: readonly T[],
  candidates: readonly (string | null | undefined)[],
): string {
  return resolveParentChildSelection(children, candidates)?.id || ''
}

/** A fallback must not make an invalid explicit URL selection look valid. */
export function resolveParentChildRequest<T extends ParentChildSelectionRecord>(
  children: readonly T[],
  requestedId?: string | null,
  rememberedId?: string | null,
) {
  const requested = findParentChildSelection(children, requestedId)
  return {
    selected: requested || resolveParentChildSelection(children, [rememberedId]),
    invalidChild: Boolean(requestedId && !requested),
  }
}
