import { ContentKind, facetsFor } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, FacetDefinition, RegisteredKind } from '@pioneer/rules/sdk';
import { entryTarget, featActionKind, PrerequisiteState, richTextWords } from '@pioneer/rules/ui';
import type { Chip, FeatFacts } from '@pioneer/rules/ui';

import { firstQueryText } from './query-text';
import type { QueryText } from './query-text';

/** Kinds the browser lists: the ones with facets declared (content-model.md, "Filters"). Others join as they get them. */
export const BROWSE_KINDS = [
  ContentKind.Action,
  ContentKind.Armor,
  ContentKind.Consumable,
  ContentKind.Creature,
  ContentKind.Equipment,
  ContentKind.Feat,
  ContentKind.Kit,
  ContentKind.Rune,
  ContentKind.Shield,
  ContentKind.Spell,
  ContentKind.Statistic,
  ContentKind.Treasure,
  ContentKind.Weapon,
] as const satisfies ReadonlyArray<RegisteredKind>;

export type BrowseKind = (typeof BROWSE_KINDS)[number];

/** What the list shows when the link names no kind. */
export const DEFAULT_KINDS: ReadonlyArray<BrowseKind> = [ContentKind.Feat];

/** The message key of each kind's name, spelled out in full so the key check sees them. */
export const KIND_MESSAGES: Readonly<Record<BrowseKind, string>> = {
  [ContentKind.Action]: 'content.kind.action',
  [ContentKind.Armor]: 'content.kind.armor',
  [ContentKind.Consumable]: 'content.kind.consumable',
  [ContentKind.Creature]: 'content.kind.creature',
  [ContentKind.Equipment]: 'content.kind.equipment',
  [ContentKind.Feat]: 'content.kind.feat',
  [ContentKind.Kit]: 'content.kind.kit',
  [ContentKind.Rune]: 'content.kind.rune',
  [ContentKind.Shield]: 'content.kind.shield',
  [ContentKind.Spell]: 'content.kind.spell',
  [ContentKind.Statistic]: 'content.kind.statistic',
  [ContentKind.Treasure]: 'content.kind.treasure',
  [ContentKind.Weapon]: 'content.kind.weapon',
};

/** The query param that names the kinds: `kind=feat,spell`. */
export const KIND_PARAM = 'kind';
const KIND_SEPARATOR = ',';

/** The kinds a link names, in browser order; unknown ones are dropped, and none left means the default. */
export function kindsFromQuery(text: QueryText): ReadonlyArray<BrowseKind> {
  const first = firstQueryText(text);
  const named = new Set(first?.split(KIND_SEPARATOR));
  const kinds = BROWSE_KINDS.filter((kind) => named.has(kind));

  return kinds.length === 0 ? DEFAULT_KINDS : kinds;
}

/** The query value for `kinds`. */
export function kindsToQuery(kinds: ReadonlyArray<BrowseKind>): string {
  return BROWSE_KINDS.filter((kind) => kinds.includes(kind)).join(KIND_SEPARATOR);
}

/**
 * The facets for a list of `kinds`: the common ones and each kind's. A facet that reads only some kinds (weapon group)
 * is left out unless the list holds one of them.
 */
export function facetsOf(kinds: ReadonlyArray<BrowseKind>): ReadonlyArray<FacetDefinition> {
  return facetsFor(kinds).filter(
    (facet) => facet.appliesTo === undefined || facet.appliesTo.some((kind) => kinds.some((held) => held === kind)),
  );
}

/** Every facet any browsable list can have, so a link's params for a facet the new list drops can be cleared. */
export const ALL_FACETS: ReadonlyArray<FacetDefinition> = facetsFor(BROWSE_KINDS);

/** Whether the browser lists `kind`. */
export function isBrowseKind(kind: ContentKind): kind is BrowseKind {
  return BROWSE_KINDS.some((browsed) => browsed === kind);
}

/**
 * What `FEAT_PROPERTIES` read from a feat, or nothing for an entry of another kind. The browser has no character, so
 * each prerequisite is unknown, never met or unmet (ADR-0002).
 */
export function browseFeat(
  entry: ContentEntry,
  traits: ReadonlyArray<Chip>,
  nameOf: (id: ContentId) => string | undefined,
): FeatFacts | undefined {
  if (entry.kind !== ContentKind.Feat) {
    return undefined;
  }

  const printed = entry.data.prerequisites;
  const prerequisites = printed === undefined ? '' : richTextWords(printed, nameOf);

  return {
    id: entry.id,
    entry: entry.id,
    name: entry.name,
    to: entryTarget(entry),
    level: entry.level,
    traits,
    sources: entry.sources,
    category: entry.data.category,
    action: featActionKind(entry),
    rarity: entry.rarity,
    prerequisites: prerequisites === '' ? [] : [{ label: prerequisites, state: PrerequisiteState.Unknown }],
    note: undefined,
  };
}
