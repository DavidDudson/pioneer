import { contentId, ContentId, PackId, Slug } from '@pioneer/rules/sdk';

import type { AncestryBoosts, Boost, BoostContent } from '../attribute-boosts';

const ALL: Boost = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** The id of `<slug>` in the boost fixtures' pack. */
export function boostFixtureId(slug: string): ContentId {
  return ContentId.parse(contentId(PackId.parse('boost-fixtures'), Slug.parse(slug)));
}

/** A dwarf (Con and Wis fixed, one free boost, a Charisma flaw) and a human (two free boosts). */
const ANCESTRIES = new Map<ContentId, AncestryBoosts>([
  [boostFixtureId('dwarf'), { boosts: [['con'], ['wis'], ALL], flaws: ['cha'] }],
  [boostFixtureId('human'), { boosts: [ALL, ALL], flaws: [] }],
]);
/** A farmhand: Constitution or Wisdom, then a free boost. */
const BACKGROUNDS = new Map<ContentId, readonly Boost[]>([[boostFixtureId('farmhand'), [['con', 'wis'], ALL]]]);
/** A fighter keys off Strength or Dexterity; a wizard off Intelligence alone. */
const CLASSES = new Map<ContentId, Boost>([
  [boostFixtureId('fighter'), ['str', 'dex']],
  [boostFixtureId('wizard'), ['int']],
]);

/** Boost content for tests: two ancestries, a background and two classes, ids from `boostFixtureId`. */
export const BOOST_FIXTURES: BoostContent = {
  ancestry: (id) => ANCESTRIES.get(id),
  background: (id) => BACKGROUNDS.get(id),
  keyAttribute: (id) => CLASSES.get(id),
};
