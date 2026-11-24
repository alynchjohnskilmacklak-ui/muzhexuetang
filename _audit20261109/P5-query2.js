/* P5 只读审计 第二轮：脱节通知细分 / Fee / 权益配置 / 消息已读 / 志愿咨询。仅 SELECT。 */
const fs = require('fs')
const { PrismaClient } = require('D:/01muzhexuetang/muzhexuetang/coding/edu-manage/node_modules/@prisma/client')

const env = Object.fromEntries(
  fs.readFileSync('D:/01muzhexuetang/muzhexuetang/coding/edu-manage/.env', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } })
const q = (sql) => prisma.$queryRawUnsafe(sql)
const bi = (k, v) => (typeof v === 'bigint' ? Number(v) : v)
const show = async (label, sql) => {
  const rows = await q(sql)
  console.log('\n=== ' + label + ' ===')
  console.log(JSON.stringify(rows, bi, 2))
}

(async () => {
  await show('Q3 脱节 ACTIVE 家长通知细分（对齐 parentLinkedStudentWhere：status<>INACTIVE 且 deletedAt null）', `
    SELECT COUNT(*)::int orphan_active,
           COUNT(*) FILTER (WHERE NOT n.read)::int orphan_unread,
           COUNT(*) FILTER (WHERE s.id IS NULL)::int student_missing,
           COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s."deletedAt" IS NOT NULL)::int student_deleted,
           COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status='INACTIVE')::int student_inactive,
           COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status<>'INACTIVE'
             AND COALESCE(s."parentId",s."parentUserId") IS NULL)::int student_unlinked,
           COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status<>'INACTIVE'
             AND COALESCE(s."parentId",s."parentUserId") IS NOT NULL
             AND COALESCE(s."parentId",s."parentUserId") <> n."userId")::int student_bound_other_parent
    FROM "Notification" n
    JOIN "User" u ON u.id=n."userId"
    LEFT JOIN "Student" s ON s.id=n."studentId"
    WHERE u.role='parent' AND n.status='ACTIVE' AND n."studentId" IS NOT NULL
      AND NOT (s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status<>'INACTIVE'
               AND COALESCE(s."parentId",s."parentUserId")=n."userId")`)

  await show('Q3b 脱节通知明细（前 20）', `
    SELECT n.id, n."userId", n."studentId", n.type, n."relatedType", n.read, s.status student_status,
           COALESCE(s."parentId",s."parentUserId") bound_parent,
           LEFT(n.title,30) title
    FROM "Notification" n
    JOIN "User" u ON u.id=n."userId"
    LEFT JOIN "Student" s ON s.id=n."studentId"
    WHERE u.role='parent' AND n.status='ACTIVE' AND n."studentId" IS NOT NULL
      AND NOT (s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status<>'INACTIVE'
               AND COALESCE(s."parentId",s."parentUserId")=n."userId")
    ORDER BY n."createdAt" DESC LIMIT 20`)

  await show('Q3c 无 studentId 的家长通知（通用通知）数量', `
    SELECT COUNT(*)::int general_notifications,
           COUNT(*) FILTER (WHERE NOT n.read)::int general_unread
    FROM "Notification" n JOIN "User" u ON u.id=n."userId"
    WHERE u.role='parent' AND n.status='ACTIVE' AND n."studentId" IS NULL`)

  await show('Q4 Fee 行数 / 状态 / 金额合计', `
    SELECT COALESCE(status,'NULL') status, COUNT(*)::int cnt,
           COALESCE(SUM(amount),0)::float8 total_amount,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL)::int deleted
    FROM "Fee" GROUP BY 1 ORDER BY 1`)

  await show('Q5 SystemConfig.membershipBenefits 是否有值', `
    SELECT id,
           "membershipBenefits" IS NULL AS is_null,
           TRIM(COALESCE("membershipBenefits",''))='' AS is_empty,
           LENGTH(COALESCE("membershipBenefits",'')) AS length
    FROM "SystemConfig" WHERE id='singleton'`)

  await show('Q6 ParentMessage 行数 / 状态', `
    SELECT COALESCE(status,'NULL') status, COUNT(*)::int cnt,
           COUNT(*) FILTER (WHERE "teacherId" IS NOT NULL)::int with_teacher
    FROM "ParentMessage" GROUP BY 1 ORDER BY 1`)

  await show('Q6b ParentMessageReply 已读字段分布', `
    SELECT role,
           COUNT(*)::int total,
           COUNT(*) FILTER (WHERE "isReadByParent")::int read_parent,
           COUNT(*) FILTER (WHERE NOT "isReadByParent")::int unread_parent,
           COUNT(*) FILTER (WHERE "isReadByTeacher")::int read_teacher,
           COUNT(*) FILTER (WHERE NOT "isReadByTeacher")::int unread_teacher
    FROM "ParentMessageReply" GROUP BY 1 ORDER BY 1`)

  await show('Q6c 家长发出但教师未读的回复（教师侧待处理）', `
    SELECT COUNT(*)::int parent_replies_unread_by_teacher
    FROM "ParentMessageReply" WHERE role='parent' AND NOT "isReadByTeacher"`)

  await show('Q7 VolunteerConsultation 行数 / 回复状态', `
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE "isReplied")::int replied,
           COUNT(*) FILTER (WHERE NOT "isReplied")::int pending,
           COUNT(DISTINCT "parentId")::int parents
    FROM "VolunteerConsultation"`)

  await show('Q8 家长账号数 / 当前绑定学员数', `
    SELECT COUNT(*) FILTER (WHERE u.role='parent')::int parent_users,
           COUNT(DISTINCT s.id)::int linked_students
    FROM "User" u
    LEFT JOIN "Student" s ON COALESCE(s."parentId",s."parentUserId")=u.id AND s."deletedAt" IS NULL
    WHERE u.role='parent'`)

  await prisma.$disconnect()
})().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
