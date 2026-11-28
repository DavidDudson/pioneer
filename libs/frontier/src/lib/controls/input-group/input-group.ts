import { InjectionToken } from '@angular/core';

/**
 * Provided by `fr-input-group`: an `fr-input` inside it drops its own box (border, fill, focus ring), because the
 * group draws one around the input and its addons.
 */
export const INPUT_GROUP = new InjectionToken<true>('INPUT_GROUP');
