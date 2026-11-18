const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:edu_manage_test@localhost:5432/edu_manage' } } });
p.user.findMany({
  where: { email: { in: ['mazichen@st.com', 'husitong@tea.com', 'renwentao@nuc.com'] } },
  select: { email: true, name: true, role: true, teacherId: true, password: true },
}).then(rs => {
  console.log(JSON.stringify(rs, null, 1));
  return p.$disconnect();
}).catch(e => {
  console.error('ERR', e.message);
  process.exit(1);
});
