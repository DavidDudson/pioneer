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
    import('@pioneer/content/packs/core-rulebook/spell.json'),
  ]);
}

export async function advancedPlayersGuidePack() {
  return pack(import('@pioneer/content/packs/advanced-players-guide/pack.json'), [
    import('@pioneer/content/packs/advanced-players-guide/feat.json'),
  ]);
}

export async function theShowMustGoOnPack() {
  return pack(import('@pioneer/content/packs/the-show-must-go-on/pack.json'), [
    import('@pioneer/content/packs/the-show-must-go-on/spell.json'),
  ]);
}
