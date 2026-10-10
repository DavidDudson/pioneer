import { InjectionToken } from '@angular/core';
import type { InputSignal, Type } from '@angular/core';
import type { ReturnPath } from '@pioneer/identity/domain';

/** A component the sign-in page shows above the provider buttons, told where to return after signing in. */
export interface SignInExtra {
  readonly returnTo: InputSignal<ReturnPath>;
}

/**
 * Extra ways to sign in, shown on the sign-in page. Empty in production; development builds provide the dev
 * users' one-click sign-in (apps/web `environment.development.ts`).
 */
export const SIGN_IN_EXTRAS = new InjectionToken<readonly Type<SignInExtra>[]>('SIGN_IN_EXTRAS', {
  providedIn: 'root',
  factory: (): readonly Type<SignInExtra>[] => [],
});
