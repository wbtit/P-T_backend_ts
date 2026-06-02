import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Fetch all RFQs where bidPrice string exists but bidPriceDecimal is not yet set
  const rfqs = await prisma.rFQ.findMany({
    where: {
      bidPrice: { not: null },
      bidPriceDecimal: null
    },
    select: { id: true, bidPrice: true }
  })

  console.log(`Found ${rfqs.length} RFQs to migrate`)

  let success = 0
  let skipped = 0

  for (const rfq of rfqs) {
    // Strip everything except digits and decimal point
    const cleaned = rfq.bidPrice?.replace(/[^0-9.]/g, '').trim()

    if (!cleaned || cleaned === '') {
      console.warn(`Skipping RFQ ${rfq.id} — bidPrice "${rfq.bidPrice}" could not be parsed`)
      skipped++
      continue
    }

    const parsed = parseFloat(cleaned)

    if (isNaN(parsed)) {
      console.warn(`Skipping RFQ ${rfq.id} — parsed NaN from "${rfq.bidPrice}"`)
      skipped++
      continue
    }

    await prisma.rFQ.update({
      where: { id: rfq.id },
      data: { bidPriceDecimal: new Prisma.Decimal(parsed) }
    })
    success++
  }

  console.log(`Migration complete. Success: ${success}, Skipped: ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
