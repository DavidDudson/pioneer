import { BulkWeight } from '@pioneer/rules/sdk';

import { LoadEffect } from './inventory-line';
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
  Melded: 'rules.inventory.melded',
  RuleBreaking: 'rules.inventory.ruleBreaking',
  ApprovedByGm: 'rules.inventory.approvedByGm',
  KeyItem: 'rules.inventory.keyItem',
  Load: 'rules.inventory.load',
  LoadUnlimited: 'rules.inventory.loadUnlimited',
} as const;

/** Why a container's Bulk is what it is, by what it does to the Bulk it holds. */
export const LOAD_EFFECT_MESSAGES: Readonly<Record<LoadEffect, string>> = {
  [LoadEffect.AddsAll]: 'rules.inventory.loadEffect.addsAll',
  [LoadEffect.Ignores]: 'rules.inventory.loadEffect.ignores',
  [LoadEffect.AddsNone]: 'rules.inventory.loadEffect.addsNone',
};

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
