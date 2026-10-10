import { resolveGrants } from '@pioneer/rules/grants';
import type {
  ChoiceSlot,
  ConditionalGrant,
  ContentLookup,
  GrantEntry,
  GrantedItem,
  GrantResolution,
} from '@pioneer/rules/grants';
import { kindOf } from '@pioneer/rules/predicate';
import type { NamespaceTable, PredicateSummary } from '@pioneer/rules/predicate';
import {
  contentId,
  ContentId,
  ContentKind,
  ContentKindSchema,
  ContentText,
  Level,
  NamespaceKind,
  OriginHopKind,
  PackId,
  RollOption,
  RuleElement,
  RuleElementKey,
  Slug,
  SourceRef,
} from '@pioneer/rules/sdk';
import type { OriginHop } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { choiceRow, choiceSlugsToIds, parsePicks } from './grant-choices';
import type { ChoiceRow, PicksParse, SlugTable } from './grant-choices';
import { parseRoots } from './grant-roots';
import type { EntrySlugs, RootsParse } from './grant-roots';
import { parseToggles, toggleRow } from './grant-toggles';
import type { ToggleRow, TogglesParse } from './grant-toggles';
import { parseFacts } from './predicate-verdict';
import type { FactsParse } from './predicate-verdict';
import { CheckStatus, readJson } from './rules-check';
import type { JsonProblem, JsonRead } from './rules-check';

/** Entries typed into the playground live in a made-up pack, so a slug names one. */
const PLAYGROUND_PACK = PackId.parse('playground');
const PLAYGROUND_PAGE = SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 });

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

export const GrantsStatus = { Valid: CheckStatus.Valid, Problems: 'problems', Pending: 'pending' } as const;
export type GrantsStatus = ValueOf<typeof GrantsStatus>;

/** What the grants tool reads: four texts and the level. */
export interface GrantsTexts {
  readonly entries: string;
  /** Root slugs, one per line, a condition's with its value if it has one: `frightened 2`. */
  readonly roots: string;
  /** Picks, one `entry:rule = value` per line. */
  readonly picks: string;
  /** Toggles, one `entry:rule = on`, `off` or a suboption per line. */
  readonly toggles: string;
  /** Roll options, one per line, shared with the verdict and statistics tools; only situational ones are read. */
  readonly facts: string;
  readonly level: number;
}

export type GrantsCheck =
  /** The core rules pack's roll option namespaces have not loaded yet, so nothing resolves. */
  | { readonly status: typeof GrantsStatus.Pending }
  | {
      readonly status: typeof GrantsStatus.Valid;
      readonly items: readonly GrantRow[];
      readonly duplicates: readonly GrantRow[];
      readonly conditional: readonly ConditionalRow[];
      readonly open: readonly ChoiceRow[];
      readonly answered: readonly ChoiceRow[];
      readonly toggles: readonly ToggleRow[];
      /** Every roll option the set derives, level included. */
      readonly rollOptions: readonly string[];
      readonly errors: readonly GrantErrorRow[];
    }
  /** Some text does not read; each problem is undefined or empty when its text is fine. */
  | {
      readonly status: typeof GrantsStatus.Problems;
      readonly entries: JsonProblem | undefined;
      /** The 1-based root lines that are not slugs, or give a value to anything but a condition. */
      readonly rootLines: readonly number[];
      readonly pickLines: readonly number[];
      readonly toggleLines: readonly number[];
      readonly factLines: readonly number[];
      /** Whether the level is outside what a level can be. */
      readonly badLevel: boolean;
    };

/** The slugs of `entries`, each standing for its id. */
function slugTable(entries: readonly PlaygroundEntry[]): SlugTable {
  const slugs = new Map(entries.map((entry) => [idOfSlug(entry.slug), entry.slug]));
  const known = new Set(slugs.values());
  return { idOf: idOfSlug, slugOf: (id) => slugs.get(id), has: (slug) => known.has(slug) };
}

