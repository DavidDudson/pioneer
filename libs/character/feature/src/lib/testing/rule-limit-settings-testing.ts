import { CORE_RULE_LIMITS, LIMIT_CEILINGS, RULE_LIMIT_FIELDS, RuleLimitSource } from '@pioneer/character/domain';
import type { RuleLimitField } from '@pioneer/character/domain';

/** The limits some layer sets, by name. */
type LimitNumbers = Partial<Record<RuleLimitField, number>>;

/**
 * The server's answer for a character's own table limits: the core rules' numbers, `variant` laid over them (what the
 * variant rules in force change), then `changed` (what the owner set).
 */
export function ruleLimitSettingsOf(changed: LimitNumbers = {}, variant: LimitNumbers = {}): object {
  return {
    decidedBy: 'character',
    manageable: true,
    limits: RULE_LIMIT_FIELDS.map((limit) => ({
      limit,
      value: changed[limit] ?? variant[limit] ?? CORE_RULE_LIMITS[limit],
      core: CORE_RULE_LIMITS[limit],
      ceiling: LIMIT_CEILINGS[limit],
      custom: changed[limit] !== undefined,
      source: sourceOf(changed[limit], variant[limit]),
    })),
  };
}

function sourceOf(changed: number | undefined, variant: number | undefined): RuleLimitSource {
  if (changed !== undefined) {
    return RuleLimitSource.Character;
  }
  return variant === undefined ? RuleLimitSource.Core : RuleLimitSource.Variant;
}
