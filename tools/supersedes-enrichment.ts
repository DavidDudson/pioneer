/**
 * The supersedes pass over committed packs (content-model.md, "Replaced entries"): where AoN marks a legacy entry as
 * replaced by a remaster one (`content/aon/supersedes/<book>.json`) and both are in the packs, found by the AoN URL on
 * their book sources, the remaster entry gets the legacy entry's id in `supersedes`. An id already there is kept and
 * never repeated. Only `supersedes` changes: the file is edited as text, so the entries keep their formatting and the diff holds nothing else.
 */
import { ContentEntryFile, SourceKind } from '@pioneer/rules/sdk';
import type { AonSupersedesFile, ContentEntry, ContentId } from '@pioneer/rules/sdk';

/** The legacy entries each remaster entry replaces, and how many AoN pairs had no entry on one side or both. */
export interface SupersedesLinks {
  readonly replaces: ReadonlyMap<ContentId, readonly ContentId[]>;
  readonly unresolved: number;
}

/** Entry ids by the AoN URL their book sources cite. */
function idsByAon(entries: readonly ContentEntry[]): ReadonlyMap<string, ContentId> {
  const found = entries.flatMap((entry) =>
    entry.sources.flatMap((source) =>
      source.kind === SourceKind.Book && source.aon !== undefined ? [[source.aon, entry.id] as const] : [],
    ),
  );
  return new Map(found);
}

/** Which remaster entry replaces which legacy ones, from every pack's entries and the books' AoN pairs. */
export function supersedesLinks(
  entries: readonly ContentEntry[],
  files: readonly AonSupersedesFile[],
): SupersedesLinks {
  const ids = idsByAon(entries);
  const replaces = new Map<ContentId, ContentId[]>();
  let unresolved = 0;
  for (const [legacyUrl, targets] of files.flatMap((file) => Object.entries(file.replacedBy))) {
    const legacy = ids.get(legacyUrl);
    const replacements = targets.flatMap((url) => ids.get(url) ?? []);
    if (legacy === undefined || replacements.length === 0) {
      unresolved += 1;
    }
    for (const remaster of replacements) {
      const held = replaces.get(remaster) ?? [];
      replaces.set(remaster, legacy === undefined || held.includes(legacy) ? held : [...held, legacy]);
    }
  }
  return { replaces, unresolved };
}

/** What the pass did to a `<kind>.json` file; `text` is undefined when no entry changed. */
export interface SupersedesEnrichedFile {
  readonly text: string | undefined;
  readonly set: number;
}

/** A file's lines, and how many ids the pass has added to them so far. */
interface Patched {
  readonly lines: readonly string[];
  readonly set: number;
}

/** The first and last line of an entry in a file's lines. */
interface LineRange {
  readonly start: number;
  readonly end: number;
}

const SUPERSEDES_FIELD = /^ {4}"supersedes": \[[^\]]*\](?<comma>,?)$/u;
const ENTRY_START = '  {';
const ENTRY_END = /^ {2}\},?$/u;

/** The lines of the entry whose `"id"` is `id`: from its opening `  {` to the `  }` that closes it. */
function entryRange(lines: readonly string[], id: ContentId): LineRange | undefined {
  const idLine = lines.indexOf(`    "id": "${id}",`);
  const start = lines.findLastIndex((line, index) => index <= idLine && line === ENTRY_START);
  const end = lines.findIndex((line, index) => index > idLine && ENTRY_END.test(line));
  return idLine === -1 || start === -1 || end === -1 ? undefined : { start, end };
}

/** One entry's lines with `supersedes` set to `ids`: its own line replaced, or one added as the last field. */
function withSupersedes(entryLines: readonly string[], ids: readonly ContentId[]): readonly string[] {
  const field = `    "supersedes": [${ids.map((id) => `"${id}"`).join(', ')}]`;
  const held = entryLines.findIndex((line) => SUPERSEDES_FIELD.test(line));
  if (held !== -1) {
    const comma = SUPERSEDES_FIELD.exec(entryLines[held] ?? '')?.groups?.['comma'] ?? '';
    return entryLines.with(held, `${field}${comma}`);
  }
  const closing = entryLines.length - 1;
  const lastField = closing - 1;
  return [...entryLines.slice(0, lastField), `${entryLines[lastField] ?? ''},`, field, entryLines[closing] ?? ''];
}

/** `patched` with `entry`'s missing ids added; the same when the entry lacks none or is not found in the lines. */
function patchEntry(
  patched: Patched,
  entry: ContentEntry,
  replaces: ReadonlyMap<ContentId, readonly ContentId[]>,
): Patched {
  const held = entry.supersedes ?? [];
  const lacking = (replaces.get(entry.id) ?? []).filter((id) => !held.includes(id) && id !== entry.id);
  const range = lacking.length === 0 ? undefined : entryRange(patched.lines, entry.id);
  if (range === undefined) {
    return patched;
  }
  const entryLines = withSupersedes(patched.lines.slice(range.start, range.end + 1), [...held, ...lacking]);
  return {
    lines: [...patched.lines.slice(0, range.start), ...entryLines, ...patched.lines.slice(range.end + 1)],
    set: patched.set + lacking.length,
  };
}

/**
 * A `<kind>.json` file's text with each remaster entry's `supersedes` filled: the ids it lacks added to the ones it has.
 * Entries the pass doesn't change keep their text exactly.
 */
export function enrichSupersedesText(
  text: string,
  replaces: ReadonlyMap<ContentId, readonly ContentId[]>,
): SupersedesEnrichedFile {
  const entries = ContentEntryFile.parse(JSON.parse(text));
  const start: Patched = { lines: text.split('\n'), set: 0 };
  let patched = start;
  for (const entry of entries) {
    patched = patchEntry(patched, entry, replaces);
  }
  const { lines, set } = patched;
  return { text: set > 0 ? lines.join('\n') : undefined, set };
}
