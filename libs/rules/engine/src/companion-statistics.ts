import {
  Attribute,
  COMPANION_SKILL_ATTRIBUTE,
  CompanionSkill,
  CompanionTier,
  DiceCount,
  HitPoints,
  Modifier,
  Proficiency,
  Size,
} from '@pioneer/rules/sdk';
import type {
  CompanionAttack,
  CompanionSkill as CompanionSkillName,
  Level,
  ProficiencyBonusTable,
} from '@pioneer/rules/sdk';

import { CompanionSource } from './companion-statistic-types';
import type {
  CompanionInputs,
  CompanionLine,
  CompanionStatistic,
  CompanionStatistics,
  CompanionStrike,
} from './companion-statistic-types';
import { SIZE_ORDER, TIER_ADVANCE } from './companion-tiers';
import { bonusAt } from './proficiency-bonuses';

const RANKS = [
  Proficiency.Untrained,
  Proficiency.Trained,
  Proficiency.Expert,
  Proficiency.Master,
  Proficiency.Legendary,
] as const;

const BASE_AC = Modifier.parse(10);
const HP_PER_LEVEL = Modifier.parse(6);
const ZERO = Modifier.parse(0);

function higher(left: Proficiency, right: Proficiency): Proficiency {
  return RANKS.indexOf(left) >= RANKS.indexOf(right) ? left : right;
}

function raised(rank: Proficiency): Proficiency {
  return RANKS[Math.min(RANKS.indexOf(rank) + 1, RANKS.length - 1)] ?? rank;
}

function sum(lines: readonly CompanionLine[]): Modifier {
  let total = 0;

  for (const line of lines) {
    total += line.value;
  }

  return Modifier.parse(total);
}

function statistic(lines: readonly CompanionLine[]): CompanionStatistic {
  return { total: sum(lines), lines };
}

/** The tiers held, in the order the rules list them, so a breakdown reads the same every time. */
function heldTiers({ tiers }: CompanionInputs): readonly CompanionTier[] {
  return Object.values(CompanionTier).filter((tier) => tier !== CompanionTier.Young && tiers.has(tier));
}

function attributeStatistic(inputs: CompanionInputs, attribute: Attribute): CompanionStatistic {
  const tierLines = heldTiers(inputs).flatMap((tier): readonly CompanionLine[] => {
    const step = TIER_ADVANCE[tier].attributes[attribute];

    return step === undefined ? [] : [{ source: CompanionSource.Tier, value: step, tier }];
  });

  return statistic([
    { source: CompanionSource.StatBlock, value: Modifier.parse(inputs.block.attributes[attribute]), attribute },
    ...tierLines,
  ]);
}

type Attributes = Readonly<Record<Attribute, CompanionStatistic>>;

/** The rank the type's own `base` reaches once each held tier that grants more has applied. */
function defenceRank(inputs: CompanionInputs): Proficiency {
  let rank: Proficiency = Proficiency.Trained;

  for (const tier of heldTiers(inputs)) {
    rank = higher(rank, TIER_ADVANCE[tier].defence ?? rank);
  }

  return rank;
}

function unarmedRank(inputs: CompanionInputs): Proficiency {
  let rank: Proficiency = Proficiency.Trained;

  for (const tier of heldTiers(inputs)) {
    rank = higher(rank, TIER_ADVANCE[tier].unarmed ?? rank);
  }

  return rank;
}

function skillRank(inputs: CompanionInputs, skill: CompanionSkillName): Proficiency {
  const trained =
    skill === CompanionSkill.Acrobatics || skill === CompanionSkill.Athletics || skill === inputs.block.extraSkill;

  let rank: Proficiency = trained ? Proficiency.Trained : Proficiency.Untrained;

  for (const tier of heldTiers(inputs)) {
    const given = TIER_ADVANCE[tier].skills[skill];

    if (given !== undefined) {
      // A skill the type already trains goes one rank above the trained rank a tier gives.
      rank = higher(rank, given === Proficiency.Trained && trained ? raised(given) : given);
    }
  }

  return rank;
}

/** What a check adds to the lines already in `base`: the attribute's modifier and the rank's bonus at the level. */
interface Check {
  readonly attribute: Attribute;
  readonly rank: Proficiency;
  readonly base: readonly CompanionLine[];
}

function checkStatistic(inputs: CompanionInputs, attributes: Attributes, check: Check): CompanionStatistic {
  const { attribute, rank, base } = check;

  return statistic([
    ...base,
    { source: CompanionSource.Attribute, value: attributes[attribute].total, attribute },
    { source: CompanionSource.Proficiency, value: inputs.proficiencyBonus(rank), rank },
  ]);
}

function plainCheck(inputs: CompanionInputs, attributes: Attributes, check: Omit<Check, 'base'>): CompanionStatistic {
  return checkStatistic(inputs, attributes, { ...check, base: [] });
}

