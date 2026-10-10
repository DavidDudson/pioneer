import { Attribute } from '@pioneer/rules/sdk';

/** Message key naming each attribute, shared by the sheet and the import preview. */
export const ATTRIBUTE_LABEL_KEYS: Readonly<Record<Attribute, string>> = {
  [Attribute.Strength]: 'character.attribute.str',
  [Attribute.Dexterity]: 'character.attribute.dex',
  [Attribute.Constitution]: 'character.attribute.con',
  [Attribute.Intelligence]: 'character.attribute.int',
  [Attribute.Wisdom]: 'character.attribute.wis',
  [Attribute.Charisma]: 'character.attribute.cha',
};
