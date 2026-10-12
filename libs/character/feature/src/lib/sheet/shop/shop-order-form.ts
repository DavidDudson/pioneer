import { InventoryItemId, ItemQuantity } from '@pioneer/character/domain';
import * as z from 'zod';

import { LOOSE } from '../inventory/sheet-inventory';

/** What the order form submits for the picked item; the quantity uses the schema the server validates with. */
export const ShopOrderForm = z.object({
  quantity: ItemQuantity,
  container: z.union([InventoryItemId, z.literal(LOOSE)]),
});

/** The form's model. Signal forms need concrete field types, so "carried loose" is ''. */
export interface ShopOrderModel {
  readonly quantity: number;
  readonly container: string;
}

export const EMPTY_ORDER: ShopOrderModel = { quantity: 1, container: LOOSE };
