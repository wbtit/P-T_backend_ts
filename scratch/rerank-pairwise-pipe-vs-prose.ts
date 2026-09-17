import fs from "fs";
import prisma from "../src/config/database/client";
import { renderTableAsProse } from "./table-to-prose";

const TARGETS = [
  { q: "What is the standard hole size for a 3/4 inch bolt?", id: "7b15f50c-eff6-480e-a0f2-a71ed3255c39", note: "Q6 J3.3" },
  { q: "What is the area of a W44x335?", id: "6e3bf191-1f62-428e-8fcc-0ee1f9942136", note: "Q10 W44x335" },
  { q: "What is the design flexural strength of a W12x65?", id: "e2a5c891-67bb-43c7-993f-ed0e06f1f951", note: "Q11 W12x65" },
  { q: "What nominal anchor diameters are covered for Kwik Bolt TZ expansion anchors?", id: "b2fab378-4188-4ce2-ac15-a66f9a0f2a2a", note: "Q21 EA design info" },
];

async function main() {
  const out: any[] = [];
  for (const t of TARGETS) {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT text_content FROM standard_chunks WHERE id=$1::uuid`, t.id
    );
    const raw = rows[0].text_content as string;
    const prose = renderTableAsProse(raw);
    out.push({ ...t, pipeText: raw, proseText: prose });
  }
  fs.writeFileSync("/tmp/pipe_vs_prose_probe.json", JSON.stringify(out));
  console.log("wrote /tmp/pipe_vs_prose_probe.json");
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
