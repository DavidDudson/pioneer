import { describe, expect, test } from 'bun:test';

import { deriveStatistics, RuleInPlay, StatisticInputsJson } from '@pioneer/rules/engine';
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
  VariantRuleId,
} from '@pioneer/rules/sdk';
import { assert, property } from 'fast-check';

import {
  AC_BASE,
  anyInputs,
  contentOf,
  core,
  fighter,
  RANK_BONUS,
  SELECTORS,
  SKILL_SELECTORS,
  SKILLS,
  totals,
} from './fixtures';
import { coreRules } from './index';

/** How many times the level adds to the proficiency bonus: none when untrained. */
const LEVEL_TIMES: Readonly<Record<Proficiency, number>> = {
  [Proficiency.Untrained]: 0,
  [Proficiency.Trained]: 1,
  [Proficiency.Expert]: 1,
  [Proficiency.Master]: 1,
  [Proficiency.Legendary]: 1,
};

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
function reachedBy(target: string, content = core): readonly string[] {
  const without = totals(deriveStatistics(content, fighter));
  const facts = new PredicateFacts([]);
  const withBonus = totals(deriveStatistics(content, fighter, { rules: [bonusTo(target)], facts }));
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

describe('core rules pack', () => {
  test('registers with no duplicate selectors', () => {
    const registry = new ContentRegistry();
    registry.register(coreRules);
    for (const selector of SELECTORS) {
      expect(registry.statisticsFor(Selector.parse(selector))).toHaveLength(1);
    }
    expect(registry.statistics()).toHaveLength(SELECTORS.length);
    const withoutLevel = contentId(coreRules.id, Slug.parse('proficiency-without-level'));
    expect(registry.variantRules().map(({ id }) => id)).toStrictEqual([VariantRuleId.parse(withoutLevel)]);
  });

  test('derives AC, the saves and Perception for a level 3 fighter', () => {
    expect(totals(deriveStatistics(core, fighter))).toMatchObject({
      ac: 16,
      'save:fortitude': 9,
      'save:reflex': 9,
      'save:will': 6,
      perception: 8,
    });
  });

  test('keys every skill to its Player Core attribute', () => {
    const derived = totals(deriveStatistics(core, fighter));
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
    const statistics = contentOf(coreRules, farmingLore);
    // Trained at level 3 with Intelligence 0.
    expect(totals(deriveStatistics(statistics, fighter))['skill:lore:farming']).toBe(5);
    expect(reachedBy('skill-check', statistics)).toStrictEqual(sorted([...SKILL_SELECTORS, 'skill:lore:farming']));
    expect(reachedBy('lore', statistics)).toStrictEqual(sorted(['skill:lore:farming']));
  });

  test('every statistic derives for any attributes and ranks; AC and the skills follow their formulas', () => {
    assert(
      property(anyInputs, ({ json, ac, dex, cap, level, skill }) => {
        const inputs = StatisticInputsJson.parse(json);
        const derived = totals(deriveStatistics(core, inputs));
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
