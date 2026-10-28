const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: 'wangqihan'
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      division: true,
      status: true,
      password: true
    }
  });
  console.log(users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
