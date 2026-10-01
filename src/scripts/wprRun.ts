/**
 * Manual trigger for the WPR/WBR weekly delivery job — for dev/testing,
 * since cron jobs are disabled outside production (ENABLE_CRON).
 *
 * Usage:
 *   npm run wpr:run -- --date=2026-09-28 --mode=DRY_RUN
 *   npm run wpr:run -- --fabricator=<uuid> --mode=INTERNAL
 *   npm run wpr:run -- --mode=LIVE --i-understand-this-emails-clients
 */
import { DateTime } from "luxon";
import prisma from "../config/database/client";
import { runWprWeekly, WprJobMode } from "../corn-jobs/wprWeekly";
import { WPR_TIMEZONE } from "../modules/wpr/wpr.weeks";

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, ...rest] = arg.slice(2).split("=");
    out[key] = rest.length ? rest.join("=") : true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const mode = (typeof args.mode === "string" ? args.mode.toUpperCase() : "DRY_RUN") as WprJobMode;
  if (!["DRY_RUN", "INTERNAL", "LIVE"].includes(mode)) {
    console.error(`Invalid --mode=${args.mode}. Must be DRY_RUN, INTERNAL, or LIVE.`);
    process.exit(1);
  }

  if (mode === "LIVE" && !args["i-understand-this-emails-clients"]) {
    console.error(
      "Refusing to run in LIVE mode without --i-understand-this-emails-clients — " +
        "this mode sends real email to real clients."
    );
    process.exit(1);
  }

  let date: Date | undefined;
  if (typeof args.date === "string") {
    const parsed = DateTime.fromISO(args.date, { zone: WPR_TIMEZONE });
    if (!parsed.isValid) {
      console.error(`Invalid --date=${args.date}. Expected YYYY-MM-DD.`);
      process.exit(1);
    }
    date = parsed.toJSDate();
  }

  const fabricatorId = typeof args.fabricator === "string" ? args.fabricator : undefined;

  console.log(`[wprRun] mode=${mode} date=${date ? date.toISOString() : "(now)"} fabricator=${fabricatorId ?? "(all due today)"}`);

  const summary = await runWprWeekly({ date, fabricatorId, mode });

  console.log("[wprRun] Summary:");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error("[wprRun] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
