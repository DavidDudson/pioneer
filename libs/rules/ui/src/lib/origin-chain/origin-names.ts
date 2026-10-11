import type { EventRef, InventoryItemId, PackId, SlotKey } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Display names a container resolved for what an origin chain refers to, beyond content entries: who set an
 * override (and wrote a homebrew source), the slot a choice filled, the inventory item, the campaign event that
 * applied a condition or effect, and homebrew packs. Each is optional; a missing name has a fallback.
 */
export interface OriginNames {
  readonly users?: ReadonlyMap<UserId, string>;
  readonly slots?: ReadonlyMap<SlotKey, string>;
  readonly items?: ReadonlyMap<InventoryItemId, string>;
  readonly events?: ReadonlyMap<EventRef, string>;
  readonly packs?: ReadonlyMap<PackId, string>;
}

export const NO_ORIGIN_NAMES: OriginNames = {};
