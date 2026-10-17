import type { EnvironmentProviders } from '@angular/core';
import type { SheetSidePanelLoader } from '@pioneer/character/feature';
import { Locale } from '@pioneer/shared/kernel';
import { provideMessageScope } from '@pioneer/shared/web';

/**
 * The content search beside a character sheet. The character context may not import the content one, so the app loads
 * it when the sheet asks, from the content chunk the shell's search already comes from.
 */
export const sheetSidePanel: SheetSidePanelLoader = async () => {
  const { ContentSidePanel } = await import('@pioneer/content/feature');
  return ContentSidePanel;
};

/** The messages the panel reads beyond the sheet's own: its text and the entry browser's, loaded with the panel. */
export function provideSheetSidePanelMessages(): EnvironmentProviders[] {
  return [
    provideMessageScope('content', {
      [Locale.English]: async () => {
        const { contentMessages } = await import('@pioneer/content/feature');
        return contentMessages;
      },
    }),
    provideMessageScope('contentBrowser', {
      [Locale.English]: async () => {
        const { contentBrowserMessages } = await import('@pioneer/content/ui');
        return contentBrowserMessages.contentBrowser;
      },
    }),
  ];
}
