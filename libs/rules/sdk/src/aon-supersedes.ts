import * as z from 'zod';

import { AonUrl } from './source-ref';

/**
 * `content/aon/supersedes/<book>.json`: for each legacy entry of a book that AoN marks as replaced (its `remaster_id`),
 * the AoN URLs of the remaster entries that replace it, by the legacy entry's URL.
 */
export const AonSupersedesFile = z.strictObject({
  replacedBy: z.record(AonUrl, z.array(AonUrl).min(1).readonly()),
});
export type AonSupersedesFile = z.infer<typeof AonSupersedesFile>;
