import { z } from 'zod';

import { Temporal } from './temporal';

/** ISO 8601 instant on the wire, `Temporal.Instant` in memory. */
export const InstantCodec = z.codec(z.iso.datetime({ offset: true }), z.instanceof(Temporal.Instant), {
  decode: (iso) => Temporal.Instant.from(iso),
  encode: (instant) => instant.toString(),
});

/** ISO 8601 calendar date on the wire, `Temporal.PlainDate` in memory. */
export const PlainDateCodec = z.codec(z.iso.date(), z.instanceof(Temporal.PlainDate), {
  decode: (iso) => Temporal.PlainDate.from(iso),
  encode: (date) => date.toString(),
});
