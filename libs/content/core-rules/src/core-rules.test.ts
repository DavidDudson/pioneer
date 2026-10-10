import { describe, expect, test } from 'bun:test';

import { deriveStatistics, RuleInPlay, StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticInputs, StatisticResult } from '@pioneer/rules/engine';
import { PredicateFacts } from '@pioneer/rules/predicate';
import {
  Attribute,
  ContentLicense,
  ContentPack,
  contentId,
  ContentRegistry,
  Proficiency,
  Selector,
  Slug,
  StatisticKind,
} from '@pioneer/rules/sdk';
import { assert, constantFrom, integer, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { coreRules } from './index';

const ATTRIBUTE_MIN = -5;
const ATTRIBUTE_MAX = 7;
const LEVEL_MAX = 20;
const AC_BASE = 10;
/** Proficiency bonus before level, per rank (Player Core). */
const RANK_BONUS: Readonly<Record<Proficiency, number>> = {
  [Proficiency.Untrained]: 0,
  [Proficiency.Trained]: 2,
  [Proficiency.Expert]: 4,
  [Proficiency.Master]: 6,
  [Proficiency.Legendary]: 8,
};
/** How many times the level adds to the proficiency bonus: none when untrained. */
const LEVEL_TIMES: Readonly<Record<Proficiency, number>> = {
  [Proficiency.Untrained]: 0,
  [Proficiency.Trained]: 1,
  [Proficiency.Expert]: 1,
  [Proficiency.Master]: 1,
  [Proficiency.Legendary]: 1,
};

/** A level 3 fighter in a breastplate (Dexterity cap +1). */
const fighter: StatisticInputs = StatisticInputsJson.parse({
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
const SKILLS: Readonly<Record<string, Attribute>> = {
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

const SKILL_SELECTORS = Object.keys(SKILLS).map((slug) => `skill:${slug}`);
const SELECTORS = [...DEFENCES, ...SKILL_SELECTORS];

/** The Lore pattern: a pack that grants a Lore brings its own statistic (rules-engine.md). */
const farmingLore = ContentPack.define({
  manifest: { id: 'lore-test', title: 'Lore test', publisher: 'Pioneer', license: ContentLicense.Homebrew },
  ancestries: [],
  creatures: [],
  statistics: [
    {
      slug: 'farming-lore',
      name: 'Farming Lore',
      selector: 'skill:lore:farming',
      domains: ['check', 'skill-check', 'int-based', 'lore'],
      base: '@attr.int + @prof.skill.lore.farming',
      kind: StatisticKind.Check,
      keyAttribute: Attribute.Intelligence,
    },
  ],
});

function totals(results: ReadonlyMap<Selector, StatisticResult>): Record<string, number | undefined> {
  return Object.fromEntries([...results].map(([selector, result]) => [selector, result.ok ? result.total : undefined]));
}

/** A +1 status bonus to everything in `target`, as a rule on a test entry. */
function bonusTo(target: string): RuleInPlay {
  return RuleInPlay.parse({
    element: { key: 'FlatModifier', type: 'status', value: 1, selectors: [target] },
    origin: {
      hops: [],
      entry: contentId(coreRules.id, Slug.parse('test-bonus')),
      sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    },
    rule: 0,
  });
}

/** Which of `statistics` a +1 to `target` raises, sorted. */
function reachedBy(target: string, statistics = coreRules.statistics): readonly string[] {
  const without = totals(deriveStatistics(statistics, fighter));
  const facts = new PredicateFacts([]);
  const withBonus = totals(deriveStatistics(statistics, fighter, { rules: [bonusTo(target)], facts }));
  return Object.keys(without)
    .filter((selector) => withBonus[selector] !== without[selector])
    .toSorted();
}

function sorted(selectors: readonly string[]): readonly string[] {
  return selectors.toSorted();
}

function skillsKeyedTo(attribute: Attribute): readonly string[] {
  return Object.entries(SKILLS).flatMap(([slug, key]) => (key === attribute ? [`skill:${slug}`] : []));
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
const anyInputs: Arbitrary<GeneratedInputs> = record({
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

describe('core rules pack', () => {
  test('registers with no duplicate selectors', () => {
    const registry = new ContentRegistry();
    registry.register(coreRules);
    for (const selector of SELECTORS) {
      expect(registry.statisticsFor(Selector.parse(selector))).toHaveLength(1);
    }
    expect(registry.statistics()).toHaveLength(SELECTORS.length);
  });

  test('derives AC, the saves and Perception for a level 3 fighter', () => {
    expect(totals(deriveStatistics(coreRules.statistics, fighter))).toMatchObject({
      ac: 16,
      'save:fortitude': 9,
      'save:reflex': 9,
      'save:will': 6,
      perception: 8,
    });
  });

  test('keys every skill to its Player Core attribute', () => {
    const derived = totals(deriveStatistics(coreRules.statistics, fighter));
    const expected = Object.fromEntries(
      Object.entries(SKILLS).map(([slug, key]) => [`skill:${slug}`, fighter.attributes.get(key)]),
    );
    // Trained in Athletics at level 3: Strength 4 plus 2 plus 3.
    expect(derived).toMatchObject({ ...expected, 'skill:athletics': 9 });
  });

  test('domains route modifiers to the right statistics', () => {
    expect(reachedBy('saving-throw')).toStrictEqual(sorted(['save:fortitude', 'save:reflex', 'save:will']));
    expect(reachedBy('skill-check')).toStrictEqual(sorted(SKILL_SELECTORS));
    expect(reachedBy('check')).toStrictEqual(sorted(SELECTORS.filter((selector) => selector !== 'ac')));
    expect(reachedBy('dex-based')).toStrictEqual(sorted(['ac', 'save:reflex', ...skillsKeyedTo(Attribute.Dexterity)]));
    expect(reachedBy('wis-based')).toStrictEqual(
      sorted(['save:will', 'perception', ...skillsKeyedTo(Attribute.Wisdom)]),
    );
    expect(reachedBy('int-based')).toStrictEqual(sorted(skillsKeyedTo(Attribute.Intelligence)));
    expect(reachedBy('all')).toStrictEqual(sorted(SELECTORS));
  });

  test('a Lore from another pack derives beside the skills and takes skill bonuses', () => {
    const statistics = [...coreRules.statistics, ...farmingLore.statistics];
    // Trained at level 3 with Intelligence 0.
    expect(totals(deriveStatistics(statistics, fighter))['skill:lore:farming']).toBe(5);
    expect(reachedBy('skill-check', statistics)).toStrictEqual(sorted([...SKILL_SELECTORS, 'skill:lore:farming']));
    expect(reachedBy('lore', statistics)).toStrictEqual(sorted(['skill:lore:farming']));
  });

  test('every statistic derives for any attributes and ranks; AC and the skills follow their formulas', () => {
    assert(
      property(anyInputs, ({ json, ac, dex, cap, level, skill }) => {
        const inputs = StatisticInputsJson.parse(json);
        const derived = totals(deriveStatistics(coreRules.statistics, inputs));
        expect(Object.values(derived).every((total) => total !== undefined)).toBe(true);
        const prof = (rank: Proficiency): number => RANK_BONUS[rank] + LEVEL_TIMES[rank] * level;
        expect(derived['ac']).toBe(AC_BASE + Math.min(dex, cap) + prof(ac));
        for (const [slug, key] of Object.entries(SKILLS)) {
          expect(derived[`skill:${slug}`]).toBe(inputs.attributes.get(key) + prof(skill));
        }
      }),
    );
  });
});
