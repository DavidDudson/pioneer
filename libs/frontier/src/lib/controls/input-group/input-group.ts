import { InjectionToken } from '@angular/core';

/**
 * Provided by `fr-input-group`: an `fr-input` inside it drops its own box, since the group draws one around it.
 */
export const INPUT_GROUP = new InjectionToken<true>('INPUT_GROUP');
