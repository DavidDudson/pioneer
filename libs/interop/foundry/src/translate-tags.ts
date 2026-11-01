import { Slug } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog } from './kind-data-gaps';

const TAG_MAX = 64;
const TAGS_MAX = 16;

/** Foundry's `traits.otherTags`: the groups an item belongs to beyond its traits. */
export const FoundryTags = z.array(z.string().max(TAG_MAX)).max(TAGS_MAX);

/** An item's `otherTags` as `{ tags }` (`cleric-doctrine`, `starlit-sentinel-weapon`); a tag that is no slug is reported and left off. */
export function tagsOf(otherTags: readonly string[] | undefined, log: GapLog): object {
  const tags = (otherTags ?? []).flatMap((tag): Slug[] => {
    const slug = Slug.safeParse(tag);
    if (!slug.success) {
      report(log, { reason: KindDataGapReason.UnmappedValue, field: 'traits.otherTags', raw: tag });
    }
    return slug.success ? [slug.data] : [];
  });
  return tags.length === 0 ? {} : { tags: [...new Set(tags)] };
}
