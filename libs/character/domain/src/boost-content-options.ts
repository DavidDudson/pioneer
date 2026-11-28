import type { ContentLookup, RootSlotDefinition } from '@pioneer/rules/grants';

/** What `boostContent` reads beyond the registry; each is optional, and the defaults are a character's own. */
export interface BoostContentOptions {
  readonly rootSlots?: ReadonlyArray<RootSlotDefinition>;
  readonly lookup?: () => ContentLookup;
  readonly gradual?: boolean;
  readonly apex?: boolean;
}
