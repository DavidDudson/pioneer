import { FrequencyPeriod, MovementType } from '@pioneer/rules/sdk';
import type { SenseAcuity, StrikeRange } from '@pioneer/rules/sdk';

/** Message keys the creature stat block renders with, spelled out so the key check sees them. */
export const CreatureStatBlockMessage = {
  /** "Creature 3": the line under the name. */
  Level: 'rules.creatureStatBlock.level',
  /** "NPC 3". */
  NpcLevel: 'rules.creatureStatBlock.npcLevel',
  Perception: 'rules.creatureStatBlock.perception',
  Languages: 'rules.creatureStatBlock.languages',
  Skills: 'rules.creatureStatBlock.skills',
  /** "Stealth +7": a skill and its modifier. */
  Skill: 'rules.creatureStatBlock.skill',
  /** "Str +4, Dex +2, ...". */
  Attributes: 'rules.creatureStatBlock.attributes',
  Items: 'rules.creatureStatBlock.items',
  /** "2 torches": an item carried in a quantity. */
  ItemQuantity: 'rules.creatureStatBlock.itemQuantity',
  ArmorClass: 'rules.creatureStatBlock.armorClass',
  Saves: 'rules.creatureStatBlock.saves',
  HitPoints: 'rules.creatureStatBlock.hitPoints',
  Immunities: 'rules.creatureStatBlock.immunities',
  Weaknesses: 'rules.creatureStatBlock.weaknesses',
  Resistances: 'rules.creatureStatBlock.resistances',
  /** "fire 5", "all 5 (except magical)": a weakness or resistance. */
  Adjustment: 'rules.creatureStatBlock.adjustment',
  Speed: 'rules.creatureStatBlock.speed',
  /** "fly 40 feet". */
  OtherSpeed: 'rules.creatureStatBlock.otherSpeed',
  Strikes: 'rules.creatureStatBlock.strikes',
  /** "Melee jaws +9 (agile), Damage 1d6+4 piercing". */
  Strike: 'rules.creatureStatBlock.strike',
  StrikeReach: 'rules.creatureStatBlock.strikeReach',
  StrikeIncrement: 'rules.creatureStatBlock.strikeIncrement',
  StrikeDamage: 'rules.creatureStatBlock.strikeDamage',
  /** "1d6+4 piercing". */
  DamagePart: 'rules.creatureStatBlock.damagePart',
  /** "plus 1d6 persistent fire". */
  DamagePersistent: 'rules.creatureStatBlock.damagePersistent',
  Abilities: 'rules.creatureStatBlock.abilities',
  Trigger: 'rules.creatureStatBlock.trigger',
  Requirements: 'rules.creatureStatBlock.requirements',
  /** "Frequency once per day". */
  Frequency: 'rules.creatureStatBlock.frequency',
  Spellcasting: 'rules.creatureStatBlock.spellcasting',
  /** "Primal Innate Spells". */
  SpellcastingHeading: 'rules.creatureStatBlock.spellcastingHeading',
  /** "DC 24, attack +16". */
  SpellcastingNumbers: 'rules.creatureStatBlock.spellcastingNumbers',
  /** "Rank 3". */
  SpellRank: 'rules.creatureStatBlock.spellRank',
  /** "3/day", "constant". */
  SpellUses: 'rules.creatureStatBlock.spellUses',
  SpellConstant: 'rules.creatureStatBlock.spellConstant',
  Conditions: 'rules.creatureStatBlock.conditions',
  RecallKnowledge: 'rules.creatureStatBlock.recallKnowledge',
  /** "Levels 1 to 3": the levels an NPC archetype is written for. */
  NpcLevels: 'rules.creatureStatBlock.npcLevels',
  NpcOccupation: 'rules.creatureStatBlock.npcOccupation',
} as const;

export const ACUITY_MESSAGES: Readonly<Record<SenseAcuity, string>> = {
  precise: 'rules.creatureStatBlock.acuity.precise',
  imprecise: 'rules.creatureStatBlock.acuity.imprecise',
  vague: 'rules.creatureStatBlock.acuity.vague',
};

export const MOVEMENT_MESSAGES: Readonly<Record<MovementType, string>> = {
  [MovementType.Burrow]: 'rules.creatureStatBlock.movement.burrow',
  [MovementType.Climb]: 'rules.creatureStatBlock.movement.climb',
  [MovementType.Fly]: 'rules.creatureStatBlock.movement.fly',
  [MovementType.Swim]: 'rules.creatureStatBlock.movement.swim',
};

export const STRIKE_RANGE_MESSAGES: Readonly<Record<StrikeRange, string>> = {
  melee: 'rules.creatureStatBlock.range.melee',
  ranged: 'rules.creatureStatBlock.range.ranged',
};

export const PERIOD_MESSAGES: Readonly<Record<FrequencyPeriod, string>> = {
  [FrequencyPeriod.Turn]: 'rules.creatureStatBlock.period.turn',
  [FrequencyPeriod.Round]: 'rules.creatureStatBlock.period.round',
  [FrequencyPeriod.Minute]: 'rules.creatureStatBlock.period.minute',
  [FrequencyPeriod.TenMinutes]: 'rules.creatureStatBlock.period.tenMinutes',
  [FrequencyPeriod.Hour]: 'rules.creatureStatBlock.period.hour',
  [FrequencyPeriod.TwentyFourHours]: 'rules.creatureStatBlock.period.twentyFourHours',
  [FrequencyPeriod.Day]: 'rules.creatureStatBlock.period.day',
  [FrequencyPeriod.Week]: 'rules.creatureStatBlock.period.week',
  [FrequencyPeriod.Month]: 'rules.creatureStatBlock.period.month',
  [FrequencyPeriod.Year]: 'rules.creatureStatBlock.period.year',
};
