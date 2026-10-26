export type FeedbackNotificationStudent = {
  id: string
  name: string
  parentId: string | null
  parentUserId: string | null
}

/** A shared feedback record should create at most one inbox item per parent. */
export function groupFeedbackNotificationRecipients(students: FeedbackNotificationStudent[]) {
  const recipients = new Map<string, FeedbackNotificationStudent[]>()

  for (const student of students) {
    const parentUserId = student.parentId || student.parentUserId
    if (!parentUserId) continue
    const recipientStudents = recipients.get(parentUserId) || []
    recipientStudents.push(student)
    recipients.set(parentUserId, recipientStudents)
  }

  return [...recipients].map(([parentUserId, recipientStudents]) => ({ parentUserId, students: recipientStudents }))
}
