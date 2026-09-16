import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const OLD_IDS = [
  "7741f778-ecec-413f-adcd-68e86c647918",
  "6cad2d13-8e75-48aa-972c-dbc5c4169fa0",
  "a94e9d98-df3c-46c9-b3c2-54e83a9ddb3d",
  "f2258c80-ba9b-4c99-823e-189a4a605ec9",
  "17affb6d-7b66-44ef-8910-c658538c55f7",
  "7f717ea4-8d46-4069-adcb-4366c69ef7cb",
  "b2e93703-e8fa-43d5-8756-678cf3c063ad",
  "e9398bbb-b09e-42d3-92f7-b28b34780890",
  "8737bbaa-5d61-4f03-9da7-20746751617f",
  "4278c9bc-f65a-49d0-8544-67320b827ed3",
  "ed9e8a51-f257-464d-b1f1-0391e897689d",
  "091a190c-a108-46b8-9aac-0822bb5ca341",
];
const FAMILIES = ["SJI-TCW-2004","NMBS-PSG","UFP-OJ-2009","SJI-SPT-1926","HILTI-ER-2001","NASCC-SHP-2007","SJI-DG-2014","WIB-JS-GPI","TJI-SG-4000","SJI-COSP-2012","CANAM-JC-42","NMBS-JC-2007"];

(async () => {
  console.log("=== old docs status (all should be SUPERSEDED) ===");
  const oldDocs = await prisma.standardDocument.findMany({ where: { id: { in: OLD_IDS } }, select: { id: true, pdfName: true, status: true } });
  for (const d of oldDocs) console.log(`${d.status === "SUPERSEDED" ? "OK" : "*** NOT SUPERSEDED ***"} | ${d.id} | ${d.pdfName} | ${d.status}`);

  console.log("\n=== per-family ACTIVE count (should be exactly 1 each, no duplicates) ===");
  for (const fam of FAMILIES) {
    const activeInFamily = await prisma.standardDocument.findMany({ where: { documentFamilyId: fam, status: "ACTIVE" }, select: { id: true, pdfName: true } });
    console.log(`${fam}: ${activeInFamily.length} ACTIVE ${activeInFamily.length === 1 ? "OK" : "*** UNEXPECTED ***"} -- ${JSON.stringify(activeInFamily)}`);
  }

  console.log("\n=== overall counts ===");
  const total = await prisma.standardDocument.count();
  const active = await prisma.standardDocument.count({ where: { status: "ACTIVE" } });
  const pending = await prisma.standardDocument.count({ where: { status: "PENDING" } });
  const superseded = await prisma.standardDocument.count({ where: { status: "SUPERSEDED" } });
  console.log(`total=${total} active=${active} pending=${pending} superseded=${superseded}`);

  await prisma.$disconnect();
})();
