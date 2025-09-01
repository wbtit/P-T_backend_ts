import { Prisma } from '@prisma/client';

/**
 * Clean data by:
 * - Removing `undefined` values
 * - Converting `files: null` to `Prisma.JsonNull`
 * 
 * This version ensures compatibility with Prisma's JSON fields.
 */
export function cleandata<T extends Record<string, any>>(data: T): T {
  const cleanedEntries = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      // Handle Prisma JSON field properly
      if (key === 'files') {
        if (value === null) {
          return [key, Prisma.JsonNull];
        }

        // Optional: If it's an array or object, make sure it's valid JSON
        if (typeof value === 'object') {
          return [key, value as Prisma.InputJsonValue];
        }
      }

      return [key, value];
    });

  return Object.fromEntries(cleanedEntries) as T;
}
