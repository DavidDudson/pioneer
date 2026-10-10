import { issueParams, message } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { RulesMessage } from './messages';

/**
 * A `.check` for lists of slugs, ids or enum values in which each appears once: a repeat is an error at its index
 * naming it.
 */
export function uniqueItems(context: z.core.ParsePayload<readonly string[]>): void {
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
}
