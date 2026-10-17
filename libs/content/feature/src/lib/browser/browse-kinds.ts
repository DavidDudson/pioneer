import { ContentKind, facetsFor } from '@pioneer/rules/sdk';
import type { FacetDefinition, RegisteredKind } from '@pioneer/rules/sdk';

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
  ContentKind.Treasure,
  ContentKind.Weapon,
] as const satisfies readonly RegisteredKind[];
export type BrowseKind = (typeof BROWSE_KINDS)[number];

/** What the list shows when the link names no kind. */
export const DEFAULT_KINDS: readonly BrowseKind[] = [ContentKind.Feat];

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
  [ContentKind.Treasure]: 'content.kind.treasure',
  [ContentKind.Weapon]: 'content.kind.weapon',
};

/** The query param that names the kinds: `kind=feat,spell`. */
export const KIND_PARAM = 'kind';
const KIND_SEPARATOR = ',';

/** The kinds a link names, in browser order; unknown ones are dropped, and none left means the default. */
export function kindsFromQuery(text: unknown): readonly BrowseKind[] {
  const first: unknown = Array.isArray(text) ? text[0] : text;
  const named = typeof first === 'string' ? new Set(first.split(KIND_SEPARATOR)) : new Set<string>();
  const kinds = BROWSE_KINDS.filter((kind) => named.has(kind));
  return kinds.length === 0 ? DEFAULT_KINDS : kinds;
}

/** The query value for `kinds`. */
export function kindsToQuery(kinds: readonly BrowseKind[]): string {
  return BROWSE_KINDS.filter((kind) => kinds.includes(kind)).join(KIND_SEPARATOR);
}

/**
 * The facets for a list of `kinds`: the common ones and each kind's. A facet that reads only some kinds (weapon group)
 * is left out unless the list holds one of them.
 */
export function facetsOf(kinds: readonly BrowseKind[]): readonly FacetDefinition[] {
  return facetsFor(kinds).filter(
    (facet) => facet.appliesTo === undefined || facet.appliesTo.some((kind) => kinds.some((held) => held === kind)),
  );
}

/** Every facet any browsable list can have, so a link's params for a facet the new list drops can be cleared. */
export const ALL_FACETS: readonly FacetDefinition[] = facetsFor(BROWSE_KINDS);

/** Whether the browser lists `kind`. */
export function isBrowseKind(kind: ContentKind): kind is BrowseKind {
  return BROWSE_KINDS.some((browsed) => browsed === kind);
}
