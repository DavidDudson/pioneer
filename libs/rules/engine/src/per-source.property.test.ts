import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import {
  ModifierType,
  Proficiency,
  Selector,
  StatisticDefinition,
  StatisticKind,
  WeaponCategory,
} from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { array, assert, boolean, constantFrom, integer, option, property, record, uniqueArray } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { LineStatusKind } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { StatisticInputsJson } from './statistic-inputs';
import { flatModifier, inPlay, wielded } from './testing';

const ATTRIBUTE_MIN = -5;
const ATTRIBUTE_MAX = 7;
const LEVEL_MAX = 20;
const POTENCY_MAX = 4;
const WEAPONS_MAX = 6;
const RANGE = 60;

/** Proficiency bonus before level, per rank (Player Core). */
const RANK_BONUS: Readonly<Record<Proficiency, number>> = {
  [Proficiency.Untrained]: 0,
  [Proficiency.Trained]: 2,
  [Proficiency.Expert]: 4,
  [Proficiency.Master]: 6,
  [Proficiency.Legendary]: 8,
};

const STRIKE = StatisticDefinition.parse({
  slug: 'statistic:strike',
  name: 'Strike',
  selector: 'strike',
  domains: ['attack-roll'],
  base: '@weapon.attr + @weapon.prof',
  kind: StatisticKind.Check,
  per: 'weapon',
});

interface GeneratedWeapon {
  readonly slug: string;
  readonly category: WeaponCategory;
  readonly finesse: boolean;
  readonly ranged: boolean;
  readonly potency: number | null;
}

const weapon: Arbitrary<GeneratedWeapon> = record({
  slug: constantFrom('longsword', 'dagger', 'shortbow', 'fist', 'rapier', 'sling', 'club', 'bomb'),
  category: constantFrom(...Object.values(WeaponCategory)),
  finesse: boolean(),
  ranged: boolean(),
  potency: option(integer({ min: 1, max: POTENCY_MAX })),
});

const attribute = integer({ min: ATTRIBUTE_MIN, max: ATTRIBUTE_MAX });
const proficiency = constantFrom(...Object.values(Proficiency));

const character = record({
  level: integer({ min: 1, max: LEVEL_MAX }),
  str: attribute,
  dex: attribute,
  weapons: uniqueArray(weapon, { maxLength: WEAPONS_MAX, selector: ({ slug }) => slug }),
  ranks: record({
    unarmed: proficiency,
    simple: proficiency,
    martial: proficiency,
    advanced: proficiency,
  }),
});

function weaponJson({ slug, category, finesse, ranged, potency }: GeneratedWeapon): object {
  return wielded({
    slug,
    category,
    traits: finesse ? ['finesse'] : [],
    ...(ranged ? { range: RANGE } : {}),
    ...(potency === null ? {} : { potency }),
  });
}

/** Player Core: Dexterity at range, the better of Strength and Dexterity with finesse, else Strength. */
function attackModifier({ finesse, ranged }: GeneratedWeapon, str: number, dex: number): number {
  if (ranged) {
    return dex;
  }
  return finesse ? Math.max(str, dex) : str;
}

describe('Strikes derived per weapon (properties)', () => {
  test('each weapon has one Strike: its attack attribute, its category proficiency and its potency line', () => {
    assert(
      property(character, ({ level, str, dex, weapons, ranks }) => {
        const inputs = StatisticInputsJson.parse({
          level,
          attributes: { str, dex, con: 0, int: 0, wis: 0, cha: 0 },
          ranks: Object.fromEntries(Object.entries(ranks).map(([category, rank]) => [`attack:${category}`, rank])),
          weapons: weapons.map((generated) => weaponJson(generated)),
        });
        const results = deriveStatistics(
          { definitions: [STRIKE], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
          inputs,
        );
        const expected = Object.fromEntries(
          weapons.map((generated) => {
            const rank = ranks[generated.category];
            const bonus = rank === Proficiency.Untrained ? 0 : RANK_BONUS[rank] + level;
            const total = attackModifier(generated, str, dex) + bonus + (generated.potency ?? 0);
            return [`strike:${generated.slug}`, total];
          }),
        );
        const totals: Record<string, unknown> = Object.fromEntries(
          [...results].map(([selector, result]) => [selector, result.ok && result.total]),
        );
        expect(totals).toStrictEqual(expected);
      }),
    );
  });
});

/** Item bonuses to attack rolls from rule elements, such as a mutagen's, on the Strike's domain or on everything. */
const itemBonuses = array(
  record({ value: integer({ min: 1, max: POTENCY_MAX }), target: constantFrom('attack-roll', 'all') }),
  { maxLength: 3 },
);

describe('weapon potency stacking (properties)', () => {
  test("a Strike's total never counts two item bonuses: only the highest of its potency and the rest applies", () => {
    assert(
      property(weapon, itemBonuses, (generated, bonuses) => {
        const inputs = StatisticInputsJson.parse({
          level: 1,
          attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
          ranks: {},
          weapons: [weaponJson(generated)],
        });
        const rules = bonuses.map(({ value, target }, index) =>
          inPlay(flatModifier(ModifierType.Item, value, [target]), `item-bonus-${index}`),
        );
        const result = deriveStatistics(
          { definitions: [STRIKE], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
          inputs,
          { rules, facts: new PredicateFacts([], CORE_NAMESPACES) },
        ).get(Selector.parse(`strike:${generated.slug}`));
        const lines = result?.ok === true ? result.lines : [];
        const applied = lines.filter(
          ({ modifier, status }) => modifier.type === ModifierType.Item && status.kind === LineStatusKind.Applied,
        );
        const highest = Math.max(0, generated.potency ?? 0, ...bonuses.map(({ value }) => value));
        expect(applied.length).toBeLessThanOrEqual(1);
        expect(result?.ok === true ? result.total - result.baseValue : undefined).toBe(highest);
      }),
    );
  });
});
