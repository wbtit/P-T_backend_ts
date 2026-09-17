import { askStandards } from "../src/modules/standards/services/chatService";
(async () => {
  const result = await askStandards("5fa52afe-103f-4efc-afbd-23b7c6d2094d", "What is the standard bolt hole diameter for a 3/4 inch diameter bolt according to Table J3.3?");
  const a = result.answers[0];
  console.log("sourceType:", a?.sourceType, "chunkType:", a?.chunkType, "failReason:", a?.generationFailureReason);
  console.log("answerText:", a?.answerText);
  console.log("citations:", a?.citations.map((c: any) => ({ pdf: c.citationPdfName, page: c.citationPageStart })));
  process.exit(0);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
