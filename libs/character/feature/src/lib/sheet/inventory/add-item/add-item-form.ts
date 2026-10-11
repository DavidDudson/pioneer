import { InventoryItemId, ItemQuantity } from '@pioneer/character/domain';
import { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { LOOSE } from '../sheet-inventory';

/** What the add-item form submits; the item and quantity use the schemas the server validates with. */
export const AddItemForm = z.object({
  item: ContentId,
  quantity: ItemQuantity,
  container: z.union([InventoryItemId, z.literal(LOOSE)]),
});

/** The form's model. Signal forms need concrete field types, so "no item yet" and "carried loose" are ''. */
export interface AddItemModel {
  readonly item: string;
  readonly quantity: number;
  readonly container: string;
}

export const EMPTY_ADD_ITEM: AddItemModel = { item: '', quantity: 1, container: LOOSE };
