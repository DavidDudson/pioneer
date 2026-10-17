import { describe, expect, test } from 'bun:test';

import { CORE_LIMIT_DEFAULTS, RuleLimitKey } from '@pioneer/campaign/domain';
import { CORE_RULE_LIMITS } from '@pioneer/character/domain';

describe('the campaign context’s table limits against the character context’s', () => {
  test('a campaign’s default for each limit is the core rules’ number', () => {
    expect<object>(CORE_LIMIT_DEFAULTS).toStrictEqual(CORE_RULE_LIMITS);
  });

  test('the campaign names exactly the limits the character context holds', () => {
    expect(Object.values(RuleLimitKey).map(String).toSorted()).toStrictEqual(Object.keys(CORE_RULE_LIMITS).toSorted());
  });
});
