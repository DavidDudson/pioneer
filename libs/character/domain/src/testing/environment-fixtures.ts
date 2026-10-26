import type { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { UNDERWATER } from './condition-fixture-ids';

/** Adds the underwater environment: a circumstance penalty to Fortitude saves, and no speech. */
export function withUnderwater(builder: ContentPackBuilder): ContentPackBuilder {
  return builder.withEnvironment(
    UNDERWATER,
    { restrictions: [{ id: 'speech', reason: "You can't speak underwater." }] },
    [{ key: 'FlatModifier', selectors: ['fortitude'], type: 'circumstance', slug: UNDERWATER, value: -1 }],
  );
}
