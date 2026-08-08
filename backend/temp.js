const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shifts = await prisma.shift.findMany({ select: { id: true, openedAt: true, closedAt: true } });
  console.log(shifts);
}
main().finally(() => prisma.$disconnect());
