import { resolveGrants } from '@pioneer/rules/grants';
import type {
  ChoiceSlot,
  ConditionalGrant,
  ContentLookup,
  GrantEntry,
  GrantedItem,
  GrantResolution,
  GrantRoot,
} from '@pioneer/rules/grants';
import { PredicateFacts } from '@pioneer/rules/predicate';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import {
  contentId,
  ContentId,
  ContentKind,
  ContentKindSchema,
  ContentText,
  OriginHopKind,
  PackId,
  RollOption,
  RuleElement,
  RuleElementKey,
  SlotKey,
  Slug,
  SourceRef,
} from '@pioneer/rules/sdk';
import type { OriginHop } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { choiceRow, choiceSlugsToIds, parsePicks } from './grant-choices';
import type { ChoiceRow, SlugTable } from './grant-choices';
import { parseFacts } from './predicate-verdict';
import { CheckStatus, readJson } from './rules-check';
import type { JsonProblem } from './rules-check';

/** Entries typed into the playground live in a made-up pack, so a slug names one. */
const PLAYGROUND_PACK = PackId.parse('playground');
const PLAYGROUND_PAGE = SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 });
const LINE = /\r?\n/u;

const idOfSlug = (slug: Slug): ContentId => ContentId.parse(contentId(PLAYGROUND_PACK, slug));

/** A `GrantItem` may name its entry by slug in the playground; stored content always uses the id. */
function slugGrantToId(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('key' in value) || value.key !== RuleElementKey.GrantItem) {
    return value;
  }
  const item = 'item' in value ? Slug.safeParse(value.item) : undefined;
  return item?.success === true ? { ...value, item: idOfSlug(item.data) } : value;
}

/**
 * An entry as the playground takes it: a slug, a name and its rule elements; a kind (a class feature unless it says)
 * and its own roll options (`trait:fighter`, `level:1`) for `ChoiceSet` queries to filter on.
 */
const PlaygroundEntry = z.strictObject({
  slug: Slug,
  name: ContentText,
  kind: ContentKindSchema.default(ContentKind.ClassFeature),
  rollOptions: z.array(RollOption).default([]),
  rules: z.array(z.preprocess(slugGrantToId, RuleElement)),
});
type PlaygroundEntry = z.output<typeof PlaygroundEntry>;

const PlaygroundEntries = z.array(PlaygroundEntry);

/** An entry in a result, with the entries whose grants led to it, outermost first. */
interface GrantRow {
  readonly name: string;
  readonly via: readonly string[];
}

interface ConditionalRow extends GrantRow {
  readonly summary: PredicateSummary;
}

interface GrantErrorRow {
  readonly error: MessageDescriptor;
  readonly via: readonly string[];
}

export const GrantsStatus = { Valid: CheckStatus.Valid, Problems: 'problems' } as const;
export type GrantsStatus = ValueOf<typeof GrantsStatus>;

/** The four texts the grants tool reads. */
export interface GrantsTexts {
  readonly entries: string;
  /** Root slugs, one per line. */
  readonly roots: string;
  /** Picks, one `entry:rule = value` per line. */
  readonly picks: string;
  /** Roll options, one per line, shared with the verdict and statistics tools. */
  readonly facts: string;
}

export type GrantsCheck =
  | {
      readonly status: typeof GrantsStatus.Valid;
      readonly items: readonly GrantRow[];
      readonly duplicates: readonly GrantRow[];
      readonly conditional: readonly ConditionalRow[];
      readonly open: readonly ChoiceRow[];
      readonly answered: readonly ChoiceRow[];
      readonly rollOptions: readonly string[];
      readonly errors: readonly GrantErrorRow[];
    }
  /** Some text does not read; each problem is undefined or empty when its text is fine. */
  | {
      readonly status: typeof GrantsStatus.Problems;
      readonly entries: JsonProblem | undefined;
      /** The 1-based root lines that are not slugs. */
      readonly rootLines: readonly number[];
      readonly pickLines: readonly number[];
      readonly factLines: readonly number[];
    };

interface RootsParse {
  readonly roots: readonly GrantRoot[];
  readonly bad: readonly number[];
}

