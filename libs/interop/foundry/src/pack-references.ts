import { ContentEntry, ContentId, InlineKind } from '@pioneer/rules/sdk';
import type { ContentText } from '@pioneer/rules/sdk';
import type * as z from 'zod';

import { BacklogGapType, LeftOutReason } from './import-backlog';
import type { BacklogGap } from './import-backlog';

/**
 * Pack output's reference check (content-model.md, "Foundry import"): every id an entry holds must land on an entry
 * in the output or in another official pack. Leaving an entry out can strand those that reference it, so the check
 * repeats until nothing changes. What references a missing entry degrades as the import treats any link to an entry
 * outside it: a rule element is dropped, as a `GrantItem` of nothing stays untranslated; a `Ref` node in rich text
 * becomes its label, else the target's name, as text; any other reference (a field of `data`) leaves the entry out.
 */

export interface LeftOut {
  readonly reason: LeftOutReason;
  readonly detail: string;
}

export interface EntryGap {
  readonly entry: ContentId;
  readonly gap: BacklogGap;
}

/** The output as it is checked: what is in, what is out and why, and what was dropped from what is in. */
export interface CheckedOutput {
  readonly entries: Map<ContentId, ContentEntry>;
  readonly leftOut: Map<ContentId, LeftOut>;
  readonly dropped: EntryGap[];
}

export interface Resolution {
  /** The other official packs' entries. */
  readonly known: ReadonlySet<ContentId>;
  /** Every translated entry's `<pack>/<slug>`, naming a missing entry in the backlog. */
  readonly keys: ReadonlyMap<ContentId, string>;
  /** Every translated entry's name, the text a link to it degrades to. */
  readonly names: ReadonlyMap<ContentId, ContentText>;
}

interface Check {
  readonly output: CheckedOutput;
  readonly resolution: Resolution;
}

/** Envelope fields that hold ids which are not references: the entry's own, and other systems'. */
const NOT_REFERENCES: ReadonlySet<string> = new Set(['id', 'externalIds']);

function collectIds(value: unknown, into: Set<ContentId>): void {
  if (typeof value === 'string') {
    // An id is how an entry references another: `GrantItem.item`, a `Ref` node, `data.languages`.
    const id = ContentId.safeParse(value);
    if (id.success) {
      into.add(id.data);
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const each of Object.values(value)) {
      collectIds(each, into);
    }
  }
}

/** Every id anywhere in `value`. */
function idsIn(value: unknown): ReadonlySet<ContentId> {
  const ids = new Set<ContentId>();
  collectIds(value, ids);
  return ids;
}

/** The ids `entry` (or some of its fields) references, anywhere in it but its own id and external ids. */
export function referencedIds(entry: Readonly<Record<string, unknown>>): ReadonlySet<ContentId> {
  return idsIn(Object.entries(entry).flatMap(([field, value]) => (NOT_REFERENCES.has(field) ? [] : [value])));
}

/** The first issue a schema raised, as `path: message`. */
export function firstIssue(error: z.ZodError): string {
  const [issue] = error.issues;
  return issue === undefined ? '' : `${issue.path.join('.')}: ${issue.message}`;
}

function isMissing(id: ContentId, { output, resolution }: Check): boolean {
  return !resolution.known.has(id) && !output.entries.has(id);
}

function firstMissing(ids: ReadonlySet<ContentId>, check: Check): ContentId | undefined {
  return [...ids].find((id) => isMissing(id, check));
}

function keyOf(id: ContentId, { resolution }: Check): string {
  return resolution.keys.get(id) ?? id;
}

/** A `Ref` inline node, as `unlink` reads it before the entry is parsed again. */
interface RefLike {
  readonly id: ContentId;
  readonly label?: string;
}

function isRefNode(value: object): value is RefLike {
  return 'type' in value && value.type === InlineKind.Ref && 'id' in value && typeof value.id === 'string';
}

/** `value` with each `Ref` node to a missing entry as text, each reported in `gaps`. */
function unlink(value: unknown, check: Check, gaps: BacklogGap[]): unknown {
  if (Array.isArray(value)) {
    return value.map((each) => unlink(each, check, gaps));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (isRefNode(value) && isMissing(value.id, check)) {
    gaps.push({ type: BacklogGapType.Reference, entry: keyOf(value.id, check), element: value });
    return { type: InlineKind.Text, text: value.label ?? check.resolution.names.get(value.id) ?? '' };
  }
  return Object.fromEntries(Object.entries(value).map(([key, each]) => [key, unlink(each, check, gaps)]));
}

function leaveOut(entry: ContentEntry, leftOut: LeftOut, { output }: Check): void {
  output.entries.delete(entry.id);
  output.leftOut.set(entry.id, leftOut);
}

/** `entry` with what references a missing entry dropped or unlinked, or left out when that is not enough. */
function degrade(entry: ContentEntry, check: Check): void {
  const gaps: BacklogGap[] = [];
  const { rules, ...rest } = entry;
  const kept = rules.filter((rule) => {
    const missing = firstMissing(idsIn(rule), check);
    if (missing !== undefined) {
      gaps.push({ type: BacklogGapType.Reference, entry: keyOf(missing, check), element: rule });
    }
    return missing === undefined;
  });
  const unlinked = unlink(rest, check, gaps);
  const parsed = ContentEntry.safeParse(typeof unlinked === 'object' ? { ...unlinked, rules: kept } : unlinked);
  const stillMissing = parsed.success ? firstMissing(referencedIds(parsed.data), check) : undefined;
  if (!parsed.success) {
    leaveOut(entry, { reason: LeftOutReason.InvalidEntry, detail: firstIssue(parsed.error) }, check);
  } else if (stillMissing === undefined) {
    check.output.entries.set(entry.id, parsed.data);
    check.output.dropped.push(...gaps.map((gap) => ({ entry: entry.id, gap })));
  } else {
    leaveOut(entry, { reason: LeftOutReason.UnresolvedReference, detail: keyOf(stillMissing, check) }, check);
  }
}

/** Degrades whatever references an entry in neither the output nor `known`, until every reference resolves. */
export function resolveReferences(output: CheckedOutput, resolution: Resolution): void {
  const check = { output, resolution };
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of output.entries.values()) {
      if (firstMissing(referencedIds(entry), check) !== undefined) {
        degrade(entry, check);
        changed = true;
      }
    }
  }
}
