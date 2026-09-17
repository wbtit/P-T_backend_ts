import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
(async () => {
  const cols = await prisma.$queryRawUnsafe<any[]>(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'standard_pages' AND column_name IN ('hyperlinks', 'page_description')
    ORDER BY column_name
  `);
  console.log(JSON.stringify(cols, null, 2));
  await prisma.$disconnect();
})();
