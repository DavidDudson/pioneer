import { inject } from '@angular/core';
import type { LinkTarget } from '@pioneer/frontier';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { conditionCard, entryTarget } from '@pioneer/rules/ui';
import type { EntryPreview, EntryPreviews } from '@pioneer/rules/ui';

import { entryCard, entryIndex, entryKinds } from './entry-lookup';

/**
 * The card of `entry` as any reader meets it: its page's card, with the ways it ends when it is a condition. Names
 * the entries it points at from `index`, which holds every entry the page loaded.
 */
function fetchedCard(
  entry: ContentEntry,
  description: ContentEntry['description'] | undefined,
  index: ReadonlyMap<ContentId, ContentEntry>,
): EntryPreview {
  return conditionCard(entry, entryCard(entry, description), (id) => {
    const named = index.get(id);
    return named === undefined ? undefined : { id, name: named.name };
  });
}

/**
 * Previews for a page that loads no content of its own: every reference opens a card, fetched with the entry's kinds
 * the first time one is opened and kept for the next, so a mention in a roll, a toast, a note or a campaign page shows
 * the same card as the content browser. A condition's card carries the ways it ends. The card links to the entry's page.
 */
export function fetchedEntryPreviews(): EntryPreviews {
  const loader = inject(ContentLoader);
  const kept: {
    attempt: Promise<ContentRegistry> | undefined;
    index: ReadonlyMap<ContentId, ContentEntry> | undefined;
  } = { attempt: undefined, index: undefined };
  const fetchIndex = async (): Promise<ReadonlyMap<ContentId, ContentEntry>> => {
    kept.attempt ??= loader.registry(entryKinds(ContentKind.Condition));
    const { attempt } = kept;
    try {
      kept.index = entryIndex(await attempt);
      return kept.index;
    } catch (error) {
      // Only its own failure: a retry already under way is not this attempt's to forget.
      if (kept.attempt === attempt) {
        kept.attempt = undefined;
      }
      throw error;
    }
  };
  return {
    preview: (id): EntryPreview | undefined => {
      const { index } = kept;
      const entry = index?.get(id);
      return index === undefined || entry === undefined ? undefined : fetchedCard(entry, undefined, index);
    },
    load: async (id): Promise<EntryPreview | undefined> => {
      const index = await fetchIndex();
      const entry = index.get(id);
      if (entry === undefined) {
        return undefined;
      }
      return fetchedCard(entry, await loader.description(entry), index);
    },
    target: (id): LinkTarget | undefined => {
      const entry = kept.index?.get(id);
      return entry === undefined ? undefined : entryTarget(entry);
    },
  };
}
