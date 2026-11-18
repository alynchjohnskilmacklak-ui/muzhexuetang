const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:edu_manage_test@localhost:5432/edu_manage' } } });
(async () => {
  const users = await p.user.findMany({ where: { email: { in: ['husitong@tea.com', 'mazichen@st.com'] } }, select: { email: true, password: true } });
  for (const u of users) {
    for (const pw of ['husitong', 'mazichen', 'ren031213', '123456']) {
      const ok = await bcrypt.compare(pw, u.password);
      if (ok) console.log(u.email, '-> password =', pw);
    }
  }
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
