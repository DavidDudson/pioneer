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
 * sign-in page, which brings it back to the page it asked for.
 */
export const signInRequired: CanActivateFn = async (_route, state): Promise<GuardResult> => {
  const router = inject(Router);
  const user = await inject(SessionStore).whenKnown();
  if (user !== undefined) {
    return true;
  }
  return router.createUrlTree([SIGN_IN_PATH], { queryParams: { [RETURN_TO_PARAM]: returnPathOr(state.url) } });
};

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
