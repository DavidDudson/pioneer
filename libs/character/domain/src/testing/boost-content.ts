import { contentId, ContentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

import type { AncestryBoosts, Boost, BoostContent } from '../attribute-boosts';

const ALL: Boost = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** The id of `<kind>:<name>` in the boost fixtures' pack. */
export function boostFixtureId(slug: string): ContentId {
  return ContentId.parse(contentId(PackId.parse('boost-fixtures'), EntrySlug.parse(slug)));
}

/** A dwarf (Con and Wis fixed, one free boost, a Charisma flaw) and a human (two free boosts). */
const ANCESTRIES = new Map<ContentId, AncestryBoosts>([
  [boostFixtureId('ancestry:dwarf'), { boosts: [['con'], ['wis'], ALL], flaws: ['cha'] }],
  [boostFixtureId('ancestry:human'), { boosts: [ALL, ALL], flaws: [] }],
]);
/** A farmhand: Constitution or Wisdom, then a free boost. */
const BACKGROUNDS = new Map<ContentId, readonly Boost[]>([
  [boostFixtureId('background:farmhand'), [['con', 'wis'], ALL]],
]);
/** A fighter keys off Strength or Dexterity; a wizard off Intelligence alone. */
const CLASSES = new Map<ContentId, Boost>([
  [boostFixtureId('class:fighter'), ['str', 'dex']],
  [boostFixtureId('class:wizard'), ['int']],
]);

/** Boost content for tests: two ancestries, a background and two classes, ids from `boostFixtureId`. */
export const BOOST_FIXTURES: BoostContent = {
  ancestry: (id) => ANCESTRIES.get(id),
  background: (id) => BACKGROUNDS.get(id),
  keyAttribute: (id) => CLASSES.get(id),
  keyAttributeOptions: () => [],
};
