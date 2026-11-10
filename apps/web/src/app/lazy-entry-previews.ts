import { inject, Injector, runInInjectionContext } from '@angular/core';
import type { LinkTarget } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';
import type { EntryPreview, EntryPreviews } from '@pioneer/rules/ui';

/**
 * The previews of every page that gives none of its own, so a reference in a roll, a toast, a note or a campaign page
 * opens a card. The content feature that works them out is its own chunk, fetched the first time a card opens and kept,
 * so the app's entry bundle stays as it was; a card read before then has no preview, and its reference reads as it did.
 */
export function lazyEntryPreviews(): EntryPreviews {
  const injector = inject(Injector);
  const kept: { loading: Promise<EntryPreviews> | undefined; loaded: EntryPreviews | undefined } = {
    loading: undefined,
    loaded: undefined,
  };
  const fetchPreviews = async (): Promise<EntryPreviews> => {
    const { fetchedEntryPreviews } = await import('@pioneer/content/feature');
    return runInInjectionContext(injector, fetchedEntryPreviews);
  };
  const load = async (): Promise<EntryPreviews> => {
    kept.loading ??= fetchPreviews();
    kept.loaded = await kept.loading;
    return kept.loaded;
  };
  return {
    preview: (id: ContentId): EntryPreview | undefined => kept.loaded?.preview(id),
    load: async (id: ContentId): Promise<EntryPreview | undefined> => {
      const previews = await load();
      return previews.load?.(id);
    },
    target: (id: ContentId): LinkTarget | undefined => kept.loaded?.target?.(id),
  };
}
