/**
 * The one layout of a committed pack file, whatever text it was parsed from: two-space indent, every object and every
 * array of objects expanded, and an array of scalars on one line when it fits the print width. It is what
 * `JSON.stringify(value, undefined, 2)` followed by `bun fmt` gives, written out so a writer needs no formatter and a
 * test can hold the committed files to it. The value decides the text, never the file it replaced.
 */

/** `printWidth` in bunfig.toml's `[fmt]`. */
const PRINT_WIDTH = 120;
const INDENT = '  ';

type Json = unknown;

/** The members of an array or object, or none for a scalar. */
function sizeOf(value: Json): number {
  if (Array.isArray(value)) {
    return value.length;
  }
  return typeof value === 'object' && value !== null ? Object.keys(value).length : 0;
}

/** Whether a formatter breaks an array of arrays whatever its width: two or more, each of two or more members. */
function breaksAlways(items: readonly Json[]): boolean {
  return items.length > 1 && items.every((item) => Array.isArray(item) && sizeOf(item) > 1);
}

/** `value` on one line, or nothing if it holds an object or an array that always breaks. */
function flat(value: Json): string | undefined {
  if (Array.isArray(value)) {
    const parts = value.map((item: Json) => flat(item));
    const joined = parts.every((part) => part !== undefined) ? parts.join(', ') : undefined;
    return joined === undefined || breaksAlways(value) ? undefined : `[${joined}]`;
  }
  if (typeof value === 'object' && value !== null) {
    return sizeOf(value) === 0 ? '{}' : undefined;
  }
  return JSON.stringify(value);
}

function indented(depth: number): string {
  return INDENT.repeat(depth);
}

/** What opens the first line of a value (a key) and what closes its last (a comma). */
interface Around {
  readonly prefix: string;
  readonly suffix: string;
}

/** Where a container starts and what follows it. */
interface Frame {
  readonly lead: string;
  readonly suffix: string;
}

/** The lines of `value` placed at `depth`. */
function lines(value: Json, depth: number, { prefix, suffix }: Around): readonly string[] {
  const lead = `${indented(depth)}${prefix}`;
  if (Array.isArray(value)) {
    return arrayLines(value, depth, { lead, suffix });
  }
  if (typeof value === 'object' && value !== null) {
    return objectLines(Object.entries(value), depth, { lead, suffix });
  }
  return [`${lead}${JSON.stringify(value)}${suffix}`];
}

function arrayLines(items: readonly Json[], depth: number, { lead, suffix }: Frame): readonly string[] {
  if (items.length === 0) {
    return [`${lead}[]${suffix}`];
  }
  const oneLine = flat(items);
  const line = oneLine === undefined ? undefined : `${lead}${oneLine}${suffix}`;
  if (line !== undefined && line.length <= PRINT_WIDTH) {
    return [line];
  }
  const inner = items.flatMap((item, at) =>
    lines(item, depth + 1, { prefix: '', suffix: at < items.length - 1 ? ',' : '' }),
  );
  return [`${lead}[`, ...inner, `${indented(depth)}]${suffix}`];
}

function objectLines(
  members: readonly (readonly [string, Json])[],
  depth: number,
  { lead, suffix }: Frame,
): readonly string[] {
  if (members.length === 0) {
    return [`${lead}{}${suffix}`];
  }
  const inner = members.flatMap(([key, member], at) =>
    lines(member, depth + 1, { prefix: `${JSON.stringify(key)}: `, suffix: at < members.length - 1 ? ',' : '' }),
  );
  return [`${lead}{`, ...inner, `${indented(depth)}}${suffix}`];
}

/** `value` as a committed pack file's text, with the newline that ends it. */
export function canonicalJson(value: Json): string {
  return `${lines(value, 0, { prefix: '', suffix: '' }).join('\n')}\n`;
}
