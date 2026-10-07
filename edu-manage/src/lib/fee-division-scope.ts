export type FeeDivision = 'JUNIOR' | 'SENIOR'
export type FeeDivisionScope = FeeDivision | 'all'

export function resolveFeeDivisionScope(
  sessionDivision: string,
  requestedDivision: string | null | undefined,
  canAccessAllDivisions: boolean,
): FeeDivisionScope {
  const ownDivision: FeeDivision = sessionDivision === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  const requested: FeeDivisionScope = requestedDivision === 'all'
    ? 'all'
    : requestedDivision === 'SENIOR'
      ? 'SENIOR'
      : requestedDivision === 'JUNIOR'
        ? 'JUNIOR'
        : ownDivision

  if (!canAccessAllDivisions && requested !== ownDivision) {
    throw new Error('无权访问其他学部的收费数据')
  }
  return requested
}
