const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const rows = [
    ['renwentao@nuc.com', 'ren031213'],
    ['husitong@tea.com', 'husitong'],
    ['mazichen@st.com', 'mazichen'],
  ];
  for (const [email, pw] of rows) {
    const hash = await bcrypt.hash(pw, 10);
    await prisma.user.update({ where: { email }, data: { password: hash } });
    console.log('reset', email);
  }
  await prisma.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
