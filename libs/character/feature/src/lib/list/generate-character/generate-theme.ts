import { Attribute, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';
import { ATTRIBUTE_MESSAGES } from '@pioneer/rules/ui';

/** The attributes the theme can favour, in sheet order, each with the message that names it. */
export const THEME_ATTRIBUTES: readonly { readonly attribute: Attribute; readonly label: string }[] = Object.values(
  Attribute,
).map((attribute) => ({ attribute, label: ATTRIBUTE_MESSAGES[attribute] }));

/** Message keys for the weapon controls, spelled out so the key check sees them. */
export const WEAPON_CATEGORY_MESSAGES: Readonly<Record<WeaponCategory, string>> = {
  [WeaponCategory.Unarmed]: 'character.list.theme.category.unarmed',
  [WeaponCategory.Simple]: 'character.list.theme.category.simple',
  [WeaponCategory.Martial]: 'character.list.theme.category.martial',
  [WeaponCategory.Advanced]: 'character.list.theme.category.advanced',
};

export const WEAPON_GROUP_MESSAGES: Readonly<Record<WeaponGroup, string>> = {
  [WeaponGroup.Axe]: 'character.list.theme.group.axe',
  [WeaponGroup.Bomb]: 'character.list.theme.group.bomb',
  [WeaponGroup.Bow]: 'character.list.theme.group.bow',
  [WeaponGroup.Brawling]: 'character.list.theme.group.brawling',
  [WeaponGroup.Club]: 'character.list.theme.group.club',
  [WeaponGroup.Crossbow]: 'character.list.theme.group.crossbow',
  [WeaponGroup.Dart]: 'character.list.theme.group.dart',
  [WeaponGroup.Firearm]: 'character.list.theme.group.firearm',
  [WeaponGroup.Flail]: 'character.list.theme.group.flail',
  [WeaponGroup.Hammer]: 'character.list.theme.group.hammer',
  [WeaponGroup.Knife]: 'character.list.theme.group.knife',
  [WeaponGroup.Pick]: 'character.list.theme.group.pick',
  [WeaponGroup.Polearm]: 'character.list.theme.group.polearm',
  [WeaponGroup.Shield]: 'character.list.theme.group.shield',
  [WeaponGroup.Sling]: 'character.list.theme.group.sling',
  [WeaponGroup.Spear]: 'character.list.theme.group.spear',
  [WeaponGroup.Sword]: 'character.list.theme.group.sword',
};
