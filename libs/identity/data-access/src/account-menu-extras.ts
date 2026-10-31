import { InjectionToken } from '@angular/core';
import type { Type } from '@angular/core';

/**
 * Extra entries in the shell's account menu. Empty in production; development builds provide the dev-user switch
 * (apps/web `environment.development.ts`).
 */
export const ACCOUNT_MENU_EXTRAS = new InjectionToken<readonly Type<unknown>[]>('ACCOUNT_MENU_EXTRAS', {
  providedIn: 'root',
  factory: (): readonly Type<unknown>[] => [],
});
