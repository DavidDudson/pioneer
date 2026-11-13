import { pack } from './pack-loader';

/* Pre-remaster Open Game License packs under `content/packs/<pack>/`, read like `json-packs.ts`. */

export async function characterGuidePack() {
  return pack(import('@pioneer/content/packs/character-guide/pack.json'), [
    import('@pioneer/content/packs/character-guide/action.json'),
    import('@pioneer/content/packs/character-guide/archetype.json'),
    import('@pioneer/content/packs/character-guide/armor.json'),
    import('@pioneer/content/packs/character-guide/class-feature.json'),
    import('@pioneer/content/packs/character-guide/consumable.json'),
    import('@pioneer/content/packs/character-guide/creature.json'),
    import('@pioneer/content/packs/character-guide/effect.json'),
    import('@pioneer/content/packs/character-guide/equipment.json'),
    import('@pioneer/content/packs/character-guide/feat.json'),
    import('@pioneer/content/packs/character-guide/heritage.json'),
    import('@pioneer/content/packs/character-guide/spell.json'),
    import('@pioneer/content/packs/character-guide/weapon.json'),
  ]);
}

export async function ancestryGuidePack() {
  return pack(import('@pioneer/content/packs/ancestry-guide/pack.json'), [
    import('@pioneer/content/packs/ancestry-guide/action.json'),
    import('@pioneer/content/packs/ancestry-guide/ancestry-feature.json'),
    import('@pioneer/content/packs/ancestry-guide/ancestry.json'),
    import('@pioneer/content/packs/ancestry-guide/consumable.json'),
    import('@pioneer/content/packs/ancestry-guide/effect.json'),
    import('@pioneer/content/packs/ancestry-guide/equipment.json'),
    import('@pioneer/content/packs/ancestry-guide/feat.json'),
    import('@pioneer/content/packs/ancestry-guide/heritage.json'),
    import('@pioneer/content/packs/ancestry-guide/rune.json'),
    import('@pioneer/content/packs/ancestry-guide/weapon.json'),
  ]);
}

export async function impossibleLandsPack() {
  return pack(import('@pioneer/content/packs/impossible-lands/pack.json'), [
    import('@pioneer/content/packs/impossible-lands/action.json'),
    import('@pioneer/content/packs/impossible-lands/ancestry-feature.json'),
    import('@pioneer/content/packs/impossible-lands/ancestry.json'),
    import('@pioneer/content/packs/impossible-lands/archetype.json'),
    import('@pioneer/content/packs/impossible-lands/armor.json'),
    import('@pioneer/content/packs/impossible-lands/class-feature.json'),
    import('@pioneer/content/packs/impossible-lands/consumable.json'),
    import('@pioneer/content/packs/impossible-lands/effect.json'),
    import('@pioneer/content/packs/impossible-lands/equipment.json'),
    import('@pioneer/content/packs/impossible-lands/feat.json'),
    import('@pioneer/content/packs/impossible-lands/heritage.json'),
    import('@pioneer/content/packs/impossible-lands/spell.json'),
    import('@pioneer/content/packs/impossible-lands/weapon.json'),
  ]);
}

export async function coreRulebookPack() {
  return pack(import('@pioneer/content/packs/core-rulebook/pack.json'), [
    import('@pioneer/content/packs/core-rulebook/action.json'),
    import('@pioneer/content/packs/core-rulebook/ancestry-feature.json'),
    import('@pioneer/content/packs/core-rulebook/ancestry.json'),
    import('@pioneer/content/packs/core-rulebook/archetype.json'),
    import('@pioneer/content/packs/core-rulebook/armor.json'),
    import('@pioneer/content/packs/core-rulebook/class-feature.json'),
    import('@pioneer/content/packs/core-rulebook/class.json'),
    import('@pioneer/content/packs/core-rulebook/consumable.json'),
    import('@pioneer/content/packs/core-rulebook/deity.json'),
    import('@pioneer/content/packs/core-rulebook/effect.json'),
    import('@pioneer/content/packs/core-rulebook/equipment.json'),
    import('@pioneer/content/packs/core-rulebook/feat.json'),
    import('@pioneer/content/packs/core-rulebook/ritual.json'),
    import('@pioneer/content/packs/core-rulebook/rune.json'),
    import('@pioneer/content/packs/core-rulebook/shield.json'),
    import('@pioneer/content/packs/core-rulebook/spell.json'),
    import('@pioneer/content/packs/core-rulebook/treasure.json'),
    import('@pioneer/content/packs/core-rulebook/weapon.json'),
  ]);
}

export async function advancedPlayersGuidePack() {
  return pack(import('@pioneer/content/packs/advanced-players-guide/pack.json'), [
    import('@pioneer/content/packs/advanced-players-guide/action.json'),
    import('@pioneer/content/packs/advanced-players-guide/ancestry.json'),
    import('@pioneer/content/packs/advanced-players-guide/ancestry-feature.json'),
    import('@pioneer/content/packs/advanced-players-guide/archetype.json'),
    import('@pioneer/content/packs/advanced-players-guide/armor.json'),
    import('@pioneer/content/packs/advanced-players-guide/background.json'),
    import('@pioneer/content/packs/advanced-players-guide/class.json'),
    import('@pioneer/content/packs/advanced-players-guide/class-feature.json'),
    import('@pioneer/content/packs/advanced-players-guide/consumable.json'),
    import('@pioneer/content/packs/advanced-players-guide/effect.json'),
    import('@pioneer/content/packs/advanced-players-guide/equipment.json'),
    import('@pioneer/content/packs/advanced-players-guide/feat.json'),
    import('@pioneer/content/packs/advanced-players-guide/heritage.json'),
    import('@pioneer/content/packs/advanced-players-guide/ritual.json'),
    import('@pioneer/content/packs/advanced-players-guide/shield.json'),
    import('@pioneer/content/packs/advanced-players-guide/spell.json'),
    import('@pioneer/content/packs/advanced-players-guide/weapon.json'),
  ]);
}

