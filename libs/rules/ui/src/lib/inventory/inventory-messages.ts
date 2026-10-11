import { BulkWeight } from '@pioneer/rules/sdk';

import type { InventoryPlacement } from './inventory-line';

/** Message keys the inventory renders with, spelled out so the key check sees them. */
export const InventoryMessage = {
  None: 'rules.inventory.none',
  Quantity: 'rules.inventory.quantity',
  Bulk: 'rules.inventory.bulk',
  BulkPer: 'rules.inventory.bulkPer',
  BulkCount: 'rules.inventory.bulkCount',
  ContentName: 'rules.inventory.contentName',
  UnknownItem: 'rules.inventory.unknownItem',
  Hands: 'rules.inventory.hands',
  Invested: 'rules.inventory.invested',
} as const;

export const PLACEMENT_MESSAGES: Readonly<Record<InventoryPlacement, string>> = {
  worn: 'rules.inventory.placement.worn',
  held: 'rules.inventory.placement.held',
  stowed: 'rules.inventory.placement.stowed',
  dropped: 'rules.inventory.placement.dropped',
};

/** How Bulk below 1 is written: "L" and "—", as the rules print them. */
export const BULK_WEIGHT_MESSAGES: Readonly<Record<BulkWeight, string>> = {
  [BulkWeight.Light]: 'rules.inventory.bulkLight',
  [BulkWeight.Negligible]: 'rules.inventory.bulkNegligible',
};
