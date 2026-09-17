import fs from "fs";
import { renderTableAsProse } from "./table-to-prose";

const data = JSON.parse(fs.readFileSync("/tmp/q6_probe_pool.json", "utf8"));
const targetId = data.targetId;
const target = data.candidates.find((c: any) => c.id === targetId);
console.log("=== original target text ===");
console.log(target.text);
console.log("\n=== prose-rendered target text ===");
const prose = renderTableAsProse(target.text);
console.log(prose);

const newCandidates = data.candidates.map((c: any) =>
  c.id === targetId ? { ...c, text: prose } : c
);
fs.writeFileSync("/tmp/q6_probe_pool_prose.json", JSON.stringify({ ...data, candidates: newCandidates }));
console.log("\nwrote /tmp/q6_probe_pool_prose.json");
