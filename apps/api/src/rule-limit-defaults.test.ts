import { describe, expect, test } from 'bun:test';

import {
  CORE_LIMIT_DEFAULTS,
  LIMIT_CEILINGS as CAMPAIGN_CEILINGS,
  RuleLimitKey,
  RuleLimitSource as CampaignSource,
} from '@pioneer/campaign/domain';
import {
  CORE_RULE_LIMITS,
  LIMIT_CEILINGS as CHARACTER_CEILINGS,
  RuleLimitSource as CharacterSource,
} from '@pioneer/character/domain';
import { VariantRuleLimits } from '@pioneer/rules/sdk';

describe('the campaign context’s table limits against the character context’s', () => {
  test('a campaign’s default for each limit is the core rules’ number', () => {
    expect(CORE_LIMIT_DEFAULTS).toStrictEqual(CORE_RULE_LIMITS);
  });

  test('the campaign names exactly the limits the character context holds', () => {
    expect(Object.values(RuleLimitKey).map(String).toSorted()).toStrictEqual(Object.keys(CORE_RULE_LIMITS).toSorted());
  });

  test('a character’s ceiling for each limit is the campaign’s', () => {
    expect(CHARACTER_CEILINGS).toStrictEqual(CAMPAIGN_CEILINGS);
  });

  test('a variant rule declares exactly the limits the character context holds', () => {
    expect(Object.keys(VariantRuleLimits.shape).toSorted()).toStrictEqual(Object.keys(CORE_RULE_LIMITS).toSorted());
  });

  test('a variant rule’s ceiling for each limit is the character’s', () => {
    for (const [limit, ceiling] of Object.entries(CHARACTER_CEILINGS)) {
      expect(VariantRuleLimits.safeParse({ [limit]: ceiling }).success).toBe(true);
      expect(VariantRuleLimits.safeParse({ [limit]: ceiling + 1 }).success).toBe(false);
    }
  });

  test('the campaign’s sources are among the character’s', () => {
    expect(Object.values(CampaignSource).every((source) => Object.values(CharacterSource).includes(source))).toBe(true);
  });
});
