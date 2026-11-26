import { describe, expect, test } from 'bun:test';

import {
  Attribute,
  AttributeModifier,
  CompanionSkill,
  CompanionStatBlock,
  CompanionTier,
  DamageType,
  DiceCount,
  DieSize,
  Feet,
  HitPoints,
  Level,
  Modifier,
  Proficiency,
  RuleSlug,
  Size,
} from '@pioneer/rules/sdk';

import { CompanionSource } from './companion-statistic-types';
import type { CompanionStatistics } from './companion-statistic-types';
import { deriveCompanionStatistics } from './companion-statistics';

/** What a rank adds beyond the level, and whether the level counts at all: untrained does not. */
const RANK_BONUS: Readonly<Record<Proficiency, { readonly step: number; readonly level: number }>> = {
  [Proficiency.Untrained]: { step: 0, level: 0 },
  [Proficiency.Trained]: { step: 2, level: 1 },
  [Proficiency.Expert]: { step: 4, level: 1 },
  [Proficiency.Master]: { step: 6, level: 1 },
  [Proficiency.Legendary]: { step: 8, level: 1 },
};

/** Player Core's table: level plus two per rank step, and nothing when untrained. */
function proficiencyAt(level: number): (rank: Proficiency) => Modifier {
  return (rank) => Modifier.parse(RANK_BONUS[rank].level * level + RANK_BONUS[rank].step);
}

const bear = CompanionStatBlock.parse({
  size: Size.Medium,
  attributes: { str: 2, dex: 1, con: 2, int: -4, wis: 1, cha: 0 },
  ancestryHp: 8,
  extraSkill: CompanionSkill.Survival,
  speed: 35,
  attacks: [
    {
      slug: 'jaws',
      attribute: Attribute.Strength,
      damage: { dice: 1, die: DieSize.D8, damageType: DamageType.Piercing },
    },
  ],
});

function derive(level: number, tiers: readonly CompanionTier[]): CompanionStatistics {
  return deriveCompanionStatistics({
    level: Level.parse(level),
    block: bear,
    tiers: new Set(tiers),
    proficiencyBonus: proficiencyAt(level),
  });
}

describe('a young companion at level 3', () => {
  const young = derive(3, []);

  test('has the type’s block and six Hit Points a level plus Constitution', () => {
    expect(young.hitPoints.total).toBe(HitPoints.parse(32));
    expect(young.size).toBe(Size.Medium);
    expect(young.speed).toBe(Feet.parse(35));
  });

  test('has AC of 10, Dexterity and its trained unarmored defence', () => {
    expect(young.armorClass.total).toBe(Modifier.parse(16));
  });

  test('is trained in saves and Perception', () => {
    expect([young.fortitude.total, young.reflex.total, young.will.total, young.perception.total]).toStrictEqual([
      Modifier.parse(7),
      Modifier.parse(6),
      Modifier.parse(6),
      Modifier.parse(6),
    ]);
  });

  test('is trained in Acrobatics, Athletics and the type’s skill only', () => {
    expect(Object.keys(young.skills).toSorted()).toStrictEqual(['acrobatics', 'athletics', 'survival']);
    expect(young.skills.athletics?.total).toBe(Modifier.parse(7));
  });

  test('strikes with its attribute and trained proficiency, for one die', () => {
    const [jaws] = young.strikes;
    expect(jaws?.attack.total).toBe(Modifier.parse(7));
    expect(jaws?.dice).toBe(DiceCount.parse(1));
    expect(jaws?.damage.total).toBe(Modifier.parse(2));
  });

  test('names the source of every line in a breakdown', () => {
    const sources = young.hitPoints.lines.map((line) => line.source);
    expect(sources).toStrictEqual([CompanionSource.StatBlock, CompanionSource.Level, CompanionSource.Attribute]);
    expect(young.armorClass.lines.map((line) => line.source)).toStrictEqual([
      CompanionSource.Base,
      CompanionSource.Attribute,
      CompanionSource.Proficiency,
    ]);
  });
});

