import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const inactiveStudents = await prisma.student.updateMany({
    where: { status: 'INACTIVE' },
    data: { mainTeacherId: null },
  })

  const withdrawnInactiveStudentEnrollments = await prisma.enrollment.updateMany({
    where: { status: 'ACTIVE', student: { status: 'INACTIVE' } },
    data: { status: 'WITHDRAWN' },
  })

  const withdrawnInvalidGroupEnrollments = await prisma.enrollment.updateMany({
    where: {
      status: 'ACTIVE',
      group: {
        OR: [
          { status: 'ARCHIVED' },
          { course: { isActive: false } },
        ],
      },
    },
    data: { status: 'WITHDRAWN' },
  })

  const removedInactiveScheduleStudents = await prisma.scheduleStudent.deleteMany({
    where: { student: { status: 'INACTIVE' } },
  })

  const cancelledInvalidCourseSchedules = await prisma.schedule.updateMany({
    where: {
      status: { not: 'cancelled' },
      course: { isActive: false },
    },
    data: { status: 'cancelled' },
  })

  const cancelledInvalidLessons = await prisma.classLesson.updateMany({
    where: {
      status: { notIn: ['CANCELLED', 'COMPLETED'] },
      group: {
        OR: [
          { status: 'ARCHIVED' },
          { course: { isActive: false } },
        ],
      },
    },
    data: { status: 'CANCELLED' },
  })

  const cancelledInvalidMakeups = await prisma.makeupRequest.updateMany({
    where: {
      status: { in: ['PENDING', 'ARRANGED'] },
      OR: [
        { student: { status: 'INACTIVE' } },
        {
          attendance: {
            lesson: {
              group: {
                OR: [
                  { status: 'ARCHIVED' },
                  { course: { isActive: false } },
                ],
              },
            },
          },
        },
      ],
    },
    data: { status: 'CANCELLED' },
  })

  const deactivatedOrphanCourses = await prisma.course.updateMany({
    where: {
      isActive: true,
      classGroups: { none: { status: { not: 'ARCHIVED' } } },
      schedules: { none: { status: { not: 'cancelled' } } },
    },
    data: { isActive: false },
  })

  console.log({
    inactiveStudents: inactiveStudents.count,
    withdrawnInactiveStudentEnrollments: withdrawnInactiveStudentEnrollments.count,
    withdrawnInvalidGroupEnrollments: withdrawnInvalidGroupEnrollments.count,
    removedInactiveScheduleStudents: removedInactiveScheduleStudents.count,
    cancelledInvalidCourseSchedules: cancelledInvalidCourseSchedules.count,
    cancelledInvalidLessons: cancelledInvalidLessons.count,
    cancelledInvalidMakeups: cancelledInvalidMakeups.count,
    deactivatedOrphanCourses: deactivatedOrphanCourses.count,
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
