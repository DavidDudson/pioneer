import { CompanionMovement, Feet, HitPoints, Modifier, Size } from '@pioneer/rules/sdk';
import type { CompanionMovements, CompanionSkill } from '@pioneer/rules/sdk';

import { CompanionSource } from './companion-statistic-types';
import type { CompanionLine, CompanionStatistic } from './companion-statistic-types';
import { FamiliarAbility, FamiliarSense, FamiliarSpeed } from './familiar-statistic-types';
import type { FamiliarInputs, FamiliarStatistics } from './familiar-statistic-types';

const HP_PER_LEVEL = Modifier.parse(5);
const TOUGH_PER_LEVEL = Modifier.parse(2);
const UNTRAINED_BASE = Modifier.parse(3);
const ZERO = Modifier.parse(0);
const BASE_SPEED = Feet.parse(25);
const BURROW_SPEED = Feet.parse(5);
const FAST_SPEED = Feet.parse(40);

function sum(lines: ReadonlyArray<CompanionLine>): Modifier {
  let total = 0;

  for (const line of lines) {
    total += line.value;
  }

  return Modifier.parse(total);
}

function statistic(lines: ReadonlyArray<CompanionLine>): CompanionStatistic {
  return { total: sum(lines), lines };
}

/** A statistic that is the master's own number. */
function fromMaster(value: Modifier): CompanionStatistic {
  return statistic([{ source: CompanionSource.Master, value }]);
}

/**
 * Perception, Acrobatics and Stealth: 3 + level, or the master's spellcasting attribute modifier + level when that is
 * higher (Player Core pg. 212, Modifiers and AC).
 */
function trainedStatistic(inputs: FamiliarInputs): CompanionStatistic {
  const level = Modifier.parse(inputs.level);
  const { spellcasting } = inputs;

  if (spellcasting !== undefined && spellcasting > UNTRAINED_BASE) {
    return statistic([
      { source: CompanionSource.Level, value: level },
      { source: CompanionSource.Attribute, value: spellcasting },
    ]);
  }

  return statistic([
    { source: CompanionSource.Base, value: UNTRAINED_BASE },
    { source: CompanionSource.Level, value: level },
  ]);
}

/** Any other skill: the level alone, and the master's spellcasting modifier too when Skilled was taken for it. */
function skillStatistic(inputs: FamiliarInputs, skilled: boolean): CompanionStatistic {
  const lines: ReadonlyArray<CompanionLine> = [{ source: CompanionSource.Level, value: Modifier.parse(inputs.level) }];

  if (!skilled || inputs.spellcasting === undefined) {
    return statistic(lines);
  }

  return statistic([...lines, { source: CompanionSource.Ability, value: inputs.spellcasting }]);
}

function skilledOf(inputs: FamiliarInputs): Partial<Record<CompanionSkill, CompanionStatistic>> {
  const skills: Partial<Record<CompanionSkill, CompanionStatistic>> = {};

  for (const skill of inputs.skilled) {
    skills[skill] = skillStatistic(inputs, true);
  }

  return skills;
}

/** 5 Hit Points per level, and 2 more per level with Tough (Player Core pg. 259). */
function hitPointLines(inputs: FamiliarInputs): ReadonlyArray<CompanionLine> {
  const level = Modifier.parse(inputs.level);

  const lines: ReadonlyArray<CompanionLine> = [
    { source: CompanionSource.Level, value: Modifier.parse(HP_PER_LEVEL * level) },
  ];

  return inputs.abilities.has(FamiliarAbility.Tough)
    ? [...lines, { source: CompanionSource.Ability, value: Modifier.parse(TOUGH_PER_LEVEL * level) }]
    : lines;
}

type Speeds = Partial<Record<FamiliarSpeed, Feet>>;

/** The Speed the familiar moves by: land, or swim for an aquatic familiar. */
function mainSpeed({ aquatic }: FamiliarInputs): FamiliarSpeed {
  return aquatic ? FamiliarSpeed.Swim : FamiliarSpeed.Land;
}

