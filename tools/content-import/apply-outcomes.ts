/**
 * `just content-import --pack <pack> --book <book> --apply-outcomes`: copies the `outcomes` the import builds for a
 * check (`check-outcomes.ts`) onto the matching `check` nodes of the committed descriptions, and changes nothing else
 * (ADR-0031: the committed pack is the source, and later corrections to it stand). It works on the committed text and
 * never replaces a description with the fresh import.
 *
 * A description takes outcomes only when it reads the same as the import's apart from them: same blocks, text, marks and
 * other nodes. One that differs was fixed by hand, and is skipped. In a description that matches, the checks pair up by
 * position. A basic check, one with outcomes already, and a group of identical checks that the import gives different
 * outcomes are left alone.
 */
import { InlineKind } from '@pioneer/rules/sdk';

import { spansOf } from './json-spans.ts';
import type { Span, SpanNode } from './json-spans.ts';
import { addReports, NO_REPORT } from './outcomes-report.ts';
import type { OutcomesReport } from './outcomes-report.ts';

type Json = unknown;
type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(node: unknown): node is JsonRecord {
  return typeof node === 'object' && node !== null && !Array.isArray(node);
}

function isCheck(node: unknown): node is JsonRecord {
  return isRecord(node) && node['type'] === InlineKind.Check;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The members of `node` to look into: all of them, but a check's own `outcomes`, which are text. */
function membersOf(node: JsonRecord): readonly (readonly [string, Json])[] {
  return Object.entries(node).filter(([key]) => !(key === 'outcomes' && isCheck(node)));
}

/** `node` without the `outcomes` of any check in it. */
export function withoutOutcomes(node: Json): Json {
  if (Array.isArray(node)) {
    return node.map((each: Json) => withoutOutcomes(each));
  }
  if (!isRecord(node)) {
    return node;
  }
  return Object.fromEntries(membersOf(node).map(([key, value]): [string, Json] => [key, withoutOutcomes(value)]));
}

/** The checks in `node`, in document order, those inside another check's outcomes left out. */
function checksIn(node: Json): readonly JsonRecord[] {
  if (Array.isArray(node)) {
    return node.flatMap((each: Json) => checksIn(each));
  }
  if (!isRecord(node)) {
    return [];
  }
  const inner = membersOf(node).flatMap(([, value]) => checksIn(value));
  return isCheck(node) ? [node, ...inner] : inner;
}

/** What a description's merge did, check by check. */
export interface OutcomeCounts {
  /** Checks that took outcomes. */
  readonly added: number;
  /** Checks that had outcomes already, or are basic, and so were left alone. */
  readonly kept: number;
  /** Checks left alone because identical checks in the description would take different outcomes. */
  readonly ambiguous: number;
}

const NONE: OutcomeCounts = { added: 0, kept: 0, ambiguous: 0 };

/** A description after the merge, and what it did. */
export interface DescriptionMerge {
  readonly description: Json;
  readonly counts: OutcomeCounts;
  /** The description differs from the import's apart from outcomes, so it was left as it was. */
  readonly handFixed: boolean;
}

/** The checks of a description and of the import's, which are paired by position. */
interface Pairs {
  readonly committed: readonly JsonRecord[];
  readonly fresh: readonly JsonRecord[];
}

/** The outcomes to lay, by the position of the check that takes them, and how many checks were left for being ambiguous. */
interface Plan {
  readonly added: ReadonlyMap<number, Json>;
  readonly ambiguous: number;
}

/** Whether the check at `at` takes the import's outcomes: it has some to take, and holds none and is not basic. */
function takes({ committed, fresh }: Pairs, at: number): boolean {
  const held = committed[at];
  return fresh[at]?.['outcomes'] !== undefined && held?.['outcomes'] === undefined && held?.['basic'] !== true;
}

/** The plan for a group of identical checks, at `members`: they take the import's outcomes unless it gives them different ones. */
function planGroup(pairs: Pairs, members: readonly number[]): Plan {
  const first = pairs.fresh[members[0] ?? 0]?.['outcomes'];
  const clashing = members.some((at) => !same(pairs.fresh[at]?.['outcomes'], first));
  const taking = members.filter((at) => takes(pairs, at));
  if (clashing) {
    return { added: new Map(), ambiguous: taking.length };
  }
  return { added: new Map(taking.map((at): [number, Json] => [at, first])), ambiguous: 0 };
}

/** The outcomes `fresh` gives each check of `committed` that takes them, by the check's position in the description. */
function planOutcomes(pairs: Pairs): Plan {
  const groups = Map.groupBy(
    pairs.committed.map((_check, at) => at),
    (at) => JSON.stringify(withoutOutcomes(pairs.committed[at])),
  );
  const added = new Map<number, Json>();
  let ambiguous = 0;
  for (const members of groups.values()) {
    const plan = planGroup(pairs, members);
    ambiguous += plan.ambiguous;
    for (const [at, outcomes] of plan.added) {
      added.set(at, outcomes);
    }
  }
  return { added, ambiguous };
}

/** `node` with `added` laid over its checks, which `next` numbers in document order. */
function laid(node: Json, added: ReadonlyMap<number, Json>, next: { at: number }): Json {
  if (Array.isArray(node)) {
    return node.map((each: Json) => laid(each, added, next));
  }
  if (!isRecord(node)) {
    return node;
  }
  const own = isCheck(node) ? next.at : undefined;
  next.at += own === undefined ? 0 : 1;
  const members = Object.entries(node).map(([key, value]): [string, Json] => [
    key,
    own !== undefined && key === 'outcomes' ? value : laid(value, added, next),
  ]);
  const outcomes = own === undefined ? undefined : added.get(own);
  return Object.fromEntries(outcomes === undefined ? members : [...members, ['outcomes', outcomes]]);
}

/** What merging one description does: the outcomes to add, by the position of the check that takes them. */
interface Planned {
  readonly added: ReadonlyMap<number, Json>;
  readonly counts: OutcomeCounts;
  readonly handFixed: boolean;
}

function planDescription(committed: Json, fresh: Json): Planned {
  const unchanged: Planned = { added: new Map(), counts: NONE, handFixed: false };
  const freshChecks = checksIn(fresh);
  const wanted = freshChecks.filter((check) => check['outcomes'] !== undefined).length;
  if (wanted === 0) {
    return unchanged;
  }
  if (!same(withoutOutcomes(committed), withoutOutcomes(fresh))) {
    return { ...unchanged, handFixed: true };
  }
  const { added, ambiguous } = planOutcomes({ committed: checksIn(committed), fresh: freshChecks });
  return { added, counts: { added: added.size, kept: wanted - added.size - ambiguous, ambiguous }, handFixed: false };
}

/** `committed` with the outcomes of `fresh` laid on the checks that take them. */
export function mergeDescription(committed: Json, fresh: Json): DescriptionMerge {
  const { added, counts, handFixed } = planDescription(committed, fresh);
  return { description: laid(committed, added, { at: 0 }), counts, handFixed };
}

/** The import's description of each entry, by id. */
export type FreshDescriptions = ReadonlyMap<string, Json>;

/** The spans of the checks of `data` in `span`, in the order `checksIn` lists them. */
function locate(data: Json, span: SpanNode | undefined): readonly Span[] {
  if (span === undefined) {
    return [];
  }
  if (Array.isArray(data) && span.kind === 'array') {
    return data.flatMap((each: Json, at) => locate(each, span.items[at]));
  }
  if (!isRecord(data) || span.kind !== 'object') {
    return [];
  }
  const inner = membersOf(data).flatMap(([key, member]) => locate(member, span.members.get(key)));
  return isCheck(data) ? [span, ...inner] : inner;
}

const WHITESPACE = /\s/u;

/** Where a key goes into the object at `span`: after its last member, before the whitespace that closes it. */
function insertionPoint(text: string, { end }: Span): number {
  let at = end - 1;
  while (WHITESPACE.test(text.charAt(at - 1))) {
    at -= 1;
  }
  return at;
}

/** An edit of the committed text: `outcomes` added to the object that ends at `at`. */
interface Insertion {
  readonly at: number;
  readonly outcomes: Json;
}

/** What one committed entry takes: the edits to its text, and the tally. */
interface EntryMerge {
  readonly insertions: readonly Insertion[];
  readonly report: OutcomesReport;
}

/** A committed entry, where it sits in the text, and the import's description of it. */
interface Entry {
  readonly entry: JsonRecord;
  readonly node: SpanNode;
  readonly incoming: Json;
}

/** The entry of the committed `text`, merged with the import's description of it. */
function mergeEntry(text: string, { entry, node, incoming }: Entry): EntryMerge {
  const planned = planDescription(entry['description'], incoming);
  const spans = locate(entry['description'], node.kind === 'object' ? node.members.get('description') : undefined);
  const insertions = [...planned.added].flatMap(([at, outcomes]): Insertion[] => {
    const span = spans[at];
    return span === undefined ? [] : [{ at: insertionPoint(text, span), outcomes }];
  });
  const slug = `${String(entry['pack'])}/${String(entry['slug'])}`;
  const report = {
    ...planned.counts,
    handFixed: planned.handFixed ? [slug] : [],
    changed: planned.counts.added > 0 ? 1 : 0,
  };
  return { insertions, report };
}

/** `text` with each of `insertions` made, last first so the places of the others hold. */
function inserted(text: string, insertions: readonly Insertion[]): string {
  let edited = text;
  for (const { at, outcomes } of insertions.toSorted((left, right) => right.at - left.at)) {
    edited = `${edited.slice(0, at)}, "outcomes": ${JSON.stringify(outcomes)}${edited.slice(at)}`;
  }
  return edited;
}

/** The committed file `text` and what the merge did to it. */
export interface TextMerge {
  readonly text: string;
  readonly report: OutcomesReport;
}

/**
 * The committed file `text` with the outcomes of `fresh` added to the checks that take them, and the tally. Each outcome
 * is inserted into the text at its check, so every other byte of the file stays as it was.
 */
export function addOutcomesToText(text: string, fresh: FreshDescriptions): TextMerge {
  const entries: Json = JSON.parse(text);
  const tree = spansOf(text);
  if (!Array.isArray(entries) || tree.kind !== 'array') {
    return { text, report: NO_REPORT };
  }
  const merges = entries.flatMap((entry: Json, index): EntryMerge[] => {
    const node = tree.items[index];
    const incoming = isRecord(entry) && typeof entry['id'] === 'string' ? fresh.get(entry['id']) : undefined;
    const described = isRecord(entry) && entry['description'] !== undefined;
    return described && incoming !== undefined && node !== undefined
      ? [mergeEntry(text, { entry, node, incoming })]
      : [];
  });
  let report = NO_REPORT;
  for (const merge of merges) {
    report = addReports(report, merge.report);
  }
  return {
    text: inserted(
      text,
      merges.flatMap(({ insertions }) => insertions),
    ),
    report,
  };
}
