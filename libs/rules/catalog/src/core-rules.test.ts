import { describe, expect, test } from 'bun:test';

import { deriveStatistics, RuleInPlay, StatisticInputsJson } from '@pioneer/rules/engine';
import {
  Attribute,
  ContentLicense,
  ContentPack,
  contentId,
  ContentRegistry,
  HitPoints,
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
  coreRules,
  fighter,
  noFacts,
  PER_SOURCE_SELECTORS,
  RANK_BONUS,
  SELECTORS,
  SKILL_SELECTORS,
  SKILLS,
  STRIKES,
  totals,
  wizard,
} from './testing/core-rules';

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
      sources: [{ kind: 'book', book: 'player-core', page: 240, aon: 'https://2e.aonprd.com/Skills.aspx?ID=41' }],
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
function reachedBy(target: string, content = core, character = fighter): readonly string[] {
  const without = totals(deriveStatistics(content, character));
  const facts = noFacts();
  const withBonus = totals(deriveStatistics(content, character, { rules: [bonusTo(target)], facts }));
  return Object.keys(without)
    .filter((selector) => withBonus[selector] !== without[selector])
    .toSorted();
}

/** A statistic's failure with its message key, pointing at `position` in its base. */
function failure(key: string, position: number): object {
  return { ok: false, error: { key }, position };
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
    const selectors = [...SELECTORS, ...PER_SOURCE_SELECTORS];
    for (const selector of selectors) {
      expect(registry.statisticsFor(Selector.parse(selector))).toHaveLength(1);
    }
    expect(registry.statistics()).toHaveLength(selectors.length);
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

  test('derives Hit Points, Speed and class DC from the ancestry and class', () => {
    // Human 8 plus (fighter 10 plus Constitution 2) times level 3; trained class DC 10 plus Strength 4 plus 5.
    expect(totals(deriveStatistics(core, fighter))).toMatchObject({ 'hp:max': 44, 'speed:land': 25, 'class-dc': 19 });
  });

  test('class DC reads the key attribute chosen for the class', () => {
    const intelligent = { ...fighter, class: { hitPoints: HitPoints.parse(6), keyAttribute: Attribute.Intelligence } };
    // Intelligence 0 in place of Strength 4.
    expect(totals(deriveStatistics(core, intelligent))['class-dc']).toBe(15);
  });

  test('without an ancestry or class, the statistics reading them fail at that reference', () => {
    const { ancestry: _ancestry, class: _class, ...unchosen } = fighter;
    const derived = deriveStatistics(core, unchosen);
    expect(derived.get(Selector.parse('hp:max'))).toMatchObject(failure('engine.statistic.noAncestry', 1));
    expect(derived.get(Selector.parse('speed:land'))).toMatchObject(failure('engine.statistic.noAncestry', 1));
    expect(derived.get(Selector.parse('class-dc'))).toMatchObject(failure('engine.statistic.noClass', 6));
    expect(totals(derived)).toMatchObject({ ac: 16, perception: 8 });
  });

  test('with an ancestry but no class, Hit Points fail at the class reference and Speed derives', () => {
    const { class: _class, ...ancestryOnly } = fighter;
    const derived = deriveStatistics(core, ancestryOnly);
    // `@class.hp` starts at position 17 of `@ancestry.hp + (@class.hp + @attr.con) * @level`.
    expect(derived.get(Selector.parse('hp:max'))).toMatchObject(failure('engine.statistic.noClass', 17));
    expect(totals(derived)['speed:land']).toBe(25);
  });

  test('derives one Strike per weapon', () => {
    // Longsword: Strength 4 plus expert 7 plus potency 1. Dagger: finesse, but Strength 4 beats Dexterity 2.
    expect(totals(deriveStatistics(core, fighter))).toMatchObject({ 'strike:longsword': 12, 'strike:dagger': 11 });
  });

  test("an agile finesse dagger uses Dexterity once it's higher, and a dropped weapon's Strike goes", () => {
    const nimble = StatisticInputsJson.parse({
      level: 3,
      attributes: { str: 1, dex: 4, con: 0, int: 0, wis: 0, cha: 0 },
      ranks: { 'attack:simple': 'expert' },
      weapons: [{ slug: 'dagger', category: 'simple', traits: ['agile', 'finesse'] }],
    });
    const derived = totals(deriveStatistics(core, nimble));
    expect(derived['strike:dagger']).toBe(4 + 7);
    expect(derived['strike:longsword']).toBeUndefined();
  });

  test("derives a spell attack and DC per entry, the DC from its own entry's attack", () => {
    // Arcane: Intelligence 4 plus trained 5. Innate occult: Charisma 1 plus trained 5.
    expect(totals(deriveStatistics(core, wizard))).toMatchObject({
      'spell-attack:arcane': 9,
      'spell-dc:arcane': 19,
      'spell-attack:innate': 6,
      'spell-dc:innate': 16,
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
    const notRolled = new Set(['ac', 'class-dc', 'hp:max', 'speed:land']);
    const checks = SELECTORS.filter((selector) => !notRolled.has(selector));
    expect(reachedBy('check')).toStrictEqual(sorted([...checks, ...STRIKES]));
    expect(reachedBy('attack-roll')).toStrictEqual(sorted(STRIKES));
    expect(reachedBy('strike-attack-roll')).toStrictEqual(sorted(STRIKES));
    expect(reachedBy('str-based')).toStrictEqual(sorted([...skillsKeyedTo(Attribute.Strength), ...STRIKES]));
    expect(reachedBy('hp')).toStrictEqual(['hp:max']);
    expect(reachedBy('speed')).toStrictEqual(['speed:land']);
    expect(reachedBy('all-speeds')).toStrictEqual(['speed:land']);
    expect(reachedBy('land-speed')).toStrictEqual(['speed:land']);
    expect(reachedBy('class')).toStrictEqual(['class-dc']);
    expect(reachedBy('dex-based')).toStrictEqual(sorted(['ac', 'save:reflex', ...skillsKeyedTo(Attribute.Dexterity)]));
    expect(reachedBy('wis-based')).toStrictEqual(
      sorted(['save:will', 'perception', ...skillsKeyedTo(Attribute.Wisdom)]),
    );
    expect(reachedBy('int-based')).toStrictEqual(sorted(skillsKeyedTo(Attribute.Intelligence)));
    expect(reachedBy('all')).toStrictEqual(sorted([...SELECTORS, ...STRIKES]));
  });

  test('spell domains route to the spell attack or the DC, and the attribute domain to both', () => {
    const arcane = ['spell-attack:arcane', 'spell-dc:arcane'];
    expect(reachedBy('spell-attack-roll', core, wizard)).toStrictEqual(['spell-attack:arcane', 'spell-attack:innate']);
    expect(reachedBy('attack-roll', core, wizard)).toStrictEqual(['spell-attack:arcane', 'spell-attack:innate']);
    expect(reachedBy('spell-dc', core, wizard)).toStrictEqual(['spell-dc:arcane', 'spell-dc:innate']);
    expect(reachedBy('int-based', core, wizard)).toStrictEqual(
      sorted([...arcane, ...skillsKeyedTo(Attribute.Intelligence)]),
    );
  });

  test('a Lore from another pack derives beside the skills and takes skill bonuses', () => {
    const statistics = contentOf(coreRules, farmingLore);
    // Trained at level 3 with Intelligence 0.
    expect(totals(deriveStatistics(statistics, fighter))['skill:lore:farming']).toBe(5);
    expect(reachedBy('skill-check', statistics)).toStrictEqual(sorted([...SKILL_SELECTORS, 'skill:lore:farming']));
    expect(reachedBy('lore', statistics)).toStrictEqual(sorted(['skill:lore:farming']));
  });

  test('every statistic derives for any inputs; AC, Hit Points and the skills follow their formulas', () => {
    assert(
      property(anyInputs, ({ json, ac, dex, cap, level, skill, con, ancestryHp, classHp }) => {
        const inputs = StatisticInputsJson.parse(json);
        const derived = totals(deriveStatistics(core, inputs));
        expect(Object.values(derived).every((total) => total !== undefined)).toBe(true);
        const prof = (rank: Proficiency): number => RANK_BONUS[rank] + LEVEL_TIMES[rank] * level;
        expect(derived['ac']).toBe(AC_BASE + Math.min(dex, cap) + prof(ac));
        expect(derived['hp:max']).toBe(ancestryHp + (classHp + con) * level);
        for (const [slug, key] of Object.entries(SKILLS)) {
          expect(derived[`skill:${slug}`]).toBe(inputs.attributes.get(key) + prof(skill));
        }
      }),
    );
  });
});
