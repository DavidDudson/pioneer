import { Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

/** The six attributes (Player Core remaster terminology). */
export const Attribute = {
  Strength: 'str',
  Dexterity: 'dex',
  Constitution: 'con',
  Intelligence: 'int',
  Wisdom: 'wis',
  Charisma: 'cha',
} as const;
export type Attribute = ValueOf<typeof Attribute>;
export const AttributeSchema = z.enum(Attribute);

/** Remaster attribute modifiers. A level 20 character tops out at +7. */
export const ATTRIBUTE_MODIFIER_MIN = -5;
export const ATTRIBUTE_MODIFIER_MAX = 7;
export const AttributeModifier = Pg.smallint()
  .min(ATTRIBUTE_MODIFIER_MIN)
  .max(ATTRIBUTE_MODIFIER_MAX)
  .brand<'AttributeModifier'>();
export type AttributeModifier = z.infer<typeof AttributeModifier>;

export const AttributeModifiersWire = z.object({
  str: AttributeModifier,
  dex: AttributeModifier,
  con: AttributeModifier,
  int: AttributeModifier,
  wis: AttributeModifier,
  cha: AttributeModifier,
});
export type AttributeModifiersWire = z.infer<typeof AttributeModifiersWire>;

/** Value object: the six attribute modifiers. Immutable. */
export class AttributeModifiers {
  public static readonly codec = z.codec(AttributeModifiersWire, z.instanceof(AttributeModifiers), {
    decode: (wire) => new AttributeModifiers(wire),
    encode: (modifiers) => modifiers.toWire(),
  });

  public static readonly none = new AttributeModifiers(
    AttributeModifiersWire.parse({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }),
  );

  readonly #values: AttributeModifiersWire;

  public constructor(values: AttributeModifiersWire) {
    this.#values = Object.freeze({ ...values });
  }

  public get(attribute: Attribute): AttributeModifier {
    return this.#values[attribute];
  }

  public with(attribute: Attribute, modifier: AttributeModifier): AttributeModifiers {
    return new AttributeModifiers({ ...this.#values, [attribute]: modifier });
  }

  public toWire(): AttributeModifiersWire {
    return { ...this.#values };
  }
}
