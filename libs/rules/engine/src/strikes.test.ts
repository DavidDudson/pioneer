import { describe, expect, test } from 'bun:test';

import { applyDamage, DiceExpressionText, DieFace, parseDiceExpression, rollDice } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { DamageAdjustment, Selector, Slug, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { deriveStatistics } from './derive-statistics';
import { StatisticInputsJson } from './statistic-inputs';
import { deriveStrikes } from './strikes';
import type { Strike } from './strikes';
import { wielded } from './testing';

const DEFINITIONS = [
  StatisticDefinition.parse({
    slug: 'statistic:strike',
    name: 'Strike',
    selector: 'strike',
    domains: ['check', 'attack-roll', 'strike-attack-roll'],
    base: '@weapon.attr + @weapon.prof',
    kind: StatisticKind.Check,
    per: 'weapon',
  }),
  StatisticDefinition.parse({
    slug: 'statistic:strike-damage',
    name: 'Strike Damage',
    selector: 'strike-damage',
    domains: ['damage', 'strike-damage'],
    base: '@weapon.damage',
    kind: StatisticKind.Value,
    per: 'weapon',
  }),
];

const LONGSWORD = {
  slug: 'longsword',
  category: 'martial',
  traits: [],
  damage: { dice: 1, die: 'd8', damageType: 'slashing' },
};
const DAGGER = {
  slug: 'dagger',
  category: 'simple',
  traits: ['agile', 'finesse', 'thrown-10'],
  damage: { dice: 1, die: 'd4', damageType: 'piercing' },
};
const SHORTBOW = {
  slug: 'shortbow',
  category: 'martial',
  traits: ['deadly-d10'],
  range: 60,
  damage: { dice: 1, die: 'd6', damageType: 'piercing' },
};
const JEZAIL = {
  slug: 'jezail',
  category: 'martial',
  traits: ['propulsive'],
  range: 30,
  damage: { dice: 1, die: 'd6', damageType: 'bludgeoning' },
};
const BLOWGUN = {
  slug: 'blowgun',
  category: 'simple',
  traits: [],
  range: 20,
  damage: { dice: 1, damageType: 'piercing' },
};
const ALCHEMISTS_FIRE = {
  slug: 'alchemists-fire',
  category: 'simple',
  traits: ['bomb', 'consumable', 'splash'],
  range: 20,
  splash: 1,
  quantity: 3,
  damage: { dice: 1, die: 'd8', damageType: 'fire', persistent: { formula: '1', damageType: 'fire' } },
};
const GLUE_BOMB = {
  slug: 'glue-bomb',
  category: 'simple',
  traits: [],
  range: 20,
  damage: { dice: 0, damageType: 'bludgeoning' },
};

/** What item alterations and adjustments made of a weapon: its materials and property runes. */
interface Made {
  readonly materials?: readonly Slug[];
  readonly propertyRunes?: readonly Slug[];
}

/** `weapon` as item alterations and adjustments made it. */
function madeOf<Weapon extends object>(weapon: Weapon, made: Made): Weapon & Made {
  return { ...weapon, ...made };
}

/** Strikes for `weapons` of a level 1 character with Strength `strength` and Dexterity 3. */
function strikesOf(weapons: readonly object[], strength = 4, made: Made = {}): readonly Strike[] {
  const inputs = StatisticInputsJson.parse({
    level: 1,
    attributes: { str: strength, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: { 'attack:martial': 'trained', 'attack:simple': 'trained' },
    weapons: weapons.map((weapon) => wielded(weapon as { slug: string })),
  });
  const content = { definitions: DEFINITIONS, proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  const results = deriveStatistics(content, inputs, { rules: [], facts: new PredicateFacts([], CORE_NAMESPACES) });
  return deriveStrikes(
    (inputs.weapons ?? []).map((weapon) => madeOf(weapon, made)),
    results,
  );
}

/** A branded number as the plain one a test compares. */
function plain(value: number | undefined): number | undefined {
  return value;
}

function bonusOf(strike: Strike | undefined): number | undefined {
  const bonus = strike?.damage?.bonus;
  return bonus?.ok === true ? bonus.total : undefined;
}

describe('Strike damage', () => {
  test('a melee weapon rolls its dice and adds Strength', () => {
    const [sword] = strikesOf([LONGSWORD]);
    expect(sword?.damage).toMatchObject({ dice: 1, die: 'd8', damageType: 'slashing' });
    expect(bonusOf(sword)).toBe(4);
  });

  test('a thrown weapon adds Strength, a bow adds nothing, a propulsive one half a positive Strength or all a negative one', () => {
    const strikes = strikesOf([DAGGER, SHORTBOW, JEZAIL], 5);
    expect(strikes.map((strike) => bonusOf(strike))).toStrictEqual([5, 0, 2]);
    expect(strikesOf([JEZAIL], -2).map((strike) => bonusOf(strike))).toStrictEqual([-2]);
  });

  test('a striking rune adds a die per grade, and flat damage has none to add', () => {
    const strikes = strikesOf([
      { ...LONGSWORD, striking: 1 },
      { ...LONGSWORD, slug: 'greater', striking: 2 },
      { ...BLOWGUN, striking: 1 },
    ]);
    expect(strikes.map(({ damage }) => plain(damage?.dice))).toStrictEqual([2, 3, 1]);
    expect(strikes[2]?.damage?.die).toBeUndefined();
  });

  test('a bomb carries its persistent and splash damage, and the stack it throws from', () => {
    const [bomb] = strikesOf([ALCHEMISTS_FIRE]);
    expect(bomb?.damage).toMatchObject({
      dice: 1,
      die: 'd8',
      damageType: 'fire',
      splash: 1,
      persistent: { formula: '1', damageType: 'fire' },
    });
    expect(plain(bomb?.weapon.quantity)).toBe(3);
  });

  test('a weapon without splash or persistent damage has neither', () => {
    const [sword] = strikesOf([LONGSWORD]);
    expect(sword?.damage?.splash).toBeUndefined();
    expect(sword?.damage?.persistent).toBeUndefined();
  });

  test('a weapon with no dice and no die does no damage', () => {
    expect(strikesOf([GLUE_BOMB])[0]?.damage).toBeUndefined();
  });

  test('each weapon has its own flat damage statistic', () => {
    const [sword, dagger] = strikesOf([LONGSWORD, DAGGER]);
    expect(bonusOf(sword)).toBe(4);
    expect(bonusOf(dagger)).toBe(4);
    expect(sword?.attack).toMatchObject({ ok: true, selector: Selector.parse('strike:longsword') });
    expect(dagger?.damage?.bonus).toMatchObject({ selector: Selector.parse('strike-damage:dagger') });
  });
});

describe('the multiple attack penalty', () => {
  test('is -5 and -10, or -4 and -8 with an agile weapon', () => {
    const [sword, dagger] = strikesOf([LONGSWORD, DAGGER]);
    expect([sword?.map.second, sword?.map.third].map((penalty) => plain(penalty))).toStrictEqual([-5, -10]);
    expect([dagger?.map.second, dagger?.map.third].map((penalty) => plain(penalty))).toStrictEqual([-4, -8]);
  });
});

const WEREWOLF = {
  weaknesses: [],
  resistances: [DamageAdjustment.parse({ type: 'physical', value: 5, exceptions: ['silver'] })],
  immunities: [],
};

/** The materials and runes a longsword made as `made` deals damage as, as plain text. */
function countsOf(made: Made): readonly string[] {
  return (strikesOf([LONGSWORD], 4, made)[0]?.damage?.counts ?? []).map(String);
}

/** The damage a Strike of `weapon` does to the werewolf on a roll of 7. */
function takenBy(weapon: object, made: Made = {}): number | undefined {
  const [strike] = strikesOf([weapon], 4, made);
  const outcome = parseDiceExpression(DiceExpressionText.parse('1d8[slashing]'));
  if (!outcome.ok || strike?.damage === undefined) {
    return undefined;
  }
  const rolled = rollDice(outcome.expression, scriptedRandom([DieFace.parse(7)]));
  return applyDamage(rolled, WEREWOLF, { critical: false, counts: strike.damage.counts }).taken;
}

describe('Strike damage counts', () => {
  test('a plain weapon counts as nothing, so a resistance to physical damage applies', () => {
    expect(countsOf({})).toEqual([]);
    expect(takenBy(LONGSWORD)).toBe(2);
  });

  test('a silver weapon counts as silver, and a resistance that excepts silver does not apply', () => {
    const silver = { materials: [Slug.parse('silver')] };

    expect(countsOf(silver)).toEqual(['silver']);
    expect(takenBy(LONGSWORD, silver)).toBe(7);
  });

  test('a weapon counts as its property runes too', () => {
    const ghostly = { materials: [Slug.parse('cold-iron')], propertyRunes: [Slug.parse('ghost-touch')] };

    expect(countsOf(ghostly)).toEqual(['cold-iron', 'ghost-touch']);
  });
});
