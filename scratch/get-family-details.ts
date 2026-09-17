import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const IDS = ["HILTI-ER-2001","CANAM-JC-42","NMBS-JC-2007","NMBS-PSG","SJI-SPT-1926","SJI-DG-2014","SJI-COSP-2012","SJI-TCW-2004","NASCC-SHP-2007","UFP-OJ-2009","TJI-SG-4000","WIB-JS-GPI"];
(async () => {
  const families = await prisma.standardFamily.findMany({ where: { id: { in: IDS } } });
  for (const f of families) console.log(`${f.id} | familyCode=${f.familyCode} | edition=${f.edition}`);
  await prisma.$disconnect();
})();
