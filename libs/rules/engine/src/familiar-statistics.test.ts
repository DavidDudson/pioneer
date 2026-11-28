import { describe, expect, test } from 'bun:test';

import { CompanionMovement, CompanionSkill, Feet, HitPoints, Level, Modifier, Size } from '@pioneer/rules/sdk';

import { CompanionSource } from './companion-statistic-types';
import { FamiliarAbility, FamiliarSense, FamiliarSpeed } from './familiar-statistic-types';
import type { FamiliarInputs } from './familiar-statistic-types';
import { deriveFamiliarStatistics } from './familiar-statistics';

const LEVELS = Array.from({ length: 20 }, (_slot, index) => Level.parse(index + 1));

/** A level 5 master with AC 24, saves 12, 10 and 14, and a +4 spellcasting modifier. */
function master(changes: Partial<FamiliarInputs> = {}): FamiliarInputs {
  return {
    level: Level.parse(5),
    armorClass: Modifier.parse(24),
    saves: { fortitude: Modifier.parse(12), reflex: Modifier.parse(10), will: Modifier.parse(14) },
    spellcasting: Modifier.parse(4),
    abilities: new Set(),
    skilled: new Set(),
    aquatic: false,
    ...changes,
  };
}

const sourcesOf = (lines: ReadonlyArray<{ readonly source: string }>): ReadonlyArray<string> =>
  lines.map(({ source }) => source);

describe('a familiar derived from its master', () => {
  test('is a Tiny creature of its master’s level', () => {
    const familiar = deriveFamiliarStatistics(master());

    expect(familiar.level).toBe(Level.parse(5));
    expect(familiar.size).toBe(Size.Tiny);
  });

  test('has 5 Hit Points per level, from the level alone', () => {
    const { hitPoints } = deriveFamiliarStatistics(master());

    expect(hitPoints.total).toBe(HitPoints.parse(25));
    expect(sourcesOf(hitPoints.lines)).toStrictEqual([CompanionSource.Level]);
  });

  test('has 2 more Hit Points per level with Tough, as its own line', () => {
    const { hitPoints } = deriveFamiliarStatistics(master({ abilities: new Set([FamiliarAbility.Tough]) }));

    expect(hitPoints.total).toBe(HitPoints.parse(35));
    expect(sourcesOf(hitPoints.lines)).toStrictEqual([CompanionSource.Level, CompanionSource.Ability]);
  });

  test('has its master’s AC and saves, each named as the master’s', () => {
    const familiar = deriveFamiliarStatistics(master());

    expect(familiar.armorClass.total).toBe(Modifier.parse(24));
    expect(familiar.fortitude.total).toBe(Modifier.parse(12));
    expect(familiar.reflex.total).toBe(Modifier.parse(10));
    expect(familiar.will.total).toBe(Modifier.parse(14));
    expect(sourcesOf(familiar.armorClass.lines)).toStrictEqual([CompanionSource.Master]);
  });

  test('follows its master: a new AC or save changes its own', () => {
    const better = deriveFamiliarStatistics(
      master({
        armorClass: Modifier.parse(27),
        saves: { fortitude: Modifier.parse(13), reflex: Modifier.parse(11), will: Modifier.parse(15) },
      }),
    );

    expect([better.armorClass.total, better.fortitude.total, better.reflex.total, better.will.total]).toStrictEqual([
      Modifier.parse(27),
      Modifier.parse(13),
      Modifier.parse(11),
      Modifier.parse(15),
    ]);
  });
});

describe('Perception, Acrobatics and Stealth', () => {
  test('are the spellcasting modifier plus level when that beats 3 plus level', () => {
    const { perception, acrobatics, stealth } = deriveFamiliarStatistics(master());

    expect([perception.total, acrobatics.total, stealth.total]).toStrictEqual([
      Modifier.parse(9),
      Modifier.parse(9),
      Modifier.parse(9),
    ]);
    expect(sourcesOf(perception.lines)).toStrictEqual([CompanionSource.Level, CompanionSource.Attribute]);
  });

  test('are 3 plus level when the spellcasting modifier is no more than 3', () => {
    const { perception } = deriveFamiliarStatistics(master({ spellcasting: Modifier.parse(3) }));

    expect(perception.total).toBe(Modifier.parse(8));
    expect(sourcesOf(perception.lines)).toStrictEqual([CompanionSource.Base, CompanionSource.Level]);
  });

  test('are 3 plus level for a master that casts no spells', () => {
    const { perception } = deriveFamiliarStatistics(master({ spellcasting: undefined }));

    expect(perception.total).toBe(Modifier.parse(8));
  });

  test('never fall below 3 plus level, at any level and modifier', () => {
    for (const level of LEVELS) {
      for (let modifier = -1; modifier <= 8; modifier += 1) {
        const { perception } = deriveFamiliarStatistics(master({ level, spellcasting: Modifier.parse(modifier) }));

        expect(perception.total).toBeGreaterThanOrEqual(level + 3);
        expect(perception.total).toBe(Modifier.parse(Math.max(level + 3, level + modifier)));
      }
    }
  });
});

