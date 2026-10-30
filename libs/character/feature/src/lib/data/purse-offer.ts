import { InjectionToken } from '@angular/core';
import type { Type } from '@angular/core';

/**
 * Loads the component that offers coins from a character's purse to another character of the campaign. It takes the
 * inputs `campaign` and `character`, both strings, and `purse`, the coins held per denomination (`pp`, `gp`, `sp`, `cp`).
 */
export type PurseOfferLoader = () => Promise<Type<unknown>>;

/**
 * The offer control beside the coins of a character in a campaign (ADR-0064). The character context may not import the
 * campaign one, so the app provides it (`PURSE_OFFER`); without one the sheet offers nothing.
 */
export const PURSE_OFFER = new InjectionToken<PurseOfferLoader | undefined>('PURSE_OFFER', {
  factory: (): undefined => undefined,
});
