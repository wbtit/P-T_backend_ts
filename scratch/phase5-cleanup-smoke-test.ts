import { searchStandards } from "../src/modules/standards/services/retrievalService";
(async () => {
  const r = await searchStandards({
    query: "steel joist standard specifications",
    projectId: "5fa52afe-103f-4efc-afbd-23b7c6d2094d", // Nabers (Cobb fabricator)
    threshold: 0.3,
    acceptanceThreshold: 0.0,
  });
  console.log("general hits:", r.general?.length ?? null);
  console.log("fabricator hits:", r.fabricator?.length ?? null);
  console.log("response keys:", Object.keys(r));
  process.exit(0);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
