import type { EnvironmentProviders } from '@angular/core';
import { contentBrowserMessages } from '@pioneer/content/ui';
import { Locale } from '@pioneer/shared/kernel';
import { provideMessageScope } from '@pioneer/shared/web';

/**
 * The messages the side panel reads beyond its host's own: its text (`content`) and the entry browser's
 * (`contentBrowser`). A host that mounts the panel outside the content routes provides them with its route.
 */
export function provideSidePanelMessages(): EnvironmentProviders[] {
  return [
    provideMessageScope('content', { [Locale.English]: async () => import('../../i18n/en.json') }),
    provideMessageScope('contentBrowser', { [Locale.English]: async () => contentBrowserMessages.contentBrowser }),
  ];
}