describe('other skills', () => {
  test('are the level alone', () => {
    const { otherSkills } = deriveFamiliarStatistics(master());

    expect(otherSkills.total).toBe(Modifier.parse(5));
    expect(sourcesOf(otherSkills.lines)).toStrictEqual([CompanionSource.Level]);
  });

  test('add the spellcasting modifier for a skill Skilled was taken for, and only that one', () => {
    const { skilled, otherSkills } = deriveFamiliarStatistics(master({ skilled: new Set([CompanionSkill.Arcana]) }));

    expect(skilled[CompanionSkill.Arcana]?.total).toBe(Modifier.parse(9));
    expect(sourcesOf(skilled[CompanionSkill.Arcana]?.lines ?? [])).toStrictEqual([
      CompanionSource.Level,
      CompanionSource.Ability,
    ]);
    expect(skilled[CompanionSkill.Nature]).toBeUndefined();
    expect(otherSkills.total).toBe(Modifier.parse(5));
  });
});

describe('Speeds', () => {
  test('are 25 feet on land and nothing else to start', () => {
    const familiar = deriveFamiliarStatistics(master());

    expect(familiar.speed).toBe(Feet.parse(25));
    expect(familiar.movement).toStrictEqual({});
  });

  test('an aquatic familiar swims 25 feet and has no land Speed', () => {
    const familiar = deriveFamiliarStatistics(master({ aquatic: true }));

    expect(familiar.speed).toBeUndefined();
    expect(familiar.movement).toStrictEqual({ [CompanionMovement.Swim]: Feet.parse(25) });
  });

  test('abilities add burrow 5, climb 25, fly 25 and swim 25', () => {
    const familiar = deriveFamiliarStatistics(
      master({
        abilities: new Set([
          FamiliarAbility.Burrower,
          FamiliarAbility.Climber,
          FamiliarAbility.Flier,
          FamiliarAbility.Amphibious,
        ]),
      }),
    );

    expect(familiar.speed).toBe(Feet.parse(25));
    expect(familiar.movement).toStrictEqual({
      [CompanionMovement.Burrow]: Feet.parse(5),
      [CompanionMovement.Climb]: Feet.parse(25),
      [CompanionMovement.Fly]: Feet.parse(25),
      [CompanionMovement.Swim]: Feet.parse(25),
    });
  });

  test('Fast Movement raises the main Speed to 40 feet, or the one named', () => {
    const fast = new Set([FamiliarAbility.FastMovement, FamiliarAbility.Flier]);

    expect(deriveFamiliarStatistics(master({ abilities: fast })).speed).toBe(Feet.parse(40));

    const flying = deriveFamiliarStatistics(master({ abilities: fast, fastMovesOn: FamiliarSpeed.Fly }));

    expect(flying.speed).toBe(Feet.parse(25));
    expect(flying.movement[CompanionMovement.Fly]).toBe(Feet.parse(40));
  });

  test('Fast Movement leaves a burrow Speed of 5 feet alone', () => {
    const familiar = deriveFamiliarStatistics(
      master({
        abilities: new Set([FamiliarAbility.FastMovement, FamiliarAbility.Burrower]),
        fastMovesOn: FamiliarSpeed.Burrow,
      }),
    );

    expect(familiar.movement[CompanionMovement.Burrow]).toBe(Feet.parse(5));
  });
});

describe('senses', () => {
  test('are low-light vision to start', () => {
    expect(deriveFamiliarStatistics(master()).senses).toStrictEqual([FamiliarSense.LowLightVision]);
  });

  test('gain what Darkvision, Echolocation and Scent give', () => {
    const familiar = deriveFamiliarStatistics(
      master({
        abilities: new Set([FamiliarAbility.Scent, FamiliarAbility.Darkvision, FamiliarAbility.Echolocation]),
      }),
    );

    expect(familiar.senses).toStrictEqual([
      FamiliarSense.LowLightVision,
      FamiliarSense.Darkvision,
      FamiliarSense.Echolocation,
      FamiliarSense.Scent,
    ]);
  });
});

describe('growing with the master', () => {
  test('Hit Points rise 5 for every level, and 7 with Tough', () => {
    for (const level of LEVELS) {
      const plain = deriveFamiliarStatistics(master({ level }));
      const tough = deriveFamiliarStatistics(master({ level, abilities: new Set([FamiliarAbility.Tough]) }));

      expect(plain.hitPoints.total).toBe(HitPoints.parse(level * 5));
      expect(tough.hitPoints.total).toBe(HitPoints.parse(level * 7));
    }
  });
});
