import { Pg, Uuid } from '@pioneer/shared/kernel';
import type { Temporal, UserId, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttachedCampaignName, PackAuthoritySchema } from './character-packs';
import { RuleLimitsSchema } from './rule-limits';
import type { RuleLimitOverrides } from './rule-limits';

/** Row id of one table limit a character has set; the audit log keys every row by an `id`. */
export const CharacterRuleLimitId = Uuid.brand<'CharacterRuleLimitId'>();
export type CharacterRuleLimitId = z.infer<typeof CharacterRuleLimitId>;

/** The name of a limit a table can change: a field of `RuleLimits` (ADR-0064). */
export const RuleLimitFieldSchema = RuleLimitsSchema.keyof();
export type RuleLimitField = z.infer<typeof RuleLimitFieldSchema>;

/** A number a limit takes: a whole number from 1. Each limit's ceiling is `LIMIT_CEILINGS`. */
export const RuleLimitSettingValue = Pg.smallint().positive().brand<'RuleLimitSettingValue'>();
export type RuleLimitSettingValue = z.infer<typeof RuleLimitSettingValue>;

const CEILING_INVESTED = RuleLimitSettingValue.parse(100);
const CEILING_HANDS = RuleLimitSettingValue.parse(10);
const CEILING_PROPERTY_RUNES = RuleLimitSettingValue.parse(10);
const CEILING_ITEMS = RuleLimitSettingValue.parse(5000);

/**
 * The most an owner can set each limit to; far past any table's need, so a typo cannot store nonsense. A test in
 * `apps/api` holds these to the campaign context's, as a campaign and a character set limits alike.
 */
export const LIMIT_CEILINGS: Readonly<Record<RuleLimitField, RuleLimitSettingValue>> = {
  investedMax: CEILING_INVESTED,
  handsMax: CEILING_HANDS,
  propertyRunesPerGrade: CEILING_PROPERTY_RUNES,
  itemsMax: CEILING_ITEMS,
};

/** The order the limits are listed in. */
export const RULE_LIMIT_FIELDS: readonly RuleLimitField[] = RuleLimitFieldSchema.options;

/**
 * Where the number in force for a limit comes from, lowest first: the core rules, a variant rule in force, then an
 * explicit setting by the campaign's GM or by the character's owner (ADR-0064).
 */
export const RuleLimitSource = {
  Core: 'core',
  Variant: 'variant',
  Campaign: 'campaign',
  Character: 'character',
} as const;
export type RuleLimitSource = ValueOf<typeof RuleLimitSource>;
export const RuleLimitSourceSchema = z.enum(RuleLimitSource);

/** The layers a limit's number is worked out from. */
export interface RuleLimitLayers {
  /** What the variant rules in force change. */
  readonly variant: RuleLimitOverrides;
  /** What was set explicitly. */
  readonly set: RuleLimitOverrides;
  /** Who set it: the campaign's GM or the character's owner. */
  readonly setter: typeof RuleLimitSource.Campaign | typeof RuleLimitSource.Character;
}

/** Where `limit`'s number comes from: an explicit setting beats a variant rule, which beats the core rules (ADR-0064). */
export function sourceOf(limit: RuleLimitField, { variant, set, setter }: RuleLimitLayers): RuleLimitSource {
  if (set[limit] !== undefined) {
    return setter;
  }
  return variant[limit] === undefined ? RuleLimitSource.Core : RuleLimitSource.Variant;
}

/** A limit a character has set. Absent means the core number. */
export interface CharacterRuleLimit {
  readonly id: CharacterRuleLimitId;
  readonly limit: RuleLimitField;
  readonly value: RuleLimitSettingValue;
  /** The owner who set it; absent once their account is deleted. */
  readonly setBy: UserId | undefined;
  readonly setAt: Temporal.Instant;
}

/** One limit as the character's owner sees it. */
export const CharacterRuleLimitSetting = z.object({
  limit: RuleLimitFieldSchema,
  /** The number in force: an explicit setting, else the variant rules in force, else the core rules'. */
  value: RuleLimitSettingValue,
  /** The core rules' number, which a reset returns to. */
  core: RuleLimitSettingValue,
  /** The most the owner can set it to. */
  ceiling: RuleLimitSettingValue,
  /** Whether it is set explicitly, by the owner or the campaign's GM; a reset removes that. */
  custom: z.boolean(),
  /** Where the number in force comes from. */
  source: RuleLimitSourceSchema,
});
export type CharacterRuleLimitSetting = z.output<typeof CharacterRuleLimitSetting>;

/** JSON shape of a character's table limits: each limit, and who decides them. */
export const CharacterRuleLimitSettings = z.object({
  decidedBy: PackAuthoritySchema,
  /** The campaign that decides, when one does. */
  campaign: AttachedCampaignName.optional(),
  /** Whether the viewer may change the limits: the owner, while no campaign decides. */
  manageable: z.boolean(),
  /** Every limit, in a fixed order. */
  limits: z.array(CharacterRuleLimitSetting).readonly(),
});
export type CharacterRuleLimitSettings = z.output<typeof CharacterRuleLimitSettings>;

/** The number the owner sets a limit to. */
export const SetRuleLimitSettingBody = z.object({ value: RuleLimitSettingValue });
export type SetRuleLimitSettingBody = z.infer<typeof SetRuleLimitSettingBody>;

/** A limit and the number it is set to. */
export interface RuleLimitSettingChange {
  readonly limit: RuleLimitField;
  readonly value: RuleLimitSettingValue;
}