/** What each ability adds: the Speed, and how fast. Amphibious also gives the land Speed, which `speedsOf` adds. */
const ADDED_SPEEDS: ReadonlyArray<readonly [FamiliarAbility, FamiliarSpeed, Feet]> = [
  [FamiliarAbility.Amphibious, FamiliarSpeed.Swim, BASE_SPEED],
  [FamiliarAbility.Burrower, FamiliarSpeed.Burrow, BURROW_SPEED],
  [FamiliarAbility.Climber, FamiliarSpeed.Climb, BASE_SPEED],
  [FamiliarAbility.Flier, FamiliarSpeed.Fly, BASE_SPEED],
];

/** Every Speed the familiar has: 25 feet to start, and what each ability adds (Player Core pg. 259). */
function speedsOf(inputs: FamiliarInputs): Speeds {
  const { abilities } = inputs;
  const main = mainSpeed(inputs);
  const speeds: Speeds = { [main]: BASE_SPEED };

  for (const [ability, speed, feet] of ADDED_SPEEDS) {
    if (abilities.has(ability)) {
      speeds[speed] = feet;
    }
  }

  if (abilities.has(FamiliarAbility.Amphibious)) {
    speeds[FamiliarSpeed.Land] = BASE_SPEED;
  }

  const fast = inputs.fastMovesOn ?? main;

  if (abilities.has(FamiliarAbility.FastMovement) && speeds[fast] === BASE_SPEED) {
    speeds[fast] = FAST_SPEED;
  }

  return speeds;
}

/** The Speeds beside the land Speed, as the companion movements. */
function movementOf(speeds: Speeds): CompanionMovements {
  const movement: Partial<Record<CompanionMovement, Feet>> = {};

  const others = [
    [FamiliarSpeed.Burrow, CompanionMovement.Burrow],
    [FamiliarSpeed.Climb, CompanionMovement.Climb],
    [FamiliarSpeed.Fly, CompanionMovement.Fly],
    [FamiliarSpeed.Swim, CompanionMovement.Swim],
  ] as const;

  for (const [speed, kind] of others) {
    const feet = speeds[speed];

    if (feet !== undefined) {
      movement[kind] = feet;
    }
  }

  return movement;
}

/** Low-light vision, and what the abilities add. */
function sensesOf({ abilities }: FamiliarInputs): ReadonlyArray<FamiliarSense> {
  const senses: Array<FamiliarSense> = [FamiliarSense.LowLightVision];

  if (abilities.has(FamiliarAbility.Darkvision)) {
    senses.push(FamiliarSense.Darkvision);
  }

  if (abilities.has(FamiliarAbility.Echolocation)) {
    senses.push(FamiliarSense.Echolocation);
  }

  if (abilities.has(FamiliarAbility.Scent)) {
    senses.push(FamiliarSense.Scent);
  }

  return senses;
}

/**
 * A familiar's statistics, derived from its master (Player Core pp. 212 and 259, familiars.md). Its level is its
 * master's, its AC and saves are the master's own, Perception, Acrobatics and Stealth are 3 + level or the master's
 * spellcasting modifier + level, and other skills are the level alone. Nothing is stored (ADR-0004, ADR-0079): a new
 * level, attribute or armour on the master gives new numbers. Items never add to it, and a familiar has no attribute
 * modifiers of its own.
 */
export function deriveFamiliarStatistics(inputs: FamiliarInputs): FamiliarStatistics {
  const speeds = speedsOf(inputs);
  const lines = hitPointLines(inputs);

  return {
    level: inputs.level,
    size: Size.Tiny,
    hitPoints: { total: HitPoints.parse(Math.max(ZERO, sum(lines))), lines },
    armorClass: fromMaster(inputs.armorClass),
    fortitude: fromMaster(inputs.saves.fortitude),
    reflex: fromMaster(inputs.saves.reflex),
    will: fromMaster(inputs.saves.will),
    perception: trainedStatistic(inputs),
    acrobatics: trainedStatistic(inputs),
    stealth: trainedStatistic(inputs),
    skilled: skilledOf(inputs),
    otherSkills: skillStatistic(inputs, false),
    speed: speeds[FamiliarSpeed.Land],
    movement: movementOf(speeds),
    senses: sensesOf(inputs),
  };
}
