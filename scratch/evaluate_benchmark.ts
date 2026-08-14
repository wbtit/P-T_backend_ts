import prisma from "../src/config/database/client";
import { searchStandards } from "../src/modules/standards/services/retrievalService";
import fs from "fs";

interface EvalRecord {
  question: string;
  docKey: string;
  docId: string;
  correctPage: number;
  classification: string;
}

interface Metrics {
  total: number;
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  acceptedAt1: number;
}

function emptyMetrics(): Metrics {
  return { total: 0, recallAt1: 0, recallAt3: 0, recallAt5: 0, acceptedAt1: 0 };
}

async function run() {
  const data = JSON.parse(fs.readFileSync("docs/specs/eval-set.json", "utf-8"));
  const devSet: EvalRecord[] = data.dev.filter((d: any) => typeof d.question === 'string' && d.question.trim().length > 0);
  const holdoutSet: EvalRecord[] = data.holdout.filter((d: any) => typeof d.question === 'string' && d.question.trim().length > 0);
  const fullSet = [...devSet, ...holdoutSet];

  const regressionQueries = [
    { query: "column with cap plate", correctPages: [16, 17], docKey: 'GSMS' },
    { query: "column without cap plate", correctPages: [18], docKey: 'GSMS' },
    { query: "what is the c/c of the standard beam angles", correctPages: [11, 19], docKey: 'MM' },
    { query: "What sheet sizes should I use for detail drawings?", correctPages: [2], docKey: 'MM' },
    // Irrelevance queries
    { query: "how do I calibrate a marine GPS compass", correctPages: [], docKey: 'NONE' }
  ];

  // Pending evaluation (waiting for ACI ingestion)
  const pendingQueries = [
    { query: "minimum slab thickness", correctPages: [], docKey: 'ACI_PENDING' },
    { query: "constructor for minimum slab thickness", correctPages: [], docKey: 'ACI_PENDING' }
  ];

  // 1. Fetch project IDs from the database dynamically
  const docs = await prisma.standardDocument.findMany({
    where: { id: { in: [...new Set(fullSet.map((d: any) => d.docId))] } },
    select: { id: true, projectId: true, sourceType: true, pdfName: true }
  });
  const docInfoMap = Object.fromEntries(docs.map(d => [d.id, d]));

  // 2. Self-Check: Verify each document returns at least one chunk matching itself
  console.log("Running pre-evaluation self-check...");
  const uniqueDocIds = [...new Set(fullSet.map(d => d.docId))];
  const docHitCheck: Record<string, boolean> = {};

  for (const docId of uniqueDocIds) {
    docHitCheck[docId] = false;
    const queriesForDoc = fullSet.filter(d => d.docId === docId).slice(0, 5); // Check up to 5 queries
    const docInfo = docInfoMap[docId];
    if (!docInfo) {
      console.error(`\nCRITICAL ABORT: Document ${docId} missing from DB.`);
      process.exit(1);
    }
    for (const record of queriesForDoc) {
      // Exercise the same per-source path as production: never merge general+fabricator
      const results = await searchStandards({
        query: record.question,
        projectId: docInfo.projectId ?? '',
        threshold: 0.0,
        alpha: 0.05,
        acceptanceThreshold: 0.0
      });
      const candidates = docInfo.sourceType === 'GENERAL' ? results.general : results.fabricator;
      if (candidates.some(c => c.documentId === docId)) {
        docHitCheck[docId] = true;
        break;
      }
    }
    if (!docHitCheck[docId]) {
      console.error(`\nCRITICAL ABORT: Document ${docId} (${docInfo.pdfName}) contributed ZERO chunks across all sampled questions! Scope mismatch detected.`);
      process.exit(1);
    }
  }
  console.log("Self-check passed: All documents return self-hits.");

  async function evalSet(setName: string, set: EvalRecord[]) {
    console.log(`\n=== Evaluating ${setName} set (${set.length} queries) ===`);
    
    const byDoc: Record<string, Metrics> = {
      'GSMS': emptyMetrics(),
      'MM': emptyMetrics()
    };
    const byType: Record<string, Metrics> = {
      'PROSE': emptyMetrics(),
      'VISUAL': emptyMetrics()
    };
    const all = emptyMetrics();

    let i = 0;
    for (const record of set) {
      i++;
      if (i % 10 === 0) console.log(`  Progress: ${i} / ${set.length}`);
      
      const docInfo = docInfoMap[record.docId];
      const projectId = docInfo?.projectId || '';
      const sourceType = docInfo?.sourceType;
      
      const results = await searchStandards({
        query: record.question,
        projectId,
        threshold: 0.45,
        alpha: 0.05,
        acceptanceThreshold: 0.00
      });

      let candidates = sourceType === 'GENERAL' ? results.general : results.fabricator;
      candidates.sort((a, b) => b.similarity - a.similarity);

      const top1 = candidates[0];
      const top3 = candidates.slice(0, 3);
      const top5 = candidates.slice(0, 5);

      const floorCleared = top1 && top1.similarity >= 0.60;

      const inTop1 = floorCleared && top1.pageStart === record.correctPage && top1.documentId === record.docId;
      const inTop3 = floorCleared && top3.some(c => c.pageStart === record.correctPage && c.documentId === record.docId);
      const inTop5 = floorCleared && top5.some(c => c.pageStart === record.correctPage && c.documentId === record.docId);
      const accepted = floorCleared;

      const mDoc = byDoc[record.docKey];
      const mType = byType[record.classification] || (byType[record.classification] = emptyMetrics());

      all.total++;
      if (inTop1) all.recallAt1++;
      if (inTop3) all.recallAt3++;
      if (inTop5) all.recallAt5++;
      if (accepted) all.acceptedAt1++;

      mDoc.total++;
      if (inTop1) mDoc.recallAt1++;
      if (inTop3) mDoc.recallAt3++;
      if (inTop5) mDoc.recallAt5++;
      if (accepted) mDoc.acceptedAt1++;

      mType.total++;
      if (inTop1) mType.recallAt1++;
      if (inTop3) mType.recallAt3++;
      if (inTop5) mType.recallAt5++;
      if (accepted) mType.acceptedAt1++;
    }

    const printMetrics = (label: string, m: Metrics) => {
      if (m.total === 0) return;
      console.log(`[${label}] Total: ${m.total}`);
      console.log(`  Recall@3: ${(m.recallAt3 / m.total * 100).toFixed(1)}%`);
      console.log(`  Recall@5: ${(m.recallAt5 / m.total * 100).toFixed(1)}%`);
      console.log(`  Recall@1: ${(m.recallAt1 / m.total * 100).toFixed(1)}%`);
      console.log(`  Acceptance: ${(m.acceptedAt1 / m.total * 100).toFixed(1)}%`);
    };

    printMetrics('ALL', all);
    printMetrics('GSMS', byDoc['GSMS']);
    printMetrics('MM', byDoc['MM']);
    printMetrics('PROSE', byType['PROSE']);
    printMetrics('VISUAL', byType['VISUAL']);
  }

  await evalSet('DEV', devSet);
  await evalSet('HOLDOUT', holdoutSet);

  // Evaluate regression set
  console.log(`\n=== Evaluating REGRESSION set (${regressionQueries.length} queries) ===`);
  let fpCount = 0;
  let irrelevanceTotal = 0;
  
  // Need GSMS project ID for regressions
  const gsmsProjectId = docInfoMap['80cf6e98-5efc-44a1-adc0-9e2b9445dd9d']?.projectId || '';
  
  for (const record of regressionQueries) {
    if (record.correctPages.length === 0) {
      irrelevanceTotal++;
      // Use per-source path matching production: GSMS is FABRICATOR scope
      const results = await searchStandards({
        query: record.query,
        projectId: gsmsProjectId,
        threshold: 0.45,
        alpha: 0.05,
        acceptanceThreshold: 0.0 // Production applies floor itself on the sorted list
      });
      // Check each source independently (production behavior)
      const fabricatorTop1 = results.fabricator[0];
      const generalTop1 = results.general[0];
      const fabricatorAccepted = fabricatorTop1 && fabricatorTop1.similarity >= 0.60;
      const generalAccepted = generalTop1 && generalTop1.similarity >= 0.60;
      if (fabricatorAccepted || generalAccepted) {
        fpCount++;
      }
    }
  }
  if (irrelevanceTotal > 0) {
    console.log(`[IRRELEVANCE] False Positive Rate: ${(fpCount / irrelevanceTotal * 100).toFixed(1)}% (${fpCount}/${irrelevanceTotal})`);
  }
}

run().catch(console.error).finally(() => process.exit(0));
