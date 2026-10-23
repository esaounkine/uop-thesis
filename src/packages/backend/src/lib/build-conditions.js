import { and, eq, inArray, sql } from 'drizzle-orm';

/**
 * Converts an object into a WHERE clause,
 * each condition is joined by `and`.
 *  - Scalars match via `=`
 *  - Arrays match via `IN` (empty arrays produce mismatches)
 *
 * @param {Object} table - table (drizzle instance)
 * @param {Object} filters - column-value pairs
 * @returns {import('drizzle-orm').SQL | undefined}
 */
export const buildConditions = (table, filters) =>
  and(...Object.entries(filters)
    .filter(([, value]) =>
      value !== undefined)
    .map(([field, value]) => {
      if (Array.isArray(value)) {
        return value.length === 0
          ? sql`1 = 0`
          : inArray(table[field], value);
      }

      return eq(table[field], value);
    }));
