import prisma from "../config/database/client";

async function main() {
  console.log('Starting migration of recipient data...');

  // Configure batch size
  const BATCH_SIZE = 50;

  // 1. Migrate RFQ
  console.log('\n--- Migrating RFQ Recipients ---');
  let rfqOffset = 0;
  let rfqMigrated = 0;
  while (true) {
    const rfqs = await prisma.rFQ.findMany({
      where: {
        recipientId: { not: null },
      },
      skip: rfqOffset,
      take: BATCH_SIZE,
      select: { id: true, recipientId: true },
    });
    
    if (rfqs.length === 0) break;

    for (const rfq of rfqs) {
      if (rfq.recipientId) {
        await prisma.rFQ.update({
          where: { id: rfq.id },
          data: {
            multipleRecipients: {
              connect: { id: rfq.recipientId },
            },
          },
        });
        rfqMigrated++;
      }
    }
    rfqOffset += BATCH_SIZE;
  }
  console.log(`Successfully migrated ${rfqMigrated} RFQ records.`);

  // 2. Migrate RFI
  console.log('\n--- Migrating RFI Recipients ---');
  let rfiOffset = 0;
  let rfiMigrated = 0;
  while (true) {
    const rfis = await prisma.rFI.findMany({
      where: {
        recepient_id: { not: null },
      },
      skip: rfiOffset,
      take: BATCH_SIZE,
      select: { id: true, recepient_id: true },
    });
    
    if (rfis.length === 0) break;

    for (const rfi of rfis) {
      if (rfi.recepient_id) {
        await prisma.rFI.update({
          where: { id: rfi.id },
          data: {
            multipleRecipients: {
              connect: { id: rfi.recepient_id },
            },
          },
        });
        rfiMigrated++;
      }
    }
    rfiOffset += BATCH_SIZE;
  }
  console.log(`Successfully migrated ${rfiMigrated} RFI records.`);

  // 3. Migrate Submittals
  console.log('\n--- Migrating Submittals Recipients ---');
  let submittalOffset = 0;
  let submittalMigrated = 0;
  while (true) {
    const submittals = await prisma.submittals.findMany({
      where: {
        recepient_id: { not: null },
      },
      skip: submittalOffset,
      take: BATCH_SIZE,
      select: { id: true, recepient_id: true },
    });
    
    if (submittals.length === 0) break;

    for (const submittal of submittals) {
      if (submittal.recepient_id) {
        await prisma.submittals.update({
          where: { id: submittal.id },
          data: {
            multipleRecipients: {
              connect: { id: submittal.recepient_id },
            },
          },
        });
        submittalMigrated++;
      }
    }
    submittalOffset += BATCH_SIZE;
  }
  console.log(`Successfully migrated ${submittalMigrated} Submittals records.`);

  // 4. Migrate ChangeOrder
  console.log('\n--- Migrating ChangeOrder Recipients ---');
  let coOffset = 0;
  let coMigrated = 0;
  while (true) {
    const changeOrders = await prisma.changeOrder.findMany({
      where: {
        recipients: { not: null },
      },
      skip: coOffset,
      take: BATCH_SIZE,
      select: { id: true, recipients: true },
    });
    
    if (changeOrders.length === 0) break;

    for (const co of changeOrders) {
      if (co.recipients) {
        await prisma.changeOrder.update({
          where: { id: co.id },
          data: {
            multipleRecipients: {
              connect: { id: co.recipients },
            },
          },
        });
        coMigrated++;
      }
    }
    coOffset += BATCH_SIZE;
  }
  console.log(`Successfully migrated ${coMigrated} ChangeOrder records.`);

  console.log('\nMigration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
