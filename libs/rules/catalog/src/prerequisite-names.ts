import { kindOption } from '@pioneer/rules/grants';
import { ContentKind, slugName } from '@pioneer/rules/sdk';
import type { ContentEntry, RollOption } from '@pioneer/rules/sdk';

/**
 * The kinds a prerequisite names by their name: other feats, ancestry features, ancestries, heritages, classes and
 * deities. Backgrounds, spells and the rest share names with these (Warrior, Untamed Form) but no prerequisite means
 * them. Class features are left out: an archetype gives a muse, order or school without the class feature (Bard
 * Dedication has no muse to pick yet), so `feature:warrior` would read as false for a character who meets it. A
 * class feature that is also a feat (Shield Block) grants the feat, which names it.
 */
export const NAMED_KINDS: readonly ContentKind[] = [
  ContentKind.Feat,
  ContentKind.AncestryFeature,
  ContentKind.Ancestry,
  ContentKind.Heritage,
  ContentKind.Class,
  ContentKind.Deity,
];

/** The statistics a rank prerequisite names: skills, Lores and Perception. */
const RANKED_SELECTOR = /^(?:skill:|perception$)/u;
/** A name with a class in brackets: "incredible companion (druid)". */
const VARIANT_NAME = /^(?<base>.+) \([^()]+\)$/u;

/** An entry a prerequisite can name: its kind and the option its kind sets on the character. */
export interface NamedEntry {
  readonly kind: ContentKind;
  readonly option: RollOption;
}

/** Entries a prerequisite can name, by lowercase name, and the statistic selectors ranks are read from. */
export interface PrerequisiteNames {
  readonly entries: ReadonlyMap<string, readonly NamedEntry[]>;
  /**
   * Entries whose name has a class in brackets, by the name without it: "incredible companion" is Incredible Companion
   * (Druid) and Incredible Companion (Ranger), either of which meets it.
   */
  readonly variants: ReadonlyMap<string, readonly NamedEntry[]>;
  readonly statistics: ReadonlyMap<string, string>;
}

/** Lowercase, straight apostrophes, single spaces, no closing full stop. */
export function normalise(words: string): string {
  return words.replaceAll('’', "'").replaceAll(/\s+/gu, ' ').trim().replace(/\.$/u, '').toLowerCase();
}

/** Adds `named` under `name`, once. */
function addNamed(names: Map<string, NamedEntry[]>, name: string, named: NamedEntry): void {
  const known = names.get(name) ?? [];
  if (!known.some(({ option }) => option === named.option)) {
    names.set(name, [...known, named]);
  }
}

/** The option `entry` sets as a kind a prerequisite names; undefined for any other kind. */
function namedEntry(entry: ContentEntry): NamedEntry | undefined {
  const option = NAMED_KINDS.includes(entry.kind) ? kindOption(entry.kind, slugName(entry.slug)) : undefined;
  return option === undefined ? undefined : { kind: entry.kind, option };
}

/** The selector of a statistic a rank prerequisite names; undefined for any other entry. */
function rankedSelector(entry: ContentEntry): string | undefined {
  return entry.kind === ContentKind.Statistic && RANKED_SELECTOR.test(entry.data.selector)
    ? entry.data.selector
    : undefined;
}

/** The maps a pass fills while it indexes entries. */
interface NameIndex {
  readonly entries: Map<string, NamedEntry[]>;
  readonly variants: Map<string, NamedEntry[]>;
  readonly statistics: Map<string, string>;
}

/** Indexes `entry` by its name: as a named kind, under its name without brackets too, or as a ranked statistic. */
function index(names: NameIndex, entry: ContentEntry): void {
  const name = normalise(entry.name);
  const selector = rankedSelector(entry);
  if (selector !== undefined) {
    names.statistics.set(name, selector);
  }
  const named = namedEntry(entry);
  if (named === undefined) {
    return;
  }
  addNamed(names.entries, name, named);
  const base = VARIANT_NAME.exec(name)?.groups?.['base'];
  if (base !== undefined) {
    addNamed(names.variants, base, named);
  }
}

/** What a prerequisite can name among `entries`, built once for a whole pass. */
export function prerequisiteNames(entries: readonly ContentEntry[]): PrerequisiteNames {
  const names: NameIndex = { entries: new Map(), variants: new Map(), statistics: new Map() };
  for (const entry of entries) {
    index(names, entry);
  }
  return names;
}
