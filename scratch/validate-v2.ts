import prisma from "../src/config/database/client";
import { renderTableForRerank } from "./table-to-prose-check";

const AISC_IDS = [
  { id: "6e3bf191-1f62-428e-8fcc-0ee1f9942136", note: "AISC W44x335 (Q10 target)" },
  { id: "271e4ebc-50a5-48e9-81fa-c9b4406152f6", note: "AISC W24x370 (Q9/20 target)" },
  { id: "e2a5c891-67bb-43c7-993f-ed0e06f1f951", note: "AISC W12x65 (Q11 target)" },
  { id: "7b15f50c-eff6-480e-a0f2-a71ed3255c39", note: "AISC J3.3 (Q6 target)" },
  { id: "f6596568", note: "AISC Table 1-13 cont p109 HSS" },
  { id: "23dfcdc1", note: "AISC Table 3-6 cont p260" },
  { id: "052646d5", note: "AISC Table 4-13 cont p642 (OCR-scrambled, expect fallback)" },
  { id: "f1ccc3ce", note: "AISC p1067 formula table" },
  { id: "38293302", note: "AISC TABLE J3.2 p1637 (previously misattributed)" },
  { id: "023096eb", note: "AISC Table 17-7 cont p2268" },
  { id: "1d29dc29", note: "AISC Table 6-1 cont p827" },
  { id: "bb30c19a", note: "AISC Table 7-6 cont p926" },
  { id: "91a30081", note: "AISC Table 9-2 cont p1134" },
];
const SJI_IDS = [
  { id: "3f26066b", note: "SJI p17 weld table (previously empty)" },
  { id: "ab02970f", note: "SJI p65 K-series load table (previously empty)" },
  { id: "9334acd0", note: "SJI p135 garbled OCR title (previously near-empty)" },
  { id: "ce1fbfa8", note: "SJI p164 garbled multi-level header" },
  { id: "4cd7ea16", note: "SJI p177 another garbled multi-level header" },
  { id: "461b9a47", note: "SJI p200 K/LH/DLH bolt sizes (previously empty)" },
  { id: "0a8ec5b0", note: "SJI p238 max joist spacing bridging (previously empty)" },
  { id: "a25cc34c", note: "SJI p82 top chord extension load table" },
  { id: "7464fcca", note: "SJI p117 LH-series standard load table" },
];
const EA_IDS = [
  { id: "f9c4ff7d-cff8-4d33-89ac-f1b115ae1ff8", note: "EA p5 setting info" },
  { id: "b2fab378-4188-4ce2-ac15-a66f9a0f2a2a", note: "EA p6 design info (Q21 target)" },
  { id: "cad3960b-a752-4c0e-a561-e6cc288ac083", note: "EA p7 design info" },
  { id: "34633786-ec0b-4b8f-af94-8c8d0bb553ab", note: "EA p8 concrete condition" },
  { id: "132bc289-cfda-4724-a46b-1a11dafaaaed", note: "EA p9 embedment/concrete strength" },
  { id: "cf07dea4-5b31-4866-a8ca-abbfd9d160c0", note: "EA p9 embedment/concrete strength (2)" },
  { id: "a2329c2a-333e-4772-8fd5-9dbae3f453a5", note: "EA p9 strength reduction factors" },
  { id: "bef07da3-d391-4b35-8250-73893985c3fb", note: "EA p10 embedment/concrete strength" },
  { id: "119ca785-98b0-4a7c-bb92-28ba65c21595", note: "EA p10 seismic shear capacity" },
  { id: "482f9f24-0ebb-4382-aa83-b8ad607f3aec", note: "EA p10 static shear capacity" },
  { id: "1ae30930-b833-4ecd-9752-108203dcb7e5", note: "EA p11 embedment/tension" },
  { id: "49a89a58-afdc-45cf-ab05-d2190cf280b7", note: "EA p11 bolt ID marking A-W (previously silent row drop)" },
  { id: "973255bc-d30f-4cb2-9ad6-07fa3f9e633b", note: "EA p12" },
];
const SAMPLE = [...AISC_IDS, ...SJI_IDS, ...EA_IDS];

async function main() {
  const all: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, text_content FROM standard_chunks WHERE chunk_type='TABLE' AND parent_chunk_id IS NULL`
  );
  const byPrefix = new Map<string, any>();
  for (const r of all) byPrefix.set(r.id.slice(0,8), r);

  let fallbackCount = 0, passCount = 0;
  console.log(`${"note".padEnd(58)} ${"verdict".padEnd(10)} ${"expMin".padEnd(7)} ${"sent".padEnd(5)} emptySubj`);
  for (const s of SAMPLE) {
    const row = s.id.length === 36 ? all.find(r => r.id === s.id) : byPrefix.get(s.id);
    if (!row) { console.log(`${s.note.padEnd(58)} NOT FOUND`); continue; }
    const r = renderTableForRerank(row.text_content);
    if (r.usedFallback) fallbackCount++; else passCount++;
    const verdict = r.usedFallback ? "FALLBACK" : "PROSE-OK";
    console.log(`${s.note.padEnd(58)} ${verdict.padEnd(10)} ${String(r.expectedDataLines).padEnd(7)} ${String(r.sentencesEmitted).padEnd(5)} ${r.emptySubjectCount}`);
    if (r.usedFallback) console.log(`    -> ${r.fallbackReason}`);
  }
  console.log(`\nTotal: ${SAMPLE.length}  PROSE-OK: ${passCount}  FALLBACK: ${fallbackCount}`);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
