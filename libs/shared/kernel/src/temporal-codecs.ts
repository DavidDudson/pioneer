import * as z from 'zod';

import { Temporal } from './temporal';

/**
 * Parse with Temporal, turning its RangeError into a Zod issue so bad input
 * is a validation failure (422), never an exception (500). Zod's ISO formats
 * are looser than Temporal's (e.g. unlimited fraction digits).
 */
function parseOr<TValue>(
  parse: () => TValue,
  context: z.core.ParsePayload<string>,
  format: 'date' | 'datetime',
): TValue {
  try {
    return parse();
  } catch (error: unknown) {
    context.issues.push({
      code: 'invalid_format',
      format,
      input: context.value,
      message: error instanceof Error ? error.message : `Invalid ${format}`,
    });
    return z.NEVER;
  }
}

/**
 * `Temporal.Instant` in memory; on the wire, canonical UTC ISO 8601 with
 * millisecond precision (`2026-10-07T10:00:00.000Z`). One representation per
 * instant; sub-millisecond precision does not cross the wire.
 */
export const InstantCodec = z.codec(z.iso.datetime({ precision: 3 }), z.instanceof(Temporal.Instant), {
  decode: (iso, context) => parseOr(() => Temporal.Instant.from(iso), context, 'datetime'),
  encode: (instant) => instant.toString({ smallestUnit: 'millisecond' }),
});

/** ISO 8601 calendar date on the wire, `Temporal.PlainDate` in memory. */
export const PlainDateCodec = z.codec(z.iso.date(), z.instanceof(Temporal.PlainDate), {
  decode: (iso, context) => parseOr(() => Temporal.PlainDate.from(iso), context, 'date'),
  encode: (date) => date.toString(),
});
