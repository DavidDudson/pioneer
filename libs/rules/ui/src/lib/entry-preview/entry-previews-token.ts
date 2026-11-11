import { InjectionToken } from '@angular/core';

import type { EntryPreviews } from './entry-preview';

const NO_PREVIEWS: EntryPreviews = { preview: (): undefined => undefined };

/**
 * How a reference finds its preview. It lives in a file of its own, with the `@pioneer/rules/ui/entry-previews` entry
 * point, so the app shell can provide it without importing the whole library: through the library's index, the
 * shell's entry bundle would hold every component in it.
 */
export const ENTRY_PREVIEWS = new InjectionToken<EntryPreviews>('ENTRY_PREVIEWS', {
  factory: (): EntryPreviews => NO_PREVIEWS,
});
