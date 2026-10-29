import { ContentKind, EntrySlug } from '@pioneer/rules/sdk';
import type { EnrichmentMapping } from '@pioneer/rules/sdk';

/** An action written "(Creature) Ability": the stat block ability of the creature in the parentheses. */
const CREATURE_ACTION = /^\((?<creature>[^)]+)\)\s+\S/u;

/** The entry slug a name would have: lowercase words joined by hyphens, apostrophes and diacritics dropped. */
function creatureSlug(name: string): EntrySlug | undefined {
  const words = name
    .normalize('NFKD')
    .replaceAll(/[\p{M}'’]/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, '-')
    .replaceAll(/^-|-$/gu, '');
  const parsed = EntrySlug.safeParse(`${ContentKind.Creature}:${words}`);
  return parsed.success ? parsed.data : undefined;
}

/** What the rule decided for one pack's "(Creature) Ability" actions. */
export interface CreatureActionProposals {
  /** Action slug to the mapping of its creature's page (many actions to one creature). */
  readonly proposals: ReadonlyMap<EntrySlug, EnrichmentMapping>;
  /** Actions with a parenthetical that is not exactly one mapped creature of the pack; none are guessed. */
  readonly excepted: readonly EntrySlug[];
}

/**
 * Maps each "(Creature) Ability" action to the AoN URL and page of its creature, since AoN has no row of its own for the
 * ability (it sits in the stat block). The parenthetical must be, word for word, the name of a creature of the same pack
 * that already has an AoN URL. A family with several rows ("Horned Dragon" with adult and ancient), a creature with a
 * role, a creature of another pack, a creature without a URL and a parenthetical that is not a creature (a trait,
 * "Mythic") are all left out: two candidates, or none, is an exception.
 */
export function proposeCreatureActions(
  actions: readonly { readonly slug: EntrySlug; readonly name: string }[],
  creatures: ReadonlyMap<EntrySlug, EnrichmentMapping>,
  mapped: ReadonlySet<EntrySlug>,
): CreatureActionProposals {
  const proposals = new Map<EntrySlug, EnrichmentMapping>();
  const excepted: EntrySlug[] = [];
  const unmapped = actions.filter(({ slug }) => !mapped.has(slug));
  for (const { slug, name } of unmapped) {
    const parenthetical = CREATURE_ACTION.exec(name)?.groups?.['creature'];
    if (parenthetical !== undefined) {
      const creatureSlugOfName = creatureSlug(parenthetical);
      const creature = creatureSlugOfName === undefined ? undefined : creatures.get(creatureSlugOfName);
      if (creature?.aon === undefined) {
        excepted.push(slug);
      } else {
        proposals.set(slug, creature);
      }
    }
  }
  return { proposals, excepted };
}
