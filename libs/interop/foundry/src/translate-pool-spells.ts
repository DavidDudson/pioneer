import { ContentId, contentId, EntrySlug, PackId, RuleElementKey } from '@pioneer/rules/sdk';

import { CURRICULA } from './school-curricula';

/**
 * The spells Player Core's pools of slots take, as `PoolSpells` elements by the entry slug they go on (ADR-0045).
 * Foundry keeps no pools: a divine font is a spellcasting entry the player fills by hand, and a school's curriculum is
 * a table in its description. Spells are named by slug, in the pack being imported, or `pack:slug` in another.
 */

const DIVINE_FONT = 'divine-font';
const CURRICULUM = 'curriculum';

interface PoolFields {
  readonly entry: string;
  readonly pool: string;
  readonly spells: readonly string[];
}

/** A spell named `slug` in the pack being imported, or `pack:slug` in another one. */
function spellId(pack: PackId, spell: string): ContentId {
  const [other, slug] = spell.includes(':') ? spell.split(':') : [undefined, spell];
  const owner = other === undefined ? pack : PackId.parse(other);
  return ContentId.parse(contentId(owner, EntrySlug.parse(`spell:${slug}`)));
}

function poolSpells(pack: PackId, { entry, pool, spells }: PoolFields, predicate?: readonly string[]): object {
  return {
    key: RuleElementKey.PoolSpells,
    entry,
    pool,
    spells: spells.map((spell) => spellId(pack, spell)),
    ...(predicate === undefined ? {} : { predicate }),
  };
}

/** Heal in a healing font, harm in a harmful one: the font the Divine Font `ChoiceSet` picks (`divine-font:<font>`). */
function divineFont(pack: PackId): readonly object[] {
  return ['heal', 'harm'].map((font) =>
    poolSpells(pack, { entry: 'cleric', pool: DIVINE_FONT, spells: [font] }, [`${DIVINE_FONT}:${font}`]),
  );
}

/** The `PoolSpells` elements the entry with `slug` gains in `pack`, if any. */
export function poolSpellRules(slug: string, pack: PackId): readonly object[] {
  if (slug === `class-feature:${DIVINE_FONT}`) {
    return divineFont(pack);
  }
  const school = CURRICULA.get(slug.replace(/^class-feature:/u, ''));
  return school === undefined ? [] : [poolSpells(pack, { entry: 'wizard', pool: CURRICULUM, spells: school.flat() })];
}
