import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * A generic pagination helper for Prisma models.
 * 
 * @param delegate The Prisma model delegate (e.g., prisma.rFQ, prisma.user)
 * @param args Prisma query arguments (e.g., { where: {...}, include: {...}, orderBy: {...} })
 * @param query The validated PaginationQuery containing page and limit
 * @returns A PaginatedResult containing the data array and pagination metadata
 */
export async function paginate<T>(
  delegate: any,
  args: any,
  query: PaginationQuery
): Promise<PaginatedResult<T>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  // Execute both count and findMany in parallel for performance
  const [total, data] = await Promise.all([
    delegate.count({ where: args.where }),
    delegate.findMany({
      ...args,
      skip,
      take: limit,
    }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
