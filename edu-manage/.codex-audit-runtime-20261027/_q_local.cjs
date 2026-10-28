// 查本地测试 DB：家长可见的反馈
const { Client } = require('pg')
async function main() {
  const c = new Client({ host: 'localhost', port: 5432, database: 'edu_manage', user: 'postgres', password: 'edu_manage_test' })
  await c.connect()
  const st = await c.query(`SELECT id, name, grade FROM "Student" WHERE name IN ('牛博研','马子墨','孙嘉森') LIMIT 10`)
  console.log('students:', JSON.stringify(st.rows))
  const fb = await c.query(`SELECT COUNT(*)::int AS n FROM "ClassroomFeedback"`)
  console.log('feedback count:', fb.rows[0].n)
  const gp = await c.query(`SELECT COUNT(*)::int AS n FROM "ClassGroup"`)
  console.log('groups:', gp.rows[0].n)
  const ls = await c.query(`SELECT COUNT(*)::int AS n FROM "ClassLesson"`)
  console.log('lessons:', ls.rows[0].n)
  await c.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
