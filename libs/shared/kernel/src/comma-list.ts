import * as z from 'zod';

const SEPARATOR = ',';

const CommaSeparated = z.codec(z.string(), z.array(z.string()), {
  decode: (text): string[] => (text === '' ? [] : text.split(SEPARATOR)),
  encode: (items): string => items.join(SEPARATOR),
});

/**
 * A query-string value that lists items with commas (`kinds=spell,feat`), for a list endpoint's filter. Absent or empty
 * means none; each item is read by `item`, so an unknown one is rejected, and the list holds at most `max` of them.
 */
export function commaList<const Item extends z.ZodType<unknown, string>>(
  item: Item,
  max: number,
): z.ZodDefault<z.ZodPipe<typeof CommaSeparated, z.ZodArray<Item>>> {
  return CommaSeparated.pipe(z.array(item).max(max)).default([]);
}
