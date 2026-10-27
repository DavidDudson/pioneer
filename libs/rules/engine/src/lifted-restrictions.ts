import { Truth } from '@pioneer/rules/predicate';
import { RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentId, Origin, Slug } from '@pioneer/rules/sdk';

import type { ModifierInputs } from './rule-in-play';
import { truthOf } from './rule-value';

/** An environment restriction something lifts, and what lifts it. */
export interface LiftedRestriction {
  readonly restriction: Slug;
  /** The environment it is lifted in; absent when the element lifts it in any environment that lists it. */
  readonly environment?: ContentId;
  /** Every `LiftRestriction` element that lifts it, in the order found. */
  readonly origins: readonly Origin[];
}

/**
 * The environment restrictions lifted by the `LiftRestriction` elements in play whose predicate holds, each with the
 * origins that lift it, so the sheet can say which source did. Elements that name the same restriction and environment
 * are one lift with each origin.
 */
export function liftedRestrictions({ rules, facts }: ModifierInputs): readonly LiftedRestriction[] {
  const lifted: LiftedRestriction[] = [];
  for (const { element, origin } of rules) {
    if (element.key === RuleElementKey.LiftRestriction && truthOf(element.predicate, facts) === Truth.True) {
      const { restriction, environment } = element;
      const index = lifted.findIndex((held) => held.restriction === restriction && held.environment === environment);
      const held = lifted[index];
      if (held === undefined) {
        lifted.push({ restriction, ...(environment === undefined ? {} : { environment }), origins: [origin] });
      } else {
        lifted[index] = { ...held, origins: [...held.origins, origin] };
      }
    }
  }
  return lifted;
}
