import { CORE_RULE_LIMITS, LIMIT_CEILINGS, RULE_LIMIT_FIELDS } from '@pioneer/character/domain';
import type { RuleLimitField } from '@pioneer/character/domain';

/** The server's answer for a character's own table limits: the core rules' numbers, `changed` laid over them. */
export function ruleLimitSettingsOf(changed: Partial<Record<RuleLimitField, number>> = {}): object {
  return {
    decidedBy: 'character',
    manageable: true,
    limits: RULE_LIMIT_FIELDS.map((limit) => ({
      limit,
      value: changed[limit] ?? CORE_RULE_LIMITS[limit],
      core: CORE_RULE_LIMITS[limit],
      ceiling: LIMIT_CEILINGS[limit],
      custom: changed[limit] !== undefined,
    })),
  };
}
