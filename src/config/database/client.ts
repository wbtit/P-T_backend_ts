import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

/**
 * Limits each Node.js process to a small, predictable Prisma pool. The
 * application may be run by PM2, a container orchestrator, or ts-node-dev;
 * each process has its own pool, so the total connection count is the number
 * of processes multiplied by this value.
 *
 * Override PRISMA_CONNECTION_LIMIT only after accounting for every process
 * that connects to this database.
 */
function getDatabaseUrl(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return undefined;
  }

  const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT ?? "1";
  const url = new URL(databaseUrl);

  if (url.protocol === "postgres:" || url.protocol === "postgresql:") {
    url.searchParams.set("connection_limit", connectionLimit);
  }

  return url.toString();
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

// Keeps development hot reloads from constructing an additional pool.
globalForPrisma.prisma = prisma;

export default prisma;
