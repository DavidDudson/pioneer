import { ACCOUNT_MENU_EXTRAS, SIGN_IN_EXTRAS } from '@pioneer/identity/data-access';
import { DevSignIn, devSignInMessages, DevUserSwitch } from '@pioneer/identity/dev-sign-in';

import type { AppEnvironment } from './app-environment';

/**
 * Development builds: the seeded dev users' one-click sign-in on the sign-in page and switch in the account menu, and one-click imports of the
 * sample characters on the character list.
 */
export const environment: AppEnvironment = {
  providers: [
    { provide: SIGN_IN_EXTRAS, useValue: [DevSignIn] },
    { provide: ACCOUNT_MENU_EXTRAS, useValue: [DevUserSwitch] },
  ],
  messages: devSignInMessages,
  characterListExtras: [
    async () => {
      const { SampleCharacterImport } = await import('@pioneer/character/feature/dev');
      return SampleCharacterImport;
    },
  ],
};
