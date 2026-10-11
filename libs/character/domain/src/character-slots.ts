import type { RootSlotDefinition } from '@pioneer/rules/grants';
import { ContentKind, SlotKey } from '@pioneer/rules/sdk';

/** The slot the character's ancestry is picked in (character-model.md, "Choice slots"). */
export const ANCESTRY_SLOT = SlotKey.parse('ancestry');

/** The slots a character has itself, before any entry grants more. Heritage, background and class join with content. */
export const CHARACTER_ROOT_SLOTS: readonly RootSlotDefinition[] = [{ key: ANCESTRY_SLOT, kind: ContentKind.Ancestry }];
