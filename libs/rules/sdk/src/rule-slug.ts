import type * as z from 'zod';

import { Slug } from './content-id';

/**
 * A name another element refers back to: the flag a `ChoiceSet` stores its selection under, or
 * the slug a `FlatModifier` gives the modifier so an `AdjustModifier` can find it.
 */
export const RuleSlug = Slug.brand<'RuleSlug'>();

export type RuleSlug = z.infer<typeof RuleSlug>;
