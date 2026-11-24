/**
 * Add a short, readable ordinal only when two choices would otherwise have
 * exactly the same visible label. Never expose opaque record IDs as UI copy.
 */
export function distinctChoiceLabels<T extends { id: string }>(
  choices: readonly T[],
  getLabel: (choice: T) => string,
): Map<string, string> {
  const entries = choices.map((choice) => ({ choice, label: getLabel(choice).trim() }))
  const counts = new Map<string, number>()

  for (const entry of entries) {
    counts.set(entry.label, (counts.get(entry.label) || 0) + 1)
  }

  const ordinals = new Map<string, number>()
  return new Map(entries.map(({ choice, label }) => {
    if ((counts.get(label) || 0) < 2) return [choice.id, label]

    const ordinal = (ordinals.get(label) || 0) + 1
    ordinals.set(label, ordinal)
    return [choice.id, `${label} · 同名学员 ${ordinal}`]
  }))
}
