import { statisticContent, StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticContent, StatisticInputs, StatisticResult } from '@pioneer/rules/engine';
import { Attribute, ContentRegistry, Proficiency } from '@pioneer/rules/sdk';
import type { ContentPack, Selector } from '@pioneer/rules/sdk';
import { constantFrom, integer, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { coreRules } from './index';

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

/** A level 3 fighter in a breastplate (Dexterity cap +1). */
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
  },
  dexterityCap: 1,
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
export const SELECTORS = [...DEFENCES, ...SKILL_SELECTORS];

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

/** Generated inputs as JSON, with the values AC reads kept beside them. */
interface GeneratedInputs {
  readonly json: object;
  readonly ac: Proficiency;
  readonly dex: number;
  readonly cap: number;
  readonly level: number;
  /** The rank given to every skill. */
  readonly skill: Proficiency;
}

/** Inputs with every attribute, every core rank and the Dexterity cap generated. */
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
}).map(({ level, str, dex, con, int, wis, cha, cap, ac, fortitude, reflex, will, perception, skill }) => ({
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
  },
  ac,
  dex,
  cap,
  level,
  skill,
}));
