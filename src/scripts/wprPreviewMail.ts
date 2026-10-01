/**
 * Renders the WPR email template with representative fixture data (no DB
 * access — this is purely a visual check of the HTML) and writes both the
 * LIVE and INTERNAL variants to disk so they can be opened in a browser.
 *
 * Usage: npm run wpr:preview-mail
 */
import fs from "fs";
import path from "path";
import { buildWprEmailHtml } from "../services/mailServices/mailtemplates/wprMailTemplate";

const OUTPUT_DIR = path.join(process.cwd(), "wpr-output");

const fixture = {
  projectName: "26-016 - Midland Beal Park",
  weekEnding: "10/04/2026",
  fabricatorName: "Cobb Industrial, Inc.",
  filename: "26-016 - Midland Beal Park_WPR_Report_2026-10-04.pdf",
};

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const liveHtml = buildWprEmailHtml(fixture); // no testBanner — exactly what a real LIVE send renders
  const internalHtml = buildWprEmailHtml({
    ...fixture,
    testBanner: {
      to: ["pm@midlandbeal.com", "estimator@midlandbeal.com"],
      cc: ["admin@whiteboardtec.com", "ops@whiteboardtec.com", "pmo@whiteboardtec.com"],
    },
  });

  const livePath = path.join(OUTPUT_DIR, "mail-live.html");
  const internalPath = path.join(OUTPUT_DIR, "mail-internal.html");

  fs.writeFileSync(livePath, liveHtml, "utf-8");
  fs.writeFileSync(internalPath, internalHtml, "utf-8");

  console.log(`[wprPreviewMail] Wrote ${livePath}`);
  console.log(`[wprPreviewMail] Wrote ${internalPath}`);
}

main();
