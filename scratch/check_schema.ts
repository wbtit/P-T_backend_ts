import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ans1 = await prisma.$queryRawUnsafe(`
    SELECT column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'standard_chat_answers' AND column_name = 'pinned_document_id';
  `);
  console.log('1. pinned_document_id:', ans1);

  const ans2 = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) FROM standard_chat_answers WHERE pinned_document_id IS NULL;
  `);
  console.log('2. NULL count:', ans2);

  const ans3 = await prisma.$queryRawUnsafe(`
    SELECT column_name, is_nullable, column_default, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Invoice' AND column_name = 'clientId';
  `);
  console.log('3. Invoice.clientId:', ans3);
}

main().finally(() => prisma.$disconnect());
