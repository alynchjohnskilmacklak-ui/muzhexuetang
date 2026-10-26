const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const u = await prisma.user.findUnique({ where: { email: 'mazichen@st.com' } });
  console.log('user:', u.email, 'role:', u.role, 'pwlen:', u.password.length, 'prefix:', u.password.slice(0, 7));
  console.log('compare mazichen:', await bcrypt.compare('mazichen', u.password));
  await prisma.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
