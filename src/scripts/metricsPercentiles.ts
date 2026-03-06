import fs from "fs";
import path from "path";
import readline from "readline";

type MetricLogLine = {
  method?: string;
  route?: string;
  duration_ms?: number;
};

type MetricSample = {
  method: string;
  route: string;
  duration_ms: number;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (p <= 0) return sorted[0];
  if (p >= 100) return sorted[sorted.length - 1];

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

async function main() {
  const inputPath =
    process.argv[2] ?? path.join(process.cwd(), "logs", "metrics.ndjson");
  const outputPath =
    process.argv[3] ?? path.join(process.cwd(), "logs", "metrics.percentiles.json");
  const resolvedPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(outputPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Metrics file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const durations: number[] = [];
  const samples: MetricSample[] = [];
  let totalLines = 0;
  let skippedLines = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(resolvedPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    totalLines += 1;
    const trimmed = line.trim();
    if (!trimmed) {
      skippedLines += 1;
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as MetricLogLine;
      if (
        typeof parsed.duration_ms === "number" &&
        Number.isFinite(parsed.duration_ms) &&
        typeof parsed.method === "string" &&
        parsed.method.length > 0 &&
        typeof parsed.route === "string" &&
        parsed.route.length > 0
      ) {
        durations.push(parsed.duration_ms);
        samples.push({
          method: parsed.method,
          route: parsed.route,
          duration_ms: parsed.duration_ms,
        });
      } else {
        skippedLines += 1;
      }
    } catch {
      skippedLines += 1;
    }
  }

  if (durations.length === 0) {
    console.error("No valid duration_ms values found in metrics file.");
    process.exit(1);
  }

  durations.sort((a, b) => a - b);

  const sum = durations.reduce((acc, value) => acc + value, 0);
  const byRoute = samples.reduce((acc, sample) => {
    const key = `${sample.method} ${sample.route}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(sample.duration_ms);
    return acc;
  }, {} as Record<string, number[]>);

  const route_percentiles = Object.entries(byRoute)
    .map(([routeKey, routeDurations]) => {
      routeDurations.sort((a, b) => a - b);
      return {
        route: routeKey,
        count: routeDurations.length,
        p50_ms: percentile(routeDurations, 50),
        p95_ms: percentile(routeDurations, 95),
        max_ms: routeDurations[routeDurations.length - 1],
      };
    })
    .sort((a, b) => b.p95_ms - a.p95_ms);

  const result = {
    file: resolvedPath,
    total_lines: totalLines,
    valid_samples: durations.length,
    skipped_lines: skippedLines,
    min_ms: durations[0],
    avg_ms: sum / durations.length,
    p50_ms: percentile(durations, 50),
    p90_ms: percentile(durations, 90),
    p95_ms: percentile(durations, 95),
    p99_ms: percentile(durations, 99),
    max_ms: durations[durations.length - 1],
    route_percentiles,
  };

  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  fs.writeFileSync(resolvedOutputPath, JSON.stringify(result, null, 2));
  console.log(`Wrote percentiles to ${resolvedOutputPath}`);
}

void main();
