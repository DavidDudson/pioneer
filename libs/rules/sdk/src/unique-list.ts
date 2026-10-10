import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';

interface ListBounds {
  readonly min?: number;
  readonly max: number;
}

/** A list of slugs, ids or enum values in which each appears once; a repeat is an error at its index naming it. */
export function uniqueList<TItem extends z.ZodType<string>>(item: TItem, { min = 0, max }: ListBounds) {
  return z
    .array(item)
    .min(min)
    .max(max)
    .readonly()
    .check((context) => {
      const seen = new Set<string>();
      for (const [index, value] of context.value.entries()) {
        if (seen.has(value)) {
          context.issues.push({
            code: 'custom',
            input: context.value,
            path: [index],
            ...issueParams(message(RulesMessage.ListDuplicate, { value })),
          });
        }
        seen.add(value);
      }
    });
}
