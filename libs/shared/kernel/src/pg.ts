import * as z from 'zod';

import { issueParams, message, ValidationMessage } from './message';
import { InstantCodec, PlainDateCodec } from './temporal-codecs';

/** Int2 bounds. */
const SMALLINT_MIN = -32_768;
const SMALLINT_MAX = 32_767;

const DIGITS = /^\d+$/u;

/** Whether `value` fits `numeric(precision, scale)`: at most `scale` fraction digits and `precision` total. */
function fitsNumeric(value: string, precision: number, scale: number): boolean {
  const [whole = '', fraction = '', ...rest] = value.replace(/^-/u, '').split('.');
  const wellFormed = rest.length === 0 && DIGITS.test(whole) && (fraction === '' || DIGITS.test(fraction));
  const significant = whole.replace(/^0+(?=\d)/u, '');
  return wellFormed && !value.endsWith('.') && fraction.length <= scale && significant.length <= precision - scale;
}

/**
 * Zod schemas that match Postgres column types, not TypeScript's. Domain
 * schemas use these so a value that validates also fits its column:
 * `Pg.smallint()` rejects 40_000, `Pg.numeric(5, 2)` rejects "1234.5" and
 * never goes through a float. Prefer these over bare `z.number()`/`z.string()`
 * for anything persisted.
 */
export const Pg = {
  /** Int2: -32768..32767. */
  smallint: (): z.ZodNumber => z.number().int().min(SMALLINT_MIN).max(SMALLINT_MAX),
  /** Int4. */
  integer: (): z.ZodNumber => z.int32(),
  /** Int8 as `bigint` in memory, a decimal string on the wire (JSON has no 64-bit ints). */
  bigint: () =>
    z.codec(z.string().regex(/^-?\d+$/u), z.int64(), {
      decode: BigInt,
      encode: (value) => value.toString(),
    }),
  /**
   * Numeric(precision, scale) as a decimal string, never a float: money-like
   * values keep every digit. Do arithmetic with a decimal library, not `Number`.
   */
  numeric: (precision: number, scale: number): z.ZodString =>
    z
      .string()
      .refine(
        (value) => fitsNumeric(value, precision, scale),
        issueParams(message(ValidationMessage.Decimal, { precision, scale })),
      ),
  /** Float4. */
  real: (): z.ZodNumber => z.float32(),
  /** Float8. */
  doublePrecision: (): z.ZodNumber => z.float64(),
  /** Varchar(n). */
  varchar: (length: number): z.ZodString => z.string().max(length),
  text: (): z.ZodString => z.string(),
  boolean: (): z.ZodBoolean => z.boolean(),
  uuid: (): z.ZodUUID => z.uuid(),
  /** Timestamptz as `Temporal.Instant`. */
  timestamptz: (): typeof InstantCodec => InstantCodec,
  /** Date as `Temporal.PlainDate`. */
  date: (): typeof PlainDateCodec => PlainDateCodec,
} as const;
