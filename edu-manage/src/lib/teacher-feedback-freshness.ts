type StudentPerformanceHistory = {
  id: string
  performancePosts: Array<{
    createdAt: Date
  }>
}

type PublishedClassroomFeedback = {
  studentIds: string[]
  createdAt: Date
}

function laterDate(current: Date | undefined, candidate: Date) {
  return !current || candidate.getTime() > current.getTime() ? candidate : current
}

export function buildLatestFeedbackDateByStudent(
  students: StudentPerformanceHistory[],
  classroomFeedbacks: PublishedClassroomFeedback[],
) {
  const latestByStudent = new Map<string, Date>()

  for (const student of students) {
    const latestPerformancePost = student.performancePosts[0]?.createdAt
    if (latestPerformancePost) {
      latestByStudent.set(student.id, latestPerformancePost)
    }
  }

  for (const feedback of classroomFeedbacks) {
    for (const studentId of feedback.studentIds) {
      latestByStudent.set(
        studentId,
        laterDate(latestByStudent.get(studentId), feedback.createdAt),
      )
    }
  }

  return latestByStudent
}
