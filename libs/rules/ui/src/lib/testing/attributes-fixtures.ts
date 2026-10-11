import { AttributeModifiers, AttributeModifiersWire, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { AttributesMessage } from '../attributes/attributes-messages';
import type { OpenBoostLine } from '../attributes/attributes.component';

/** A 1st-level elf fighter with every boost placed: Strength and Dexterity high, a Constitution flaw undone. */
export const FIGHTER_MODIFIERS = new AttributeModifiers(
  AttributeModifiersWire.parse({ str: 4, dex: 2, con: 0, int: 1, wis: 1, cha: 0 }),
);

/** The class key attribute and one free boost still to place. */
export const OPEN_BOOSTS: readonly OpenBoostLine[] = [
  { key: SlotKey.parse('boost:1:class:0'), label: message(AttributesMessage.ClassBoost) },
  { key: SlotKey.parse('boost:1:free:3'), label: message(AttributesMessage.FreeBoost, { level: 1 }) },
];