describe('a mature companion at level 5', () => {
  const mature = derive(5, [CompanionTier.Mature]);

  test('grows a size and gains a point in four attributes', () => {
    expect(mature.size).toBe(Size.Large);
    expect(mature.attributes.str.total).toBe(Modifier.parse(3));
    expect(mature.attributes.dex.total).toBe(Modifier.parse(2));
    expect(mature.attributes.cha.total).toBe(Modifier.parse(0));
  });

  test('is expert in saves and Perception', () => {
    expect(mature.fortitude.total).toBe(Modifier.parse(12));
    expect(mature.perception.total).toBe(Modifier.parse(11));
  });

  test('trains Intimidation and Stealth, and raises the skill the type trained', () => {
    expect(mature.skills.intimidation?.total).toBe(Modifier.parse(7));
    expect(mature.skills.stealth?.total).toBe(Modifier.parse(9));
    expect(mature.skills.survival?.total).toBe(Modifier.parse(11));
  });

  test('rolls two dice', () => {
    expect(mature.strikes[0]?.dice).toBe(DiceCount.parse(2));
  });

  test('names the tier on the lines it adds', () => {
    const tiers = mature.attributes.str.lines.filter((line) => line.source === CompanionSource.Tier);
    expect(tiers.map((line) => line.tier)).toStrictEqual([CompanionTier.Mature]);
  });
});

describe('a nimble or savage companion', () => {
  test('nimble adds Dexterity, Acrobatics and flat damage', () => {
    const nimble = derive(8, [CompanionTier.Mature, CompanionTier.Nimble]);
    expect(nimble.attributes.dex.total).toBe(Modifier.parse(4));
    expect(nimble.skills.acrobatics?.total).toBe(Modifier.parse(16));
    expect(nimble.strikes[0]?.damage.total).toBe(Modifier.parse(6));
  });

  test('savage grows no further past Large, and adds Strength, Athletics and flat damage', () => {
    const savage = derive(8, [CompanionTier.Mature, CompanionTier.Savage]);
    expect(savage.size).toBe(Size.Large);
    expect(savage.attributes.str.total).toBe(Modifier.parse(5));
    expect(savage.skills.athletics?.total).toBe(Modifier.parse(17));
    expect(savage.strikes[0]?.damage.total).toBe(Modifier.parse(8));
  });
});

describe('a specialized companion', () => {
  const specialized = derive(14, [CompanionTier.Mature, CompanionTier.Savage, CompanionTier.Specialized]);

  test('is master in saves and Perception, and expert in unarmed attacks', () => {
    expect(specialized.fortitude.total).toBe(Modifier.parse(24));
    expect(specialized.strikes[0]?.attack.total).toBe(Modifier.parse(23));
  });

  test('gains Intelligence, a third die and doubles its flat damage', () => {
    expect(specialized.attributes.int.total).toBe(Modifier.parse(-2));
    expect(specialized.strikes[0]?.dice).toBe(DiceCount.parse(3));
    expect(specialized.strikes[0]?.damage.total).toBe(Modifier.parse(11));
  });
});

describe('when the master changes', () => {
  test('a higher level raises Hit Points, AC and every proficiency-based number', () => {
    const before = derive(3, []);
    const after = derive(4, []);
    expect(after.hitPoints.total).toBe(HitPoints.parse(Number(before.hitPoints.total) + 8));
    expect(after.armorClass.total).toBe(Modifier.parse(Number(before.armorClass.total) + 1));
    expect(after.perception.total).toBe(Modifier.parse(Number(before.perception.total) + 1));
  });

  test('a different proficiency table changes the numbers without touching the block', () => {
    const flat = deriveCompanionStatistics({
      level: Level.parse(3),
      block: bear,
      tiers: new Set(),
      proficiencyBonus: (rank) => Modifier.parse(RANK_BONUS[rank].step),
    });

    expect(flat.armorClass.total).toBe(Modifier.parse(13));
    expect(flat.hitPoints.total).toBe(HitPoints.parse(32));
  });
});

test('attribute modifiers read from the block are branded as the block gives them', () => {
  expect(AttributeModifier.parse(2)).toBe(bear.attributes.str);
});

test('a block needs one attack, and its slug is a rule slug', () => {
  expect(bear.attacks.map((attack) => attack.slug)).toStrictEqual([RuleSlug.parse('jaws')]);
  expect(CompanionStatBlock.safeParse({ ...bear, attacks: [] }).success).toBe(false);
});
