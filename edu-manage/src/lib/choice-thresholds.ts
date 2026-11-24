/** Keep small choice sets inline and expose search only when a list is long. */
export function shouldUseInlineChoices(optionCount: number): boolean {
  return Number.isFinite(optionCount) && optionCount > 0 && optionCount < 5
}

export function shouldSearchChoices(optionCount: number): boolean {
  return Number.isFinite(optionCount) && optionCount > 10
}
