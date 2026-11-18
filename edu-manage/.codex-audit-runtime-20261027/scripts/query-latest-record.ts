import { prisma } from '../src/lib/prisma'

async function main() {
  const latestLog = await prisma.activityLog.findFirst({
    orderBy: { createdAt: 'desc' }
  })
  console.log('--- Latest Activity Log ---')
  console.log(JSON.stringify(latestLog, null, 2))

  const latestDeleted = await prisma.deletedRecord.findFirst({
    orderBy: { createdAt: 'desc' }
  })
  console.log('--- Latest Deleted Record ---')
  console.log(JSON.stringify(latestDeleted, null, 2))
  
  const latestFeedback = await prisma.classroomFeedback.findFirst({
    orderBy: { createdAt: 'desc' }
  })
  console.log('--- Latest Classroom Feedback ---')
  console.log(JSON.stringify(latestFeedback, null, 2))
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
