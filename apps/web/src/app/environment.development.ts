import { SIGN_IN_EXTRAS } from '@pioneer/identity/data-access';
import { DevSignIn, devSignInMessages } from '@pioneer/identity/dev-sign-in';

import type { AppEnvironment } from './app-environment';

/** Development builds: the seeded dev users' one-click sign-in on the sign-in page. */
export const environment: AppEnvironment = {
  providers: [{ provide: SIGN_IN_EXTRAS, useValue: [DevSignIn] }],
  messages: devSignInMessages,
};
