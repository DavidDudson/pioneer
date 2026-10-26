import * as z from 'zod';

import { ContentId, Slug } from './content-id';
import { RuleElementKey, ruleElementBase } from './rule-element-base';

/**
 * Lifts one restriction of an environment while its predicate holds: a swim speed or the aquatic trait lifts underwater's
 * `speech`, Air Bubble lifts its `fire-effects`. The `restriction` is the id an environment lists
 * (`EnvironmentRestriction`); without an `environment` it lifts that restriction in any environment that lists it. The
 * sheet names the entry that lifted it. A Pioneer element: Foundry has no environment contexts.
 */
export const LiftRestrictionElement = z.strictObject({
  key: z.literal(RuleElementKey.LiftRestriction),
  restriction: Slug,
  environment: ContentId.optional(),
  ...ruleElementBase,
});
export type LiftRestrictionElement = z.infer<typeof LiftRestrictionElement>;
