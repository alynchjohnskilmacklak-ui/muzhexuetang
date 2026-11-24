type ParentFeedbackReadReceipt = {
  read: boolean
  readAt: Date | null
  createdAt: Date
}

/** Resolve read state only from this parent's receipts; never inherit another parent's legacy state. */
export function resolveParentFeedbackReadAt(
  _legacyReadAt: Date | null | undefined,
  receipts: ParentFeedbackReadReceipt[],
) {
  if (receipts.length === 0) return null
  if (receipts.some((receipt) => !receipt.read)) return null

  return receipts.reduce<Date | null>((latest, receipt) => {
    const readAt = receipt.readAt || receipt.createdAt
    return !latest || readAt > latest ? readAt : latest
  }, null)
}

export function projectParentFeedbackReadState<T extends { parentReadAt?: Date | null }>(
  feedback: T,
  receipts: ParentFeedbackReadReceipt[],
): T & { parentReadAt: Date | null } {
  return {
    ...feedback,
    parentReadAt: resolveParentFeedbackReadAt(feedback.parentReadAt, receipts),
  }
}
