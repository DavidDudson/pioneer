import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Frequency } from './action';
import { Slug } from './content-id';
import { RulesMessage } from './messages';

const ACTIVATION_NAME_MAX = 100;
const ACTIVATIONS_MAX = 8;

/** The name of an item activation as the item gives it ("Take to the Skies"). */
export const ActivationName = z.string().trim().min(1).max(ACTIVATION_NAME_MAX).brand<'ActivationName'>();
export type ActivationName = z.infer<typeof ActivationName>;

/**
 * One way to activate an item that is limited by a `frequency`. Its `slug` is the name within the item, so the uses
 * spent on it stay with it when the content is imported again. An `overcharge` activation can be used once more per
 * period beyond its frequency, at the cost the item's rules give; play counts that use apart from the others.
 */
export const Activation = z.strictObject({
  slug: Slug,
  name: ActivationName,
  frequency: Frequency,
  overcharge: z.literal(true).optional(),
});
export type Activation = z.infer<typeof Activation>;

/** An item's activations that have a frequency, each named once. */
export const Activations = z
  .array(Activation)
  .min(1)
  .max(ACTIVATIONS_MAX)
  .readonly()
  .check((context) => {
    const seen = new Set<Slug>();
    for (const [index, { slug }] of context.value.entries()) {
      if (seen.has(slug)) {
        context.issues.push({
          code: 'custom',
          input: context.value,
          path: [index, 'slug'],
          ...issueParams(message(RulesMessage.ListDuplicate, { value: slug })),
        });
      }
      seen.add(slug);
    }
  });
export type Activations = z.infer<typeof Activations>;
