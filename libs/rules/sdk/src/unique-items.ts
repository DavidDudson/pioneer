import { issueParams, message } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { RulesMessage } from './messages';

/**
 * A `.check` for lists of slugs, ids, enum values or levels in which each appears once: a repeat is an error at its index
 * naming it.
 */
export function uniqueItems<TItem extends string | number>(context: z.core.ParsePayload<readonly TItem[]>): void {
  const seen = new Set<TItem>();
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
}
