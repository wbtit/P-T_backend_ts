import fs from "fs";
import { gradeRetrieval, AMBIGUOUS_GAP_THRESHOLD } from "../src/modules/standards/services/cragEvaluator";

const results: any[] = JSON.parse(fs.readFileSync("/tmp/gap_full22_results.json", "utf8"));

// Known-correct expectation, from the ground-truth work done this session --
// used only to check whether CRAG's grade was the right call, not fed into grading itself.
const EXPECT: Record<number, string> = {
  12: "should grade AMBIGUOUS (confirmed same-topic crowding)",
  16: "should grade AMBIGUOUS (confirmed same-topic crowding)",
  23: "should grade CONFIDENT and pass through wrong (known, accepted CONFIDENT-WRONG gap)",
};

console.log(`AMBIGUOUS_GAP_THRESHOLD = ${AMBIGUOUS_GAP_THRESHOLD}\n`);
console.log(`${"Q".padEnd(3)} ${"gap".padEnd(8)} ${"grade".padEnd(10)} ${"gate".padEnd(6)} note`);

let ambiguousCorrect = 0, ambiguousTotal = 0;

for (const r of results) {
  const pool = [{ score: r.rank1_score }, { score: r.rank2_score }];
  const g = gradeRetrieval(pool, { queryId: r.id, queryText: `Q${r.id}` });
  const gate = r.post_rank !== null && r.post_rank <= 5 ? "PASS" : "FAIL";
  const note = EXPECT[r.id] ?? "";
  console.log(`${String(r.id).padEnd(3)} ${g.gap!.toFixed(4).padEnd(8)} ${g.grade.padEnd(10)} ${gate.padEnd(6)} ${note}`);

  if (r.id === 12 || r.id === 16) {
    ambiguousTotal++;
    if (g.grade === "AMBIGUOUS") ambiguousCorrect++;
  }
  if (r.id === 23) {
    console.log(`    -> Q23 confirmation: grade=${g.grade} (expected CONFIDENT, known accepted gap, not fixed here)`);
  }
}

console.log(`\nQ12/Q16 correctly graded AMBIGUOUS: ${ambiguousCorrect}/${ambiguousTotal}`);
console.log(`log file: logs/crag_grades.ndjson`);
process.exit(0);
