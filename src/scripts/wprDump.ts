/**
 * Parity tooling for the WPR/WBR backend port.
 *
 * Usage:
 *   npm run wpr:dump -- <projectId> <weekEnding YYYY-MM-DD>
 *
 * Generates the report through the exact same service code the HTTP
 * endpoints use (no shortcuts), and writes both the assembled JSON and the
 * PDF to /tmp so they can be diffed / eyeballed against what the FE
 * downloads for the same project and week.
 */
import fs from "fs";
import path from "path";
import prisma from "../config/database/client";
import { getReportJson, getReportPdf } from "../modules/wpr/wpr.service";
import { WprRequestUser } from "../modules/wpr/wpr.repository";

async function main() {
  const [projectId, weekEnding] = process.argv.slice(2);

  if (!projectId || !weekEnding) {
    console.error("Usage: npm run wpr:dump -- <projectId> <weekEnding YYYY-MM-DD>");
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekEnding)) {
    console.error(`weekEnding must be YYYY-MM-DD, got: ${weekEnding}`);
    process.exit(1);
  }

  // ADMIN sees every project unscoped — the right identity for a parity
  // dump, since we want the full report regardless of who would normally
  // be allowed to trigger it.
  const user: WprRequestUser = { id: "00000000-0000-0000-0000-000000000000", role: "ADMIN" };

  const jsonPath = path.join("/tmp", `wpr-${projectId}-${weekEnding}.json`);
  const pdfPath = path.join("/tmp", `wpr-${projectId}-${weekEnding}.pdf`);

  console.log(`[wprDump] Generating report for project=${projectId} weekEnding=${weekEnding} ...`);

  const report = await getReportJson(projectId, user, weekEnding);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`[wprDump] Wrote ${jsonPath}`);
  console.log(
    `[wprDump] Row counts: rfi=${report.rfi.length} schedule=${report.schedule.length} changeOrders=${report.changeOrders.length}`
  );

  const { buffer } = await getReportPdf(projectId, user, weekEnding);
  fs.writeFileSync(pdfPath, buffer);
  console.log(`[wprDump] Wrote ${pdfPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

main()
  .catch((err) => {
    console.error("[wprDump] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
