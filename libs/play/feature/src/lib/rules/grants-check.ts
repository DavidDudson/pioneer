import { resolveGrants } from '@pioneer/rules/grants';
import type { ConditionalGrant, GrantEntry, GrantedItem, GrantResolution, GrantRoot } from '@pioneer/rules/grants';
import { PredicateFacts } from '@pioneer/rules/predicate';
import type { PredicateSummary } from '@pioneer/rules/predicate';
import {
  contentId,
  ContentId,
  ContentText,
  OriginHopKind,
  PackId,
  RuleElement,
  RuleElementKey,
  SlotKey,
  Slug,
  SourceRef,
} from '@pioneer/rules/sdk';
import type { OriginHop } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

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

/** An entry as the playground takes it: a slug, a name and its rule elements. */
const PlaygroundEntry = z.strictObject({
  slug: Slug,
  name: ContentText,
  rules: z.array(z.preprocess(slugGrantToId, RuleElement)),
});
type PlaygroundEntry = z.output<typeof PlaygroundEntry>;

const PlaygroundEntries = z.array(PlaygroundEntry);

/** An entry in a result, with the entries whose grants led to it, outermost first. */
interface GrantRow {
  readonly name: string;
  readonly via: readonly string[];
}

export interface ConditionalRow extends GrantRow {
  readonly summary: PredicateSummary;
}

interface GrantErrorRow {
  readonly error: MessageDescriptor;
  readonly via: readonly string[];
}

export const GrantsStatus = { Valid: CheckStatus.Valid, Problems: 'problems' } as const;
export type GrantsStatus = ValueOf<typeof GrantsStatus>;

/** The three texts the grants tool reads. */
export interface GrantsTexts {
  readonly entries: string;
  /** Root slugs, one per line. */
  readonly roots: string;
  /** Roll options, one per line, shared with the verdict and statistics tools. */
  readonly facts: string;
}

export type GrantsCheck =
  | {
      readonly status: typeof GrantsStatus.Valid;
      readonly items: readonly GrantRow[];
      readonly duplicates: readonly GrantRow[];
      readonly conditional: readonly ConditionalRow[];
      readonly errors: readonly GrantErrorRow[];
    }
  /** Some text does not read; each problem is undefined or empty when its text is fine. */
  | {
      readonly status: typeof GrantsStatus.Problems;
      readonly entries: JsonProblem | undefined;
      /** The 1-based root lines that are not slugs. */
      readonly rootLines: readonly number[];
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

function entryOf({ slug, name, rules }: PlaygroundEntry): GrantEntry {
  return { id: idOfSlug(slug), name, rules, sources: [PLAYGROUND_PAGE] };
}

/** Names the granting entries along `hops`, falling back to the id for one that is missing. */
function viaOf(hops: readonly OriginHop[], names: ReadonlyMap<ContentId, string>): string[] {
  return hops.flatMap((hop) => (hop.kind === OriginHopKind.Grant ? [names.get(hop.by) ?? hop.by] : []));
}

function rowsOf(resolution: GrantResolution, names: ReadonlyMap<ContentId, string>): GrantsCheck {
  const row = ({ entry, origin }: GrantedItem | ConditionalGrant): GrantRow => ({
    name: entry.name,
    via: viaOf(origin.hops, names),
  });
  return {
    status: GrantsStatus.Valid,
    items: resolution.items.map(row),
    duplicates: resolution.duplicates.map(row),
    conditional: resolution.conditional.map((grant) => ({ ...row(grant), summary: grant.summary })),
    errors: resolution.errors.map(({ error, hops }) => ({ error, via: viaOf(hops, names) })),
  };
}

/**
 * Read the entries as JSON, the roots and roll options as lines, then resolve every grant from the roots down.
 * Never throws.
 */
export function checkGrants(texts: GrantsTexts): GrantsCheck {
  const entries = readJson(PlaygroundEntries, texts.entries);
  const roots = parseRoots(texts.roots);
  const facts = parseFacts(texts.facts);
  if (entries.status !== CheckStatus.Valid || roots.bad.length > 0 || 'lines' in facts) {
    return {
      status: GrantsStatus.Problems,
      entries: entries.status === CheckStatus.Valid ? undefined : entries,
      rootLines: roots.bad,
      factLines: 'lines' in facts ? facts.lines : [],
    };
  }
  const content = entries.value.map((entry) => entryOf(entry));
  const byId = new Map(content.map((entry) => [entry.id, entry]));
  const names = new Map(content.map((entry) => [entry.id, String(entry.name)]));
  const resolution = resolveGrants({
    roots: roots.roots,
    lookup: (id) => byId.get(id),
    facts: new PredicateFacts(facts.options),
  });
  return rowsOf(resolution, names);
}
