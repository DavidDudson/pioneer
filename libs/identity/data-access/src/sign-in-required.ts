import { inject, Injector } from '@angular/core';
import type { Provider } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn, GuardResult } from '@angular/router';
import { RETURN_TO_PARAM, returnPathOr, SIGN_IN_PATH } from '@pioneer/identity/domain';
import { UNAUTHORIZED_HANDLER } from '@pioneer/shared/web';
import type { UnauthorizedHandler } from '@pioneer/shared/web';

import { SessionStore } from './session-store';

/**
 * Route guard for pages that need an account (ADR-0007): signed out, the browser goes to the
 * sign-in page, which brings it back to the page it asked for. When the server can't say who is
 * signed in, the page opens anyway: its regions show their own load errors, and a 401 there still
 * prompts sign-in.
 */
export const signInRequired: CanActivateFn = async (_route, state): Promise<GuardResult> => {
  const router = inject(Router);
  const mayEnter = await signedInOrUnknown(inject(SessionStore));
  if (mayEnter) {
    return true;
  }
  return router.createUrlTree([SIGN_IN_PATH], { queryParams: { [RETURN_TO_PARAM]: returnPathOr(state.url) } });
};

/** False only when the server says nobody is signed in. */
async function signedInOrUnknown(session: SessionStore): Promise<boolean> {
  try {
    const user = await session.whenKnown();
    return user !== undefined;
  } catch {
    // The page's own regions report the failure; the guard only decides about sign-in.
    return true;
  }
}

/** Makes every API call that answers 401 prompt sign-in (see `SessionStore.promptSignIn`). */
export function provideSignInOnUnauthorized(): Provider {
  return {
    provide: UNAUTHORIZED_HANDLER,
    useFactory: (): UnauthorizedHandler => {
      // Looked up on use: SessionStore needs ApiClient, which needs this handler.
      const injector = inject(Injector);
      return async (): Promise<void> => injector.get(SessionStore).promptSignIn();
    },
  };
}
