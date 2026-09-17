import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const fab = await prisma.fabricator.findUnique({ where: { id: "86fa8268-e4d7-4e67-b6ab-a155bac89da0" }, select: { fabName: true } });
  console.log("real fabName in DB (should be unchanged):", JSON.stringify(fab?.fabName));
  await prisma.$disconnect();
})();
