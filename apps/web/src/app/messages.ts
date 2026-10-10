import { frontierMessages } from '@pioneer/frontier';
import { kernelMessages, Locale } from '@pioneer/shared/kernel';
import type { LocaleMessages } from '@pioneer/shared/web';

import shellMessages from '../i18n/en.json';
import { environment } from './environment';

/**
 * Root messages: the shell, kernel problems and validation, frontier, and the build environment's, inlined in the
 * first load. Features load their own scope.
 */
export const appMessages: LocaleMessages = {
  [Locale.English]: async () => ({ ...shellMessages, ...kernelMessages, ...frontierMessages, ...environment.messages }),
};
