import { GrantsMessage } from '@pioneer/rules/grants';
import { describe, expect, it } from 'vitest';

import { EXAMPLE_GRANT_ENTRIES, EXAMPLE_GRANT_ROOTS } from './grant-examples';
import { checkGrants, GrantsStatus } from './grants-check';
import type { GrantsCheck, GrantsTexts } from './grants-check';
import { EXAMPLE_FACTS } from './predicate-verdict';
import { CheckStatus } from './rules-check';

/** The grants tool with the example texts unless given. */
function check(texts: Partial<GrantsTexts>): GrantsCheck {
  return checkGrants({ entries: EXAMPLE_GRANT_ENTRIES, roots: EXAMPLE_GRANT_ROOTS, facts: EXAMPLE_FACTS, ...texts });
}

describe(checkGrants, () => {
  it('opens on an example that resolves, roots in id order, each entry with the chain that granted it', () => {
    expect(check({})).toMatchObject({
      status: GrantsStatus.Valid,
      items: [
        { name: 'Fighter', via: [] },
        { name: 'Shield Block (fighter)', via: ['Fighter'] },
        { name: 'Shield Block', via: ['Fighter', 'Shield Block (fighter)'] },
        { name: 'Reactive Strike', via: ['Fighter'] },
        { name: 'Bravery', via: ['Fighter'] },
        { name: 'Woodland Elf', via: [] },
      ],
      duplicates: [{ name: 'Shield Block', via: [] }],
      conditional: [{ name: 'Climb in forest', via: ['Woodland Elf'] }],
      errors: [],
    });
  });

  it('reports a grant of an entry that is not in the array', () => {
    const entries = JSON.stringify([{ slug: 'fighter', name: 'Fighter', rules: [{ key: 'GrantItem', item: 'nope' }] }]);
    const result = check({ entries, roots: 'fighter' });
    expect(result).toMatchObject({
      status: GrantsStatus.Valid,
      errors: [{ error: { key: GrantsMessage.UnknownEntry }, via: ['Fighter'] }],
    });
  });

  it('points at entries that are not JSON, roots that are not slugs and roll options that are not options', () => {
    expect(check({ entries: '[', roots: 'fighter\nNot a slug', facts: 'self:level:5\n:bad' })).toMatchObject({
      status: GrantsStatus.Problems,
      entries: { status: CheckStatus.NotJson },
      rootLines: [2],
      factLines: [2],
    });
  });
});
