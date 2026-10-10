import { statisticContent, StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticContent, StatisticInputs, StatisticResult } from '@pioneer/rules/engine';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { Attribute, ContentRegistry, Proficiency } from '@pioneer/rules/sdk';
import type { ContentPack, Selector } from '@pioneer/rules/sdk';
import { constantFrom, integer, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { coreRulesPack } from '../json-packs';

/** The core rules pack as the catalog loads it from `content/packs/core-rules`. */
export const coreRules: ContentPack = await coreRulesPack();

/* Fixtures shared by the core rules pack's tests. */

const ATTRIBUTE_MIN = -5;
const ATTRIBUTE_MAX = 7;
const LEVEL_MAX = 20;
export const AC_BASE = 10;
/** Proficiency bonus before level, per rank (Player Core). */
export const RANK_BONUS: Readonly<Record<Proficiency, number>> = {
  [Proficiency.Untrained]: 0,
  [Proficiency.Trained]: 2,
  [Proficiency.Expert]: 4,
  [Proficiency.Master]: 6,
  [Proficiency.Legendary]: 8,
};

/** A level 3 human fighter in a breastplate (Dexterity cap +1), Strength as the key attribute. */
export const fighter: StatisticInputs = StatisticInputsJson.parse({
  level: 3,
  attributes: { str: 4, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
  ranks: {
    ac: 'trained',
    'save:fortitude': 'expert',
    'save:reflex': 'expert',
    'save:will': 'trained',
    perception: 'expert',
    'skill:athletics': 'trained',
    'skill:lore:farming': 'trained',
    'class-dc': 'trained',
  },
  dexterityCap: 1,
  ancestry: { hitPoints: 8, speed: 25 },
  class: { hitPoints: 10, keyAttribute: 'str' },
});

const DEFENCES = ['ac', 'save:fortitude', 'save:reflex', 'save:will', 'perception'];

/** Each Player Core skill and its key attribute. */
export const SKILLS: Readonly<Record<string, Attribute>> = {
  acrobatics: Attribute.Dexterity,
  arcana: Attribute.Intelligence,
  athletics: Attribute.Strength,
  crafting: Attribute.Intelligence,
  deception: Attribute.Charisma,
  diplomacy: Attribute.Charisma,
  intimidation: Attribute.Charisma,
  medicine: Attribute.Wisdom,
  nature: Attribute.Wisdom,
  occultism: Attribute.Intelligence,
  performance: Attribute.Charisma,
  religion: Attribute.Wisdom,
  society: Attribute.Intelligence,
  stealth: Attribute.Dexterity,
  survival: Attribute.Wisdom,
  thievery: Attribute.Dexterity,
};

export const SKILL_SELECTORS = Object.keys(SKILLS).map((slug) => `skill:${slug}`);
/** The statistics whose base ends in a proficiency bonus, `@prof`. */
export const PROFICIENCY_SELECTORS = [...DEFENCES, ...SKILL_SELECTORS, 'class-dc'];
export const SELECTORS = [...PROFICIENCY_SELECTORS, 'hp:max', 'speed:land'];

/** What a derivation reads from a registry holding `packs`, as an app would load them. */
export function contentOf(...packs: readonly ContentPack[]): StatisticContent {
  const registry = new ContentRegistry();
  for (const pack of packs) {
    registry.register(pack);
  }
  const content = statisticContent(registry);
  if (content === undefined) {
    throw new Error('No pack defines the proficiency bonus table');
  }
  return content;
}

export const core = contentOf(coreRules);

export function totals(results: ReadonlyMap<Selector, StatisticResult>): Record<string, number | undefined> {
  return Object.fromEntries([...results].map(([selector, result]) => [selector, result.ok ? result.total : undefined]));
}

const proficiency: Arbitrary<Proficiency> = constantFrom(...Object.values(Proficiency));
const attribute: Arbitrary<number> = integer({ min: ATTRIBUTE_MIN, max: ATTRIBUTE_MAX });
/** Player Core ancestries and classes give 6 to 12 Hit Points; ancestries give a 20 to 30 foot Speed. */
const HIT_POINTS_MIN = 6;
const HIT_POINTS_MAX = 12;
const SPEED_MIN = 20;
const SPEED_MAX = 30;
const hitPoints: Arbitrary<number> = integer({ min: HIT_POINTS_MIN, max: HIT_POINTS_MAX });
const ancestrySpeed: Arbitrary<number> = integer({ min: SPEED_MIN, max: SPEED_MAX });
const keyAttribute: Arbitrary<Attribute> = constantFrom(...Object.values(Attribute));

/** Generated inputs as JSON, with the values AC reads kept beside them. */
interface GeneratedInputs {
  readonly json: object;
  readonly ac: Proficiency;
  readonly dex: number;
  readonly cap: number;
  readonly level: number;
  /** The rank given to every skill. */
  readonly skill: Proficiency;
  readonly con: number;
  readonly ancestryHp: number;
  readonly classHp: number;
}

/** Inputs with every attribute, every core rank, the Dexterity cap, and an ancestry and class generated. */
export const anyInputs: Arbitrary<GeneratedInputs> = record({
  level: integer({ min: 1, max: LEVEL_MAX }),
  str: attribute,
  dex: attribute,
  con: attribute,
  int: attribute,
  wis: attribute,
  cha: attribute,
  cap: attribute,
  ac: proficiency,
  fortitude: proficiency,
  reflex: proficiency,
  will: proficiency,
  perception: proficiency,
  skill: proficiency,
  ancestryHp: hitPoints,
  speed: ancestrySpeed,
  classHp: hitPoints,
  key: keyAttribute,
}).map(
  ({ level, str, dex, con, int, wis, cha, cap, ac, fortitude, reflex, will, perception, skill, ...character }) => ({
    json: {
      level,
      attributes: { str, dex, con, int, wis, cha },
      ranks: {
        ac,
        'save:fortitude': fortitude,
        'save:reflex': reflex,
        'save:will': will,
        perception,
        ...Object.fromEntries(SKILL_SELECTORS.map((selector) => [selector, skill])),
      },
      dexterityCap: cap,
      ancestry: { hitPoints: character.ancestryHp, speed: character.speed },
      class: { hitPoints: character.classHp, keyAttribute: character.key },
    },
    ac,
    dex,
    cap,
    level,
    skill,
    con,
    ancestryHp: character.ancestryHp,
    classHp: character.classHp,
  }),
);

/** No roll options, read through the core rules pack's namespace table, as a derivation for a bare character would. */
export function noFacts(): PredicateFacts {
  const registry = new ContentRegistry();
  registry.register(coreRules);
  return new PredicateFacts([], registry.rollOptionNamespaces());
}
