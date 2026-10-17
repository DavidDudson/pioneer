import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeSchema } from './attribute';
import { ContentId, Slug } from './content-id';
import { ContentText } from './content-text';
import { DamageAdjustmentTargetSchema, DamageExceptions, DamageTypeSchema } from './damage';
import { Predicate } from './predicate';
import { RuleElementKey, ruleElementBase, RuleValue } from './rule-element-base';
import { DefenceValue } from './rule-element-defences';
import { WeaponCategory } from './rule-element-proficiency';
import { SkillSelector } from './selector';
import { SenseAcuitySchema } from './sense';
import { SizeSchema } from './size';
import { SpellRank } from './spell-rank';
import { Immunity, Trait } from './trait';
import { Feet } from './units';
import { DiceCount, DieSize, WeaponGroup } from './weapon';

/** How many of each kind of thing a form lists: a bat has two Strikes, a dragon a handful of resistances. */
const LIST_MAX = 16;

/** How many ranks a form can be heightened to: spell ranks 2 to 10, with room for the rank it starts at. */
const BRACKETS_MAX = 10;

/** The ways a form can move, as Foundry pf2e names them. */
export const FormMovement = { Land: 'land', Burrow: 'burrow', Climb: 'climb', Fly: 'fly', Swim: 'swim' } as const;
export type FormMovement = ValueOf<typeof FormMovement>;

/**
 * The form's Armor Class: `modifier` is the form's own AC (a number or a formula like `18 + @actor.level`), used when
 * higher than the character's. Without the flags, armour's check and Speed penalties carry over.
 */
const FormArmorClass = z.strictObject({
  modifier: RuleValue,
  ignoreCheckPenalty: z.boolean().optional(),
  ignoreSpeedReduction: z.boolean().optional(),
});

/** A skill the form sets: its `modifier`, unless the character's own is higher (Foundry's default; `ownIfHigher: false` sets it outright). */
const FormSkill = z.strictObject({ skill: SkillSelector, modifier: RuleValue, ownIfHigher: z.boolean().optional() });

/** A sense the form gives; without an acuity or range, the sense's own. */
const FormSense = z.strictObject({
  sense: ContentId,
  acuity: SenseAcuitySchema.optional(),
  range: Feet.positive().optional(),
});

const FormImmunity = z.strictObject({ type: Immunity });

const FormAdjustment = z.strictObject({
  type: z.union([DamageAdjustmentTargetSchema, Trait]),
  value: DefenceValue,
  exceptions: DamageExceptions.optional(),
});

/** The damage of a form's Strike: dice and a type, and the flat damage the form adds. A heightened form, or one that boosts the character's own weapon, names only what changes. */
const FormDamage = z.strictObject({
  dice: DiceCount,
  die: z.enum(DieSize).optional(),
  damageType: DamageTypeSchema,
  modifier: RuleValue.optional(),
});

/** What a form's Strike can have besides its damage. `modifier` is the attack modifier. */
const strikeFields = {
  slug: Slug,
  label: ContentText.optional(),
  baseType: Slug.optional(),
  ability: AttributeSchema.optional(),
  category: z.enum(WeaponCategory).optional(),
  group: z.enum(WeaponGroup).optional(),
  traits: z.array(Trait).max(LIST_MAX).readonly().optional(),
  range: Feet.positive().optional(),
  modifier: RuleValue.optional(),
  predicate: Predicate.optional(),
};

const FormStrike = z.strictObject({ ...strikeFields, damage: FormDamage.partial().optional() });

/** What a form sets, and what a heightened form changes: every field the form's rank can move. */
const statisticFields = {
  armorClass: FormArmorClass.optional(),
  size: SizeSchema.optional(),
  skills: z.array(FormSkill).max(LIST_MAX).readonly().optional(),
  speeds: z.partialRecord(z.enum(FormMovement), Feet).optional(),
  senses: z.array(FormSense).max(LIST_MAX).readonly().optional(),
  tempHP: RuleValue.optional(),
  immunities: z.array(FormImmunity).max(LIST_MAX).readonly().optional(),
  weaknesses: z.array(FormAdjustment).max(LIST_MAX).readonly().optional(),
  resistances: z.array(FormAdjustment).max(LIST_MAX).readonly().optional(),
};

/** The form's flags: what the character can still do in it. */
const flagFields = {
  /** Whether the form can cast spells; false for most animal forms. */
  canCast: z.boolean().optional(),
  canSpeak: z.boolean().optional(),
  /** Whether it has hands free to manipulate with. */
  hasHands: z.boolean().optional(),
  /** Whether the character's own unarmed Strikes stay alongside the form's. */
  keepsOwnUnarmed: z.boolean().optional(),
};

/** A heightened form's changes from `start`: the spell rank (or higher) at which they apply. */
export const BattleFormBracket = z.strictObject({
  start: SpellRank,
  ...statisticFields,
  strikes: z.array(FormStrike).max(LIST_MAX).readonly().optional(),
  traits: z.array(Trait).max(LIST_MAX).readonly().optional(),
});
export type BattleFormBracket = z.infer<typeof BattleFormBracket>;

/**
 * A battle form, as Foundry pf2e's `BattleForm` defines it (ADR-0008): the statistics a polymorph spell or feature
 * sets while it lasts. The base `form` is the lowest rank; each of `brackets` changes it from its `start` rank, so a
 * heightened form is data, not code. Values may be formulas (`18 + @actor.level`), read with the character's level.
 * The engine replaces a statistic only where the form's value is better, as the battle form rules say.
 */
export const BattleFormElement = z.strictObject({
  key: z.literal(RuleElementKey.BattleForm),
  form: z.strictObject({
    ...statisticFields,
    strikes: z.array(FormStrike).max(LIST_MAX).readonly().optional(),
    traits: z.array(Trait).max(LIST_MAX).readonly().optional(),
    ...flagFields,
  }),
  brackets: z.array(BattleFormBracket).max(BRACKETS_MAX).readonly().optional(),
  ...ruleElementBase,
});
export type BattleFormElement = z.infer<typeof BattleFormElement>;
