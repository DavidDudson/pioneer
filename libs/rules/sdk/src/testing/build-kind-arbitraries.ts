import { array, constant, constantFrom, oneof, record, shuffledSubarray, tuple, uniqueArray } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { Attribute } from '../attribute';
import { DeityCategory, DivineFont, Sanctification, SanctificationModal } from '../deity';
import { SPELL_RANK_MAX } from '../spell-rank';
import { skillSelectorText } from './arbitraries';
import { contentIdJson, LIST_MAX, size, slugText, smallint, withOptional } from './json-arbitraries';

/** The most boosts the ancestry schema allows. */
const ANCESTRY_BOOSTS_MAX = 4;

const attributes: Arbitrary<string[]> = shuffledSubarray(Object.values(Attribute));
const boost: Arbitrary<string[]> = shuffledSubarray(Object.values(Attribute), { minLength: 1 });
const contentIds: Arbitrary<string[]> = uniqueArray(contentIdJson, { maxLength: LIST_MAX });

export const ancestryData: Arbitrary<object> = withOptional(
  record({
    hitPoints: smallint,
    size,
    speed: smallint,
    boosts: array(boost, { maxLength: ANCESTRY_BOOSTS_MAX }),
    flaws: attributes,
    languages: contentIds,
    additionalLanguages: record({ count: smallint, options: contentIds }),
    reach: smallint,
  }),
  { vision: contentIdJson },
);

export const heritageData: Arbitrary<object> = withOptional(constant({}), { ancestry: contentIdJson });
export const backgroundData: Arbitrary<object> = record({ boosts: array(boost, { maxLength: 2 }) });
export const classData: Arbitrary<object> = record({
  keyAttribute: boost,
  hitPoints: smallint,
  additionalSkills: smallint,
});
export const archetypeData: Arbitrary<object> = withOptional(record({ dedication: contentIdJson }), {
  multiclass: contentIdJson,
});

const slugs: Arbitrary<string[]> = uniqueArray(slugText, { maxLength: LIST_MAX });
const deityCategory: Arbitrary<string> = constantFrom(
  ...Object.values(DeityCategory).filter((category) => category !== DeityCategory.Philosophy),
);
const fonts: Arbitrary<string[]> = shuffledSubarray(Object.values(DivineFont));
const skills: Arbitrary<string[]> = uniqueArray(skillSelectorText, { maxLength: LIST_MAX });
const SPELL_RANKS = Array.from({ length: SPELL_RANK_MAX }, (_unused, index) => index + 1);
const deitySpell = (rank: number): Arbitrary<object> => record({ rank: constant(rank), spell: contentIdJson });
/** Spells at distinct ranks. */
const deitySpells: Arbitrary<object[]> = shuffledSubarray(SPELL_RANKS, { maxLength: SPELL_RANK_MAX }).chain((ranks) =>
  tuple(...ranks.map((rank) => deitySpell(rank))),
);
const sanctificationModal: Arbitrary<string> = constantFrom(...Object.values(SanctificationModal));
const sanctified: Arbitrary<string[]> = shuffledSubarray(Object.values(Sanctification), { minLength: 1 });
const deityData: Arbitrary<object> = withOptional(
  record({
    category: deityCategory,
    domains: record({ primary: slugs, alternate: slugs }),
    font: fonts,
    attributes,
    skills,
    weapons: slugs,
    spells: deitySpells,
  }),
  { sanctification: record({ modal: sanctificationModal, what: sanctified }) },
);
/** A philosophy grants no font, domains or spells. */
const philosophyData: Arbitrary<object> = withOptional(
  record({
    category: constant(DeityCategory.Philosophy),
    domains: constant({ primary: [], alternate: [] }),
    font: constant([]),
    attributes,
    skills,
    weapons: slugs,
    spells: constant([]),
  }),
  { sanctification: record({ modal: sanctificationModal, what: sanctified }) },
);

/** A deity's `data`, philosophies included. */
export const deityOrPhilosophyData: Arbitrary<object> = oneof(deityData, philosophyData);
