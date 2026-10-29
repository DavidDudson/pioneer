import { InjectionToken } from '@angular/core';
import type { Type } from '@angular/core';

/**
 * Loads the component that offers an inventory line to another character of the campaign. It takes the inputs
 * `campaign`, `character`, `line` and `name`, all strings.
 */
export type InventoryLineOfferLoader = () => Promise<Type<unknown>>;

/**
 * The offer control beside a line of a character in a campaign (ADR-0064). The character context may not import the
 * campaign one, so the app provides it (`INVENTORY_LINE_OFFER`); without one the sheet offers nothing.
 */
export const INVENTORY_LINE_OFFER = new InjectionToken<InventoryLineOfferLoader | undefined>('INVENTORY_LINE_OFFER', {
  factory: (): undefined => undefined,
});
