import type { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { GILLED, UNDERWATER } from './condition-fixture-ids';

/**
 * Adds the underwater environment: a circumstance penalty to Fortitude saves, and no speech; and the gilled condition,
 * which lifts the speech restriction.
 */
export function withUnderwater(builder: ContentPackBuilder): ContentPackBuilder {
  builder.withCondition(GILLED, [{ key: 'LiftRestriction', restriction: 'speech' }]);
  return builder.withEnvironment(
    UNDERWATER,
    { restrictions: [{ id: 'speech', reason: "You can't speak underwater." }] },
    [{ key: 'FlatModifier', selectors: ['fortitude'], type: 'circumstance', slug: UNDERWATER, value: -1 }],
  );
}