/** Each filled line as a root the player picked, its slot named after its slug. */
function parseRoots(text: string): RootsParse {
  const lines = text.split(LINE).map((line, index) => ({ text: line.trim(), number: index + 1 }));
  const filled = lines.filter((line) => line.text !== '');
  const bad = filled.filter((line) => !Slug.safeParse(line.text).success).map((line) => line.number);
  const roots = filled.flatMap((line): GrantRoot[] => {
    const slug = Slug.safeParse(line.text);
    return slug.success
      ? [{ entry: idOfSlug(slug.data), hop: { kind: OriginHopKind.Choice, slot: SlotKey.parse(slug.data) } }]
      : [];
  });
  return { roots, bad };
}

/** The slugs of `entries`, each standing for its id. */
function slugTable(entries: readonly PlaygroundEntry[]): SlugTable {
  const slugs = new Map(entries.map((entry) => [idOfSlug(entry.slug), entry.slug]));
  const known = new Set(slugs.values());
  return { idOf: idOfSlug, slugOf: (id) => slugs.get(id), has: (slug) => known.has(slug) };
}

function entryOf({ slug, name, kind, rollOptions, rules }: PlaygroundEntry, table: SlugTable): GrantEntry {
  const converted = rules.map((rule) => choiceSlugsToIds(rule, table));
  return { id: idOfSlug(slug), kind, name, rules: converted, sources: [PLAYGROUND_PAGE], rollOptions };
}

function lookupOf(content: readonly GrantEntry[]): ContentLookup {
  const byId = new Map(content.map((entry) => [entry.id, entry]));
  const byKind = Map.groupBy(content, (entry) => entry.kind);
  return {
    entry: (id: ContentId): GrantEntry | undefined => byId.get(id),
    ofKind: (kind: ContentKind): readonly GrantEntry[] => byKind.get(kind) ?? [],
  };
}

/** Names the granting entries along `hops`, falling back to the id for one that is missing. */
function viaOf(hops: readonly OriginHop[], names: ReadonlyMap<ContentId, string>): string[] {
  return hops.flatMap((hop) => (hop.kind === OriginHopKind.Grant ? [names.get(hop.by) ?? hop.by] : []));
}

function rowsOf(resolution: GrantResolution, names: ReadonlyMap<ContentId, string>, table: SlugTable): GrantsCheck {
  const row = ({ entry, origin }: GrantedItem | ConditionalGrant): GrantRow => ({
    name: entry.name,
    via: viaOf(origin.hops, names),
  });
  const choice = (slot: ChoiceSlot): ChoiceRow =>
    choiceRow(slot, {
      entryName: names.get(slot.origin.entry) ?? slot.origin.entry,
      via: viaOf(slot.origin.hops, names),
      table,
    });
  return {
    status: GrantsStatus.Valid,
    items: resolution.items.map(row),
    duplicates: resolution.duplicates.map(row),
    conditional: resolution.conditional.map((grant) => ({ ...row(grant), summary: grant.summary })),
    open: resolution.open.map(choice),
    answered: resolution.answered.map(choice),
    rollOptions: resolution.rollOptions.map(String),
    errors: resolution.errors.map(({ error, hops }) => ({ error, via: viaOf(hops, names) })),
  };
}

/**
 * Read the entries as JSON, the roots, picks and roll options as lines, then resolve every grant from the roots
 * down. Never throws.
 */
export function checkGrants(texts: GrantsTexts): GrantsCheck {
  const entries = readJson(PlaygroundEntries, texts.entries);
  const table = slugTable(entries.status === CheckStatus.Valid ? entries.value : []);
  const roots = parseRoots(texts.roots);
  const picks = parsePicks(texts.picks, table);
  const facts = parseFacts(texts.facts);
  if (entries.status !== CheckStatus.Valid || roots.bad.length > 0 || picks.bad.length > 0 || 'lines' in facts) {
    return {
      status: GrantsStatus.Problems,
      entries: entries.status === CheckStatus.Valid ? undefined : entries,
      rootLines: roots.bad,
      pickLines: picks.bad,
      factLines: 'lines' in facts ? facts.lines : [],
    };
  }
  const content = entries.value.map((entry) => entryOf(entry, table));
  const names = new Map(content.map((entry) => [entry.id, String(entry.name)]));
  const resolution = resolveGrants({
    roots: roots.roots,
    lookup: lookupOf(content),
    facts: new PredicateFacts(facts.options),
    picks: picks.picks,
  });
  return rowsOf(resolution, names, table);
}
