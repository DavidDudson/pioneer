import { InjectionToken } from '@angular/core';
import type { Type } from '@angular/core';

/**
 * Loads the component that shows the campaign's Party Inventory beside a character's own. It takes the inputs
 * `campaign` and `character`, both strings, and `lines`, the character's lines that may go in it (`{ id, name }`).
 */
export type PartyInventoryLoader = () => Promise<Type<unknown>>;

/**
 * The Party Inventory container on the sheet of a character in a campaign (ADR-0076). The character context may not
 * import the campaign one, so the app provides it (`PARTY_INVENTORY`); without one the sheet shows nothing.
 */
export const PARTY_INVENTORY = new InjectionToken<PartyInventoryLoader | undefined>('PARTY_INVENTORY', {
  factory: (): undefined => undefined,
});
