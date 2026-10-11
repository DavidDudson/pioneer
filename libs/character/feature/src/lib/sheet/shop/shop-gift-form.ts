import { InventoryItemId, ItemQuantity } from '@pioneer/character/domain';
import * as z from 'zod';

import { LOOSE } from '../inventory/sheet-inventory';

/** What the gift form submits for the picked item; the quantity uses the schema the server validates with. */
export const ShopGiftForm = z.object({
  quantity: ItemQuantity,
  container: z.union([InventoryItemId, z.literal(LOOSE)]),
});

/** The form's model. Signal forms need concrete field types, so "carried loose" is ''. */
export interface ShopGiftModel {
  readonly quantity: number;
  readonly container: string;
}

export const EMPTY_GIFT: ShopGiftModel = { quantity: 1, container: LOOSE };