function sizeOf(inputs: CompanionInputs): Size {
  const medium = SIZE_ORDER.indexOf(Size.Medium);
  let { size } = inputs.block;

  for (const tier of heldTiers(inputs)) {
    const index = SIZE_ORDER.indexOf(size);

    if (TIER_ADVANCE[tier].grows && index <= medium) {
      size = SIZE_ORDER[index + 1] ?? size;
    }
  }

  return size;
}

function strikeOf(inputs: CompanionInputs, attributes: Attributes, attack: CompanionAttack): CompanionStrike {
  const { slug, attribute, damage } = attack;
  const held = heldTiers(inputs);
  const specialized = held.includes(CompanionTier.Specialized);
  let { dice } = damage;

  for (const tier of held) {
    dice = DiceCount.parse(dice + TIER_ADVANCE[tier].dice);
  }

  const tierDamage = held.flatMap((tier): readonly CompanionLine[] => {
    const { flat } = TIER_ADVANCE[tier];

    // A specialized companion's extra damage doubles: 2 becomes 4, and 3 becomes 6.
    return flat === ZERO
      ? []
      : [{ source: CompanionSource.Tier, value: Modifier.parse(specialized ? flat * 2 : flat), tier }];
  });

  return {
    slug,
    attack: plainCheck(inputs, attributes, { attribute, rank: unarmedRank(inputs) }),
    dice,
    die: damage.die,
    damage: statistic([
      { source: CompanionSource.Attribute, value: attributes[attribute].total, attribute },
      ...tierDamage,
    ]),
    damageType: damage.damageType,
  };
}

function skillsOf(
  inputs: CompanionInputs,
  attributes: Attributes,
): Partial<Record<CompanionSkillName, CompanionStatistic>> {
  const skills: Partial<Record<CompanionSkillName, CompanionStatistic>> = {};

  for (const skill of Object.values(CompanionSkill)) {
    const rank = skillRank(inputs, skill);

    if (rank !== Proficiency.Untrained) {
      skills[skill] = plainCheck(inputs, attributes, { attribute: COMPANION_SKILL_ATTRIBUTE[skill], rank });
    }
  }

  return skills;
}

/**
 * An animal companion's statistics, derived from its master's level and proficiency bonuses, its species' block and
 * the tiers it has reached (Player Core pp. 206 and 211). Nothing is stored (ADR-0004, ADR-0080); a new level, tier
 * or bonus table gives new numbers. Barding and other items, specialization benefits and Support are not applied.
 */
export function deriveCompanionStatistics(inputs: CompanionInputs): CompanionStatistics {
  const attributes: Attributes = {
    str: attributeStatistic(inputs, Attribute.Strength),
    dex: attributeStatistic(inputs, Attribute.Dexterity),
    con: attributeStatistic(inputs, Attribute.Constitution),
    int: attributeStatistic(inputs, Attribute.Intelligence),
    wis: attributeStatistic(inputs, Attribute.Wisdom),
    cha: attributeStatistic(inputs, Attribute.Charisma),
  };

  const defence = defenceRank(inputs);
  const level = Modifier.parse(inputs.level);

  const hitPointLines: readonly CompanionLine[] = [
    { source: CompanionSource.StatBlock, value: Modifier.parse(inputs.block.ancestryHp) },
    { source: CompanionSource.Level, value: Modifier.parse(HP_PER_LEVEL * level) },
    {
      source: CompanionSource.Attribute,
      value: Modifier.parse(attributes.con.total * level),
      attribute: Attribute.Constitution,
    },
  ];

  return {
    level: inputs.level,
    size: sizeOf(inputs),
    speed: inputs.block.speed,
    movement: inputs.block.movement ?? {},
    senses: inputs.block.senses ?? [],
    special: inputs.block.special ?? [],
    attributes,
    hitPoints: { total: HitPoints.parse(Math.max(ZERO, sum(hitPointLines))), lines: hitPointLines },
    armorClass: checkStatistic(inputs, attributes, {
      attribute: Attribute.Dexterity,
      rank: Proficiency.Trained,
      base: [{ source: CompanionSource.Base, value: BASE_AC }],
    }),
    fortitude: plainCheck(inputs, attributes, { attribute: Attribute.Constitution, rank: defence }),
    reflex: plainCheck(inputs, attributes, { attribute: Attribute.Dexterity, rank: defence }),
    will: plainCheck(inputs, attributes, { attribute: Attribute.Wisdom, rank: defence }),
    perception: plainCheck(inputs, attributes, { attribute: Attribute.Wisdom, rank: defence }),
    skills: skillsOf(inputs, attributes),
    strikes: inputs.block.attacks.map((attack) => strikeOf(inputs, attributes, attack)),
  };
}

/**
 * The bonus each rank adds at `level`, read from the content's table (ADR-0026), for `deriveCompanionStatistics`. A
 * rank the table cannot evaluate adds nothing, as `@prof` reading unknown would. A variant rule that replaces the
 * table on the master does not reach the companion.
 */
export function companionProficiencyBonus(table: ProficiencyBonusTable, level: Level): (rank: Proficiency) => Modifier {
  return (rank) => Modifier.parse(bonusAt(table[rank], level) ?? ZERO);
}
