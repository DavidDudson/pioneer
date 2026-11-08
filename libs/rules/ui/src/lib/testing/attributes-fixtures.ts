import type { StatisticValue } from '@pioneer/rules/engine';
import { Attribute, AttributeModifiers, AttributeModifiersWire, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { AttributesMessage } from '../attributes/attributes-messages';
import type { OpenBoostLine } from '../attributes/attributes.component';
import { statistic, term } from './breakdown-fixtures';

/** A 1st-level elf fighter with every boost placed: Strength and Dexterity high, a Constitution flaw undone. */
export const FIGHTER_MODIFIERS = new AttributeModifiers(
  AttributeModifiersWire.parse({ str: 4, dex: 2, con: 0, int: 1, wis: 1, cha: 0 }),
);

/** The class key attribute and one free boost still to place. */
export const OPEN_BOOSTS: readonly OpenBoostLine[] = [
  { key: SlotKey.parse('boost:1:class:0'), label: message(AttributesMessage.ClassBoost) },
  { key: SlotKey.parse('boost:1:free:3'), label: message(AttributesMessage.FreeBoost, { level: 1 }) },
];

/** The fighter's six attribute checks as the engine derives them: each modifier alone. */
export const FIGHTER_CHECKS: ReadonlyMap<Attribute, StatisticValue> = new Map(
  Object.values(Attribute).map((attribute) => [
    attribute,
    statistic(`attribute:${attribute}`, { base: [term(`@attr.${attribute}`, FIGHTER_MODIFIERS.get(attribute))] }),
  ]),
);
