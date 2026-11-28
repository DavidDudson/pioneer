import type {
  Attribute,
  CompanionMovements,
  CompanionSkill as CompanionSkillName,
  CompanionStatBlock,
  CompanionTier,
  ContentText,
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
import type { ValueOf } from '@pioneer/shared/kernel';

/** Where one number in a companion's breakdown comes from. */
export const CompanionSource = {
  /** The species' own block: its base attribute modifier or ancestry Hit Points. */
  StatBlock: 'stat-block',
  /** A tier the companion has reached. */
  Tier: 'tier',
  /** The master's level, through the proficiency bonus or the Hit Points it adds each level. */
  Level: 'level',
  /** A proficiency rank, at the master's level. */
  Proficiency: 'proficiency',
  /** An attribute modifier. */
  Attribute: 'attribute',
  /** The fixed part of a formula: 10 for AC. */
  Base: 'base',
} as const;

export type CompanionSource = ValueOf<typeof CompanionSource>;

/** One line of a companion statistic's breakdown. */
export interface CompanionLine {
  readonly source: CompanionSource;
  readonly value: Modifier;
  readonly tier?: CompanionTier;
  readonly attribute?: Attribute;
  readonly rank?: Proficiency;
}

/** A derived statistic: its total, and the lines that add up to it. */
export interface CompanionStatistic {
  readonly total: Modifier;
  readonly lines: ReadonlyArray<CompanionLine>;
}

/** An unarmed attack as the companion makes it: the roll, and the damage it deals. */
export interface CompanionStrike {
  readonly slug: RuleSlug;
  readonly attack: CompanionStatistic;
  readonly dice: DiceCount;
  readonly die: DieSize | undefined;
  readonly damage: CompanionStatistic;
  readonly damageType: DamageType;
}

export interface CompanionStatistics {
  readonly level: Level;
  readonly size: Size;
  readonly speed: Feet;
  readonly movement: CompanionMovements;
  readonly senses: ReadonlyArray<ContentText>;
  readonly special: ReadonlyArray<ContentText>;
  readonly attributes: Readonly<Record<Attribute, CompanionStatistic>>;
  readonly hitPoints: { readonly total: HitPoints; readonly lines: ReadonlyArray<CompanionLine> };
  readonly armorClass: CompanionStatistic;
  readonly fortitude: CompanionStatistic;
  readonly reflex: CompanionStatistic;
  readonly will: CompanionStatistic;
  readonly perception: CompanionStatistic;
  readonly skills: Readonly<Partial<Record<CompanionSkillName, CompanionStatistic>>>;
  readonly strikes: ReadonlyArray<CompanionStrike>;
}

/** What a companion's statistics derive from: its master's level and proficiency bonuses, its species and its tiers. */
export interface CompanionInputs {
  readonly level: Level;
  readonly block: CompanionStatBlock;
  /** The tiers the companion has reached; young is always held. */
  readonly tiers: ReadonlySet<CompanionTier>;
  /** The master's bonus for a rank at its level, which is zero when untrained, as the master's own table says. */
  readonly proficiencyBonus: (rank: Proficiency) => Modifier;
}
