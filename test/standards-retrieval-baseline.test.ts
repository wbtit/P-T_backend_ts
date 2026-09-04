import fs from "fs";
import path from "path";
import prisma from "../src/config/database/client";
import { searchStandards } from "../src/modules/standards/services/retrievalService";

const documents = {
  "GSMS": "80cf6e98-5efc-44a1-adc0-9e2b9445dd9d",
  "MM": "0207eb4a-aa94-4ae0-8fd5-dd13d5ec2ab1"
};

const PROJECT_IDS = {
  "GSMS": "73436d64-7a43-4c69-8618-78a7d0b2da49",
  "MM": "da65231b-60a3-4ef5-b2cd-4feead1d29bd" // Assuming this is MM's project
};

type EvalCase = {
  query: string;
  docKey: keyof typeof documents;
  expectedPages: number[];
};

const evalCases: EvalCase[] = [
  { query: "column with cap plate", docKey: "GSMS", expectedPages: [16, 17] },
  { query: "column without cap plate", docKey: "GSMS", expectedPages: [18] },
  { query: "what is the c/c of the standard beam angles", docKey: "GSMS", expectedPages: [12, 13, 14, 15] },
  { query: "What sheet sizes should I use for detail drawings?", docKey: "MM", expectedPages: [2] },
  // Pending evaluation (waiting for ACI ingestion)
  // { query: "minimum slab thickness", docKey: "ACI", expectedPages: [] },
  // { query: "constructor for minimum slab thickness", docKey: "ACI", expectedPages: [] },
  { query: "how do I calibrate a marine GPS compass", docKey: "GSMS", expectedPages: [] },
  { query: "should drawing submittals be sent as one combined file or separately", docKey: "GSMS", expectedPages: [2] },
  { query: "do i need to provide gather sheets for plates with holes", docKey: "GSMS", expectedPages: [2] },
  { query: "what CNC files do you need for beams and plates", docKey: "GSMS", expectedPages: [2] },
  { query: "send drawing submittals as individual files", docKey: "GSMS", expectedPages: [2] },
  { query: "do I need to provide gather sheets", docKey: "GSMS", expectedPages: [2] }
];

const alphas = [0, 0.02, 0.05, 0.10, 0.15, 0.20];

describe("Phase 10 Retrieval Tuning Harness", () => {
  jest.setTimeout(300_000); // 5 mins

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("tunes alpha and writes baseline", async () => {
    const resultsOut: any = {};
    
    for (const alpha of alphas) {
      console.log(`\n============================`);
      console.log(`=== RUNNING ALPHA = ${alpha.toFixed(2)} ===`);
      console.log(`============================\n`);
      
      const alphaResults: any[] = [];
      
      for (const testCase of evalCases) {
        // Run full retrieval pipeline
        const resp = await searchStandards({
          query: testCase.query,
          projectId: PROJECT_IDS[testCase.docKey],
          threshold: 0.45,
          acceptanceThreshold: 0.60,
          alpha
        });
        
        // Find which array has our chunks (GSMS -> FABRICATOR for this project, MM is likely GENERAL if not uploaded to this project. We'll just merge both for testing)
        let candidates = [...(resp.general || []), ...(resp.fabricator || []), ...(resp.project || [])];
        // Filter out anchors, we just want direct hits
        candidates = candidates.filter(c => !c.isAnchor);
        // Ensure they belong to the correct document
        const targetDocId = documents[testCase.docKey];
        candidates = candidates.filter(c => c.documentId === targetDocId);
        
        // Re-sort just in case
        candidates.sort((a, b) => b.similarity - a.similarity);
        
        const topHit = candidates[0];
        const passed = testCase.expectedPages.length > 0 
          ? (topHit ? testCase.expectedPages.includes(topHit.pageStart) : false)
          : (!topHit);
          
        let expectedRank = -1;
        for (let i = 0; i < candidates.length; i++) {
          if (testCase.expectedPages.includes(candidates[i].pageStart)) {
            expectedRank = i + 1;
            break;
          }
        }
          
        alphaResults.push({
          query: testCase.query,
          pass: passed,
          topPage: topHit ? topHit.pageStart : "NONE",
          topFinalScore: topHit ? topHit.similarity.toFixed(4) : "N/A",
          topLexicalScore: topHit ? topHit.lexicalScore.toFixed(4) : "N/A",
          topVectorScore: topHit ? topHit.vectorSimilarity.toFixed(4) : "N/A",
          expectedRank: expectedRank !== -1 ? expectedRank : (testCase.expectedPages.length === 0 ? "N/A" : "NOT_IN_SET")
        });
        
        console.log(`Query: "${testCase.query}"`);
        console.log(`  Pass: ${passed ? 'YES' : 'NO'}`);
        if (topHit) {
          console.log(`  Rank 1: Page ${topHit.pageStart} (Final: ${topHit.similarity.toFixed(4)} | Vec: ${topHit.vectorSimilarity.toFixed(4)} | Lex: ${topHit.lexicalScore.toFixed(4)})`);
        } else {
          console.log(`  Rank 1: NONE (No hits > 0.60)`);
        }
      }
      resultsOut[`alpha_${alpha}`] = alphaResults;
      
      const allPassed = alphaResults.every(r => r.pass);
      console.log(`\nAlpha ${alpha.toFixed(2)} ALL GREEN? ${allPassed ? 'YES' : 'NO'}`);
    }
    
    // Save to docs/specs/phase-10-baseline.json
    fs.writeFileSync(
      path.join(process.cwd(), "docs/specs/phase-10-baseline.json"), 
      JSON.stringify(resultsOut, null, 2)
    );
    console.log(`\nWrote full results to docs/specs/phase-10-baseline.json`);
    
    expect(true).toBe(true);
  });
});
