import type { Type } from '@angular/core';
import type { TranslocoService } from '@jsverse/transloco';
import { contentBrowserMessages } from '@pioneer/content/ui';
import { rulesMessages } from '@pioneer/rules/sdk';
import { Locale } from '@pioneer/shared/kernel';
import { loadMessageScopes } from '@pioneer/shared/web';
import type { MessageScope } from '@pioneer/shared/web';

import { ContentSidePanel } from './content-side-panel.component';

/**
 * The messages the side panel reads beyond its host's own: its text (`content`), the entry browser's
 * (`contentBrowser`) and the rules text the entries show (`rules`).
 */
const SIDE_PANEL_SCOPES: readonly MessageScope[] = [
  { scope: 'content', messages: { [Locale.English]: async () => import('../../i18n/en.json') } },
  { scope: 'contentBrowser', messages: { [Locale.English]: async () => contentBrowserMessages.contentBrowser } },
  { scope: 'rules', messages: { [Locale.English]: async () => rulesMessages.rules } },
];

/**
 * Loads the side panel with its messages. A host that mounts the panel outside the content routes calls this from its
 * loader: scopes provided on a parent route are shadowed by the host route's own, and nothing else would load them.
 */
export async function loadSidePanel(i18n: TranslocoService): Promise<Type<unknown>> {
  await loadMessageScopes(i18n, SIDE_PANEL_SCOPES);
  return ContentSidePanel;
}