function entryOf({ slug, name, kind, rollOptions, rules }: PlaygroundEntry, table: SlugTable): GrantEntry {
  const converted = rules.map((rule) => choiceSlugsToIds(rule, table));
  return { id: idOfSlug(slug), kind, slug, name, rules: converted, sources: [PLAYGROUND_PAGE], rollOptions };
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
    toggles: resolution.toggles.map((toggle) => toggleRow(toggle, table)),
    rollOptions: resolution.rollOptions.map(String),
    errors: resolution.errors.map(({ error, hops }) => ({ error, via: viaOf(hops, names) })),
  };
}

/**
 * Whether a typed roll option is about the moment. The level field and the entries set the character's own facts
 * (`self:level:5`, `feature:bravery`), so typing one in the shared box must not put it on the character.
 */
function isSituational(option: RollOption, namespaces: NamespaceTable): boolean {
  return kindOf(option, namespaces) === NamespaceKind.Situational;
}

/** The line texts and the level, each read; the level is undefined when it is not one. */
interface ReadTexts {
  readonly roots: RootsParse;
  readonly picks: PicksParse;
  readonly toggles: TogglesParse;
  readonly facts: FactsParse;
  readonly level: Level | undefined;
}

/** The slugs of `entries`, and which of them are conditions. */
function entrySlugs(entries: readonly PlaygroundEntry[]): EntrySlugs {
  const conditions = entries.filter((entry) => entry.kind === ContentKind.Condition).map((entry) => entry.slug);
  return { table: slugTable(entries), conditions: new Set(conditions) };
}

function readTexts(texts: GrantsTexts, slugs: EntrySlugs): ReadTexts {
  const level = Level.safeParse(texts.level);
  return {
    roots: parseRoots(texts.roots, slugs),
    picks: parsePicks(texts.picks, slugs.table),
    toggles: parseToggles(texts.toggles, slugs.table),
    facts: parseFacts(texts.facts),
    level: level.success ? level.data : undefined,
  };
}

/** Each text's problem, for texts some of which do not read. */
function problemsOf(
  entries: JsonRead<PlaygroundEntry[]>,
  { roots, picks, toggles, facts, level }: ReadTexts,
): GrantsCheck {
  return {
    status: GrantsStatus.Problems,
    entries: entries.status === CheckStatus.Valid ? undefined : entries,
    rootLines: roots.bad,
    pickLines: picks.bad,
    toggleLines: toggles.bad,
    factLines: 'lines' in facts ? facts.lines : [],
    badLevel: level === undefined,
  };
}

/**
 * Read the entries as JSON, the roots, picks, toggles and roll options as lines, then resolve every grant from the
 * roots down at the level given, until the facts the set derives settle, reading roll options with `namespaces`. Never
 * throws.
 */
export function checkGrants(texts: GrantsTexts, namespaces: NamespaceTable): GrantsCheck {
  const entries = readJson(PlaygroundEntries, texts.entries);
  const slugs = entrySlugs(entries.status === CheckStatus.Valid ? entries.value : []);
  const read = readTexts(texts, slugs);
  const { roots, picks, toggles, facts, level } = read;
  const badLines = [roots.bad, picks.bad, toggles.bad].some((bad) => bad.length > 0);
  if (entries.status !== CheckStatus.Valid || level === undefined || 'lines' in facts || badLines) {
    return problemsOf(entries, read);
  }
  const content = entries.value.map((entry) => entryOf(entry, slugs.table));
  const names = new Map(content.map((entry) => [entry.id, String(entry.name)]));
  const resolution = resolveGrants({
    roots: roots.roots,
    lookup: lookupOf(content),
    level,
    situation: facts.options.filter((option) => isSituational(option, namespaces)),
    picks: picks.picks,
    toggles: toggles.toggles,
    namespaces,
  });
  return rowsOf(resolution, names, slugs.table);
}
