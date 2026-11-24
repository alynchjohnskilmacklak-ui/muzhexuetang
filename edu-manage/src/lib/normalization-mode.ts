export type NormalizationMode = 'dry-run' | 'apply'

export function getNormalizationMode(args: readonly string[]): NormalizationMode {
  const apply = args.includes('--apply')
  const dryRun = args.includes('--dry-run')

  if (apply && dryRun) {
    throw new Error('不能同时使用 --apply 和 --dry-run')
  }

  return apply ? 'apply' : 'dry-run'
}
