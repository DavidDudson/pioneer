import { Attribute } from '@pioneer/rules/sdk';

/** Message keys the attributes panel renders with, spelled out so the key check sees them. */
export const AttributesMessage = {
  /** The heading of the boosts still to place. */
  OpenBoosts: 'rules.attributes.openBoosts',
  /** "Ancestry boost", "Level 5 boost": what each open boost slot is, by where the boost comes from. */
  AncestryBoost: 'rules.attributes.boost.ancestry',
  BackgroundBoost: 'rules.attributes.boost.background',
  ClassBoost: 'rules.attributes.boost.class',
  SecondClassBoost: 'rules.attributes.boost.secondClass',
  FreeBoost: 'rules.attributes.boost.free',
} as const;

export const ATTRIBUTE_MESSAGES: Readonly<Record<Attribute, string>> = {
  [Attribute.Strength]: 'rules.attributes.str',
  [Attribute.Dexterity]: 'rules.attributes.dex',
  [Attribute.Constitution]: 'rules.attributes.con',
  [Attribute.Intelligence]: 'rules.attributes.int',
  [Attribute.Wisdom]: 'rules.attributes.wis',
  [Attribute.Charisma]: 'rules.attributes.cha',
};
