import type { PrismaService } from './prisma.service';

/**
 * The instants where a calendar day (YYYY-MM-DD) starts and ends in `timeZone`,
 * as a half-open range [start, end). Postgres does the conversion so DST is handled.
 * Use with `{ gte: start, lt: end }` so queries keep using (…, timestamp) indexes.
 */
export async function localDayBounds(
  prisma: PrismaService,
  date: string,
  timeZone: string,
): Promise<{ start: Date; end: Date }> {
  const [bounds] = await prisma.$queryRaw<{ start: Date; end: Date }[]>`
    SELECT (${date}::date::timestamp AT TIME ZONE ${timeZone})       AS "start",
           ((${date}::date + 1)::timestamp AT TIME ZONE ${timeZone}) AS "end"
  `;
  return bounds;
}