export async function theShowMustGoOnPack() {
  return pack(import('@pioneer/content/packs/the-show-must-go-on/pack.json'), [
    import('@pioneer/content/packs/the-show-must-go-on/spell.json'),
  ]);
}

export async function bookOfTheDeadPack() {
  return pack(import('@pioneer/content/packs/book-of-the-dead/pack.json'), [
    import('@pioneer/content/packs/book-of-the-dead/action.json'),
    import('@pioneer/content/packs/book-of-the-dead/ancestry.json'),
    import('@pioneer/content/packs/book-of-the-dead/ancestry-feature.json'),
    import('@pioneer/content/packs/book-of-the-dead/archetype.json'),
    import('@pioneer/content/packs/book-of-the-dead/background.json'),
    import('@pioneer/content/packs/book-of-the-dead/consumable.json'),
    import('@pioneer/content/packs/book-of-the-dead/deity.json'),
    import('@pioneer/content/packs/book-of-the-dead/effect.json'),
    import('@pioneer/content/packs/book-of-the-dead/equipment.json'),
    import('@pioneer/content/packs/book-of-the-dead/feat.json'),
    import('@pioneer/content/packs/book-of-the-dead/heritage.json'),
    import('@pioneer/content/packs/book-of-the-dead/spell.json'),
    import('@pioneer/content/packs/book-of-the-dead/weapon.json'),
  ]);
}

export async function gamemasteryGuidePack() {
  return pack(import('@pioneer/content/packs/gamemastery-guide/pack.json'), [
    import('@pioneer/content/packs/gamemastery-guide/action.json'),
    import('@pioneer/content/packs/gamemastery-guide/consumable.json'),
    import('@pioneer/content/packs/gamemastery-guide/effect.json'),
    import('@pioneer/content/packs/gamemastery-guide/equipment.json'),
    import('@pioneer/content/packs/gamemastery-guide/feat.json'),
    import('@pioneer/content/packs/gamemastery-guide/treasure.json'),
    import('@pioneer/content/packs/gamemastery-guide/weapon.json'),
  ]);
}

export async function darkArchivePack() {
  return pack(import('@pioneer/content/packs/dark-archive/pack.json'), [
    import('@pioneer/content/packs/dark-archive/action.json'),
    import('@pioneer/content/packs/dark-archive/archetype.json'),
    import('@pioneer/content/packs/dark-archive/background.json'),
    import('@pioneer/content/packs/dark-archive/class.json'),
    import('@pioneer/content/packs/dark-archive/class-feature.json'),
    import('@pioneer/content/packs/dark-archive/consumable.json'),
    import('@pioneer/content/packs/dark-archive/effect.json'),
    import('@pioneer/content/packs/dark-archive/equipment.json'),
    import('@pioneer/content/packs/dark-archive/feat.json'),
    import('@pioneer/content/packs/dark-archive/heritage.json'),
    import('@pioneer/content/packs/dark-archive/ritual.json'),
    import('@pioneer/content/packs/dark-archive/spell.json'),
    import('@pioneer/content/packs/dark-archive/weapon.json'),
  ]);
}

export async function bestiary1Pack() {
  return pack(import('@pioneer/content/packs/bestiary-1/pack.json'), [
    import('@pioneer/content/packs/bestiary-1/action.json'),
    import('@pioneer/content/packs/bestiary-1/consumable.json'),
    import('@pioneer/content/packs/bestiary-1/deity.json'),
    import('@pioneer/content/packs/bestiary-1/effect.json'),
    import('@pioneer/content/packs/bestiary-1/equipment.json'),
    import('@pioneer/content/packs/bestiary-1/treasure.json'),
    import('@pioneer/content/packs/bestiary-1/weapon.json'),
  ]);
}

export async function bestiary2Pack() {
  return pack(import('@pioneer/content/packs/bestiary-2/pack.json'), [
    import('@pioneer/content/packs/bestiary-2/action.json'),
    import('@pioneer/content/packs/bestiary-2/consumable.json'),
    import('@pioneer/content/packs/bestiary-2/deity.json'),
    import('@pioneer/content/packs/bestiary-2/effect.json'),
    import('@pioneer/content/packs/bestiary-2/ritual.json'),
  ]);
}

export async function bestiary3Pack() {
  return pack(import('@pioneer/content/packs/bestiary-3/pack.json'), [
    import('@pioneer/content/packs/bestiary-3/action.json'),
    import('@pioneer/content/packs/bestiary-3/deity.json'),
    import('@pioneer/content/packs/bestiary-3/effect.json'),
    import('@pioneer/content/packs/bestiary-3/ritual.json'),
  ]);
}
