import { expect } from 'bun:test';

import { benchmark } from '@pioneer/shared/bench';

import { resolveGrants } from './resolve-grants';
import type { GrantInputs } from './resolve-grants';
import { inputsOf, picked, picksOf } from './testing/builders';
import { FIGHTER_CONTENT, LEVEL_20_PICKS } from './testing/fighter';

/** The issue's budget for a level 20 character, within the 10 ms budget for a whole derivation. */
const BUDGET_MS = 3;

/** The golden Fighter at 20th level with every slot picked. */
function inputs(): GrantInputs {
  return inputsOf({
    entries: FIGHTER_CONTENT,
    roots: [picked('fighter', 'class')],
    level: 20,
    picks: picksOf(LEVEL_20_PICKS),
  });
}

expect(resolveGrants(inputs()).answered).toHaveLength(LEVEL_20_PICKS.length);
benchmark({
  name: 'grants: level 20 Fighter resolves to a fixpoint',
  budgetMs: BUDGET_MS,
  prepare: inputs,
  run: resolveGrants,
});
