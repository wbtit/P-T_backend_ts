import { askStandards } from "../src/modules/standards/services/chatService";
import prisma from "../src/config/database/client";

async function show(projectId: string, label: string, query: string) {
  const result = await askStandards(projectId, query);
  const a = result.answers[0];
  console.log(`\n=== ${label} :: "${query}" ===`);
  console.log("sourceType:", a?.sourceType, "chunkType:", a?.chunkType, "generationFailureReason:", a?.generationFailureReason);
  console.log("answerText:", (a?.answerText ?? "").slice(0, 150));
  console.log("citations:", a?.citations.map((c: any) => ({ pdf: c.citationPdfName, page: c.citationPageStart, chunkType: c.chunkType })));
}

async function main() {
  await show("5fa52afe-103f-4efc-afbd-23b7c6d2094d", "Nabers (Cobb fabricator)", "What is the standard hole diameter for a 3/4 inch bolt?");
  await show("3200a4a9-e657-49ac-8b4c-f39b8b00dc6b", "Ray Steel Project", "What is the standard hole diameter for a 3/4 inch bolt?");
  process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e.message, e.stack); process.exit(1); });
