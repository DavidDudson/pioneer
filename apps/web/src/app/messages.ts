import { frontierMessages } from '@pioneer/frontier';
import { kernelMessages, Locale } from '@pioneer/shared/kernel';
import type { LocaleMessages } from '@pioneer/shared/web';

import shellMessages from '../i18n/en.json';

/** Root messages: the shell, kernel problems and validation, and frontier, inlined in the first load. Features load their own scope. */
export const appMessages: LocaleMessages = {
  [Locale.English]: async () => ({ ...shellMessages, ...kernelMessages, ...frontierMessages }),
};
