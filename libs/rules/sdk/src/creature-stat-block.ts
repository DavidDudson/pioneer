import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Frequency, Uses } from './action';
import { ContentId, Slug } from './content-id';
import { ContentText } from './content-text';
import { RulesMessage } from './messages';
import { ActionCost, ActionCostSchema, RichText } from './rich-text';
import { RuleElements } from './rule-element';
import { SpellPreparation } from './rule-element-spellcasting';
import { SenseAcuitySchema } from './sense';
import { SpellRank } from './spell-rank';
import { MagicTraditionSchema } from './spellcasting-tradition';
import { Trait } from './trait';
import { uniqueItems } from './unique-items';
import { Dc, Feet, Modifier } from './units';
import { WeaponDamage } from './weapon';

/** The most of any one list a stat block holds: skills, senses, strikes, abilities, spells, items. */
const LIST_MAX = 64;
/** The most traits one strike or ability names. */
const TRAITS_MAX = 16;

const Traits = z.array(Trait).max(TRAITS_MAX).readonly().check(uniqueItems);

/** A skill a creature has a modifier in: a skill slug (`stealth`) or a Lore (`warfare-lore`). */
export const CreatureSkillName = Slug.brand<'CreatureSkillName'>();
export type CreatureSkillName = z.infer<typeof CreatureSkillName>;

/** A skill modifier on a stat block. `note` carries the book's parenthetical ("+14 in swamps"). */
export const CreatureSkill = z.strictObject({
  skill: CreatureSkillName,
  modifier: Modifier,
  note: RichText.optional(),
});
export type CreatureSkill = z.infer<typeof CreatureSkill>;

/** A sense a creature has: its slug (`darkvision`, `scent`), how exactly it locates, and how far it reaches. */
export const CreatureSense = z.strictObject({
  sense: Slug,
  acuity: SenseAcuitySchema.optional(),
  range: Feet.optional(),
});
export type CreatureSense = z.infer<typeof CreatureSense>;

/** How a creature moves besides walking; its land speed is the stat block's `speed`. */
export const MovementType = { Burrow: 'burrow', Climb: 'climb', Fly: 'fly', Swim: 'swim' } as const;
export type MovementType = ValueOf<typeof MovementType>;

export const CreatureSpeed = z.strictObject({
  movement: z.enum(MovementType),
  speed: Feet,
  note: RichText.optional(),
});
export type CreatureSpeed = z.infer<typeof CreatureSpeed>;

/** Whether a strike is made in melee or at range. */
export const StrikeRange = { Melee: 'melee', Ranged: 'ranged' } as const;
export type StrikeRange = ValueOf<typeof StrikeRange>;

/** Flat damage added to a strike's dice ("1d8+7"). */
export const DamageBonus = Pg.smallint().nonnegative().brand<'DamageBonus'>();
export type DamageBonus = z.infer<typeof DamageBonus>;

/** One part of a strike's damage: dice, an optional flat bonus and a type ("1d8+7 slashing"). */
export const CreatureDamage = WeaponDamage.extend({ bonus: DamageBonus.optional() });
export type CreatureDamage = z.infer<typeof CreatureDamage>;

/**
 * A melee or ranged attack on a stat block. Its attack bonus is printed, not derived, since a creature has no
 * proficiencies to derive it from. `effects` is the prose after the damage ("plus Grab").
 */
export const CreatureStrike = z.strictObject({
  name: ContentText,
  range: z.enum(StrikeRange),
  bonus: Modifier,
  damage: z.array(CreatureDamage).max(LIST_MAX).readonly(),
  traits: Traits,
  /** The reach of a melee strike. */
  reach: Feet.optional(),
  /** The range increment of a ranged strike. */
  increment: Feet.optional(),
  effects: RichText.optional(),
});
export type CreatureStrike = z.infer<typeof CreatureStrike>;

/**
 * A special ability: a passive trait, an action, a reaction or a free action. An inline structure, not an `action`
 * entry, since an ability belongs to one stat block and has no entry of its own to link to or search (a hazard's
 * ability has the same shape). `cost` is absent for a passive ability.
 */
export const CreatureAbility = z
  .strictObject({
    name: ContentText,
    cost: ActionCostSchema.optional(),
    trigger: RichText.optional(),
    requirements: RichText.optional(),
    frequency: Frequency.optional(),
    traits: Traits,
    description: RichText,
    rules: RuleElements.readonly(),
  })
  .refine((ability) => ability.cost !== ActionCost.Reaction || ability.trigger !== undefined, {
    ...issueParams(message(RulesMessage.ActionReactionTrigger)),
    path: ['trigger'],
  });
export type CreatureAbility = z.infer<typeof CreatureAbility>;

/** A spell a creature casts: the spell, the rank it is cast at, and how often when it is innate. */
export const CreatureSpell = z.strictObject({
  spell: ContentId,
  rank: SpellRank,
  /** Uses per day of an innate spell; absent for a spell cast from slots or at will. */
  uses: Uses.optional(),
  /** A constant spell is always in effect. */
  constant: z.literal(true).optional(),
});
export type CreatureSpell = z.infer<typeof CreatureSpell>;

/**
 * A spellcasting entry on a stat block: its tradition, how its spells are cast, and the printed DC and attack bonus.
 * Reuses the character spellcasting vocabulary (ADR-0040, ADR-0041, ADR-0050) for tradition and preparation.
 */
export const CreatureSpellcasting = z.strictObject({
  name: ContentText,
  tradition: MagicTraditionSchema,
  preparation: z.enum(SpellPreparation),
  dc: Dc,
  attack: Modifier.optional(),
  spells: z.array(CreatureSpell).max(LIST_MAX).readonly(),
});
export type CreatureSpellcasting = z.infer<typeof CreatureSpellcasting>;

/** How many of an item a creature carries. */
export const ItemQuantity = Pg.smallint().positive().brand<'ItemQuantity'>();
export type ItemQuantity = z.infer<typeof ItemQuantity>;

/** An item a creature carries, linked to its equipment entry. */
export const CreatureItem = z.strictObject({
  item: ContentId,
  quantity: ItemQuantity.optional(),
});
export type CreatureItem = z.infer<typeof CreatureItem>;

/**
 * The parts of a stat block beyond its core numbers (creature.ts), all optional so a creature written with only
 * the core numbers still validates.
 */
export const creatureStatBlockFields = {
  skills: z.array(CreatureSkill).max(LIST_MAX).readonly().optional(),
  senses: z.array(CreatureSense).max(LIST_MAX).readonly().optional(),
  languages: z.array(Slug).max(LIST_MAX).readonly().check(uniqueItems).optional(),
  /** Speeds other than the land `speed`. */
  speeds: z.array(CreatureSpeed).max(LIST_MAX).readonly().optional(),
  strikes: z.array(CreatureStrike).max(LIST_MAX).readonly().optional(),
  abilities: z.array(CreatureAbility).max(LIST_MAX).readonly().optional(),
  spellcasting: z.array(CreatureSpellcasting).max(LIST_MAX).readonly().optional(),
  items: z.array(CreatureItem).max(LIST_MAX).readonly().optional(),
  /** Conditions the creature starts a fight with, by condition slug. */
  conditions: z.array(Slug).max(LIST_MAX).readonly().check(uniqueItems).optional(),
  /** The recall-knowledge line: what a check reveals. */
  recallKnowledge: RichText.optional(),
};
