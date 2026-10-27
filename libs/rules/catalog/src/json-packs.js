/* The official packs under `content/packs/<pack>/`: `pack.json` plus one `<kind>.json` per kind, read lazily. */

import { pack } from './pack-loader';

export async function playerCorePack() {
  return pack(import('@pioneer/content/packs/player-core/pack.json'), [
    import('@pioneer/content/packs/player-core/action.json'),
    import('@pioneer/content/packs/player-core/ancestry.json'),
    import('@pioneer/content/packs/player-core/ancestry-feature.json'),
    import('@pioneer/content/packs/player-core/archetype.json'),
    import('@pioneer/content/packs/player-core/armor.json'),
    import('@pioneer/content/packs/player-core/background.json'),
    import('@pioneer/content/packs/player-core/class-feature.json'),
    import('@pioneer/content/packs/player-core/class.json'),
    import('@pioneer/content/packs/player-core/condition.json'),
    import('@pioneer/content/packs/player-core/consumable.json'),
    import('@pioneer/content/packs/player-core/creature.json'),
    import('@pioneer/content/packs/player-core/effect.json'),
    import('@pioneer/content/packs/player-core/environment.json'),
    import('@pioneer/content/packs/player-core/equipment.json'),
    import('@pioneer/content/packs/player-core/feat.json'),
    import('@pioneer/content/packs/player-core/heritage.json'),
    import('@pioneer/content/packs/player-core/kit.json'),
    import('@pioneer/content/packs/player-core/ritual.json'),
    import('@pioneer/content/packs/player-core/shield.json'),
    import('@pioneer/content/packs/player-core/spell.json'),
    import('@pioneer/content/packs/player-core/treasure.json'),
    import('@pioneer/content/packs/player-core/weapon.json'),
  ]);
}

export async function playerCore2Pack() {
  return pack(import('@pioneer/content/packs/player-core-2/pack.json'), [
    import('@pioneer/content/packs/player-core-2/action.json'),
    import('@pioneer/content/packs/player-core-2/ancestry.json'),
    import('@pioneer/content/packs/player-core-2/ancestry-feature.json'),
    import('@pioneer/content/packs/player-core-2/archetype.json'),
    import('@pioneer/content/packs/player-core-2/armor.json'),
    import('@pioneer/content/packs/player-core-2/background.json'),
    import('@pioneer/content/packs/player-core-2/class.json'),
    import('@pioneer/content/packs/player-core-2/class-feature.json'),
    import('@pioneer/content/packs/player-core-2/condition.json'),
    import('@pioneer/content/packs/player-core-2/consumable.json'),
    import('@pioneer/content/packs/player-core-2/effect.json'),
    import('@pioneer/content/packs/player-core-2/equipment.json'),
    import('@pioneer/content/packs/player-core-2/feat.json'),
    import('@pioneer/content/packs/player-core-2/heritage.json'),
    import('@pioneer/content/packs/player-core-2/ritual.json'),
    import('@pioneer/content/packs/player-core-2/shield.json'),
    import('@pioneer/content/packs/player-core-2/spell.json'),
    import('@pioneer/content/packs/player-core-2/weapon.json'),
  ]);
}

export async function divineMysteriesPack() {
  return pack(import('@pioneer/content/packs/divine-mysteries/pack.json'), [
    import('@pioneer/content/packs/divine-mysteries/action.json'),
    import('@pioneer/content/packs/divine-mysteries/archetype.json'),
    import('@pioneer/content/packs/divine-mysteries/class-feature.json'),
    import('@pioneer/content/packs/divine-mysteries/deity.json'),
    import('@pioneer/content/packs/divine-mysteries/effect.json'),
    import('@pioneer/content/packs/divine-mysteries/equipment.json'),
    import('@pioneer/content/packs/divine-mysteries/feat.json'),
    import('@pioneer/content/packs/divine-mysteries/spell.json'),
  ]);
}

export async function gmCorePack() {
  return pack(import('@pioneer/content/packs/gm-core/pack.json'), [
    import('@pioneer/content/packs/gm-core/action.json'),
    import('@pioneer/content/packs/gm-core/armor.json'),
    import('@pioneer/content/packs/gm-core/consumable.json'),
    import('@pioneer/content/packs/gm-core/effect.json'),
    import('@pioneer/content/packs/gm-core/equipment.json'),
    import('@pioneer/content/packs/gm-core/rune.json'),
    import('@pioneer/content/packs/gm-core/shield.json'),
    import('@pioneer/content/packs/gm-core/spell.json'),
    import('@pioneer/content/packs/gm-core/treasure.json'),
    import('@pioneer/content/packs/gm-core/weapon.json'),
  ]);
}

export async function howlOfTheWildPack() {
  return pack(import('@pioneer/content/packs/howl-of-the-wild/pack.json'), [
    import('@pioneer/content/packs/howl-of-the-wild/action.json'),
    import('@pioneer/content/packs/howl-of-the-wild/ancestry-feature.json'),
    import('@pioneer/content/packs/howl-of-the-wild/ancestry.json'),
    import('@pioneer/content/packs/howl-of-the-wild/archetype.json'),
    import('@pioneer/content/packs/howl-of-the-wild/armor.json'),
    import('@pioneer/content/packs/howl-of-the-wild/class-feature.json'),
    import('@pioneer/content/packs/howl-of-the-wild/consumable.json'),
    import('@pioneer/content/packs/howl-of-the-wild/creature.json'),
    import('@pioneer/content/packs/howl-of-the-wild/effect.json'),
    import('@pioneer/content/packs/howl-of-the-wild/equipment.json'),
    import('@pioneer/content/packs/howl-of-the-wild/feat.json'),
    import('@pioneer/content/packs/howl-of-the-wild/heritage.json'),
    import('@pioneer/content/packs/howl-of-the-wild/shield.json'),
    import('@pioneer/content/packs/howl-of-the-wild/spell.json'),
    import('@pioneer/content/packs/howl-of-the-wild/weapon.json'),
  ]);
}

export async function warOfImmortalsPack() {
  return pack(import('@pioneer/content/packs/war-of-immortals/pack.json'), [
    import('@pioneer/content/packs/war-of-immortals/action.json'),
    import('@pioneer/content/packs/war-of-immortals/archetype.json'),
    import('@pioneer/content/packs/war-of-immortals/armor.json'),
    import('@pioneer/content/packs/war-of-immortals/class-feature.json'),
    import('@pioneer/content/packs/war-of-immortals/class.json'),
    import('@pioneer/content/packs/war-of-immortals/consumable.json'),
    import('@pioneer/content/packs/war-of-immortals/creature.json'),
    import('@pioneer/content/packs/war-of-immortals/effect.json'),
    import('@pioneer/content/packs/war-of-immortals/equipment.json'),
    import('@pioneer/content/packs/war-of-immortals/feat.json'),
    import('@pioneer/content/packs/war-of-immortals/ritual.json'),
    import('@pioneer/content/packs/war-of-immortals/rune.json'),
    import('@pioneer/content/packs/war-of-immortals/spell.json'),
    import('@pioneer/content/packs/war-of-immortals/weapon.json'),
  ]);
}

export async function mwangiExpansePack() {
  return pack(import('@pioneer/content/packs/mwangi-expanse/pack.json'), [
    import('@pioneer/content/packs/mwangi-expanse/action.json'),
    import('@pioneer/content/packs/mwangi-expanse/ancestry-feature.json'),
    import('@pioneer/content/packs/mwangi-expanse/ancestry.json'),
    import('@pioneer/content/packs/mwangi-expanse/armor.json'),
    import('@pioneer/content/packs/mwangi-expanse/class-feature.json'),
    import('@pioneer/content/packs/mwangi-expanse/creature.json'),
    import('@pioneer/content/packs/mwangi-expanse/effect.json'),
    import('@pioneer/content/packs/mwangi-expanse/equipment.json'),
    import('@pioneer/content/packs/mwangi-expanse/feat.json'),
    import('@pioneer/content/packs/mwangi-expanse/heritage.json'),
    import('@pioneer/content/packs/mwangi-expanse/weapon.json'),
  ]);
}

export async function tianXiaCharacterGuidePack() {
  return pack(import('@pioneer/content/packs/tian-xia-character-guide/pack.json'), [
    import('@pioneer/content/packs/tian-xia-character-guide/action.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/ancestry-feature.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/ancestry.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/archetype.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/armor.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/background.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/class-feature.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/consumable.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/effect.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/equipment.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/feat.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/heritage.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/ritual.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/spell.json'),
    import('@pioneer/content/packs/tian-xia-character-guide/weapon.json'),
  ]);
}

export async function darkArchiveRemasteredPack() {
  return pack(import('@pioneer/content/packs/dark-archive-remastered/pack.json'), [
    import('@pioneer/content/packs/dark-archive-remastered/action.json'),
    import('@pioneer/content/packs/dark-archive-remastered/archetype.json'),
    import('@pioneer/content/packs/dark-archive-remastered/background.json'),
    import('@pioneer/content/packs/dark-archive-remastered/class-feature.json'),
    import('@pioneer/content/packs/dark-archive-remastered/class.json'),
    import('@pioneer/content/packs/dark-archive-remastered/consumable.json'),
    import('@pioneer/content/packs/dark-archive-remastered/creature.json'),
    import('@pioneer/content/packs/dark-archive-remastered/effect.json'),
    import('@pioneer/content/packs/dark-archive-remastered/equipment.json'),
    import('@pioneer/content/packs/dark-archive-remastered/feat.json'),
    import('@pioneer/content/packs/dark-archive-remastered/heritage.json'),
    import('@pioneer/content/packs/dark-archive-remastered/ritual.json'),
    import('@pioneer/content/packs/dark-archive-remastered/spell.json'),
    import('@pioneer/content/packs/dark-archive-remastered/weapon.json'),
  ]);
}

export async function monsterCore2Pack() {
  return pack(import('@pioneer/content/packs/monster-core-2/pack.json'), [
    import('@pioneer/content/packs/monster-core-2/action.json'),
    import('@pioneer/content/packs/monster-core-2/creature.json'),
    import('@pioneer/content/packs/monster-core-2/effect.json'),
    import('@pioneer/content/packs/monster-core-2/equipment.json'),
    import('@pioneer/content/packs/monster-core-2/ritual.json'),
  ]);
}

export async function npcCorePack() {
  return pack(import('@pioneer/content/packs/npc-core/pack.json'), [
    import('@pioneer/content/packs/npc-core/action.json'),
    import('@pioneer/content/packs/npc-core/consumable.json'),
    import('@pioneer/content/packs/npc-core/creature.json'),
    import('@pioneer/content/packs/npc-core/effect.json'),
    import('@pioneer/content/packs/npc-core/equipment.json'),
    import('@pioneer/content/packs/npc-core/spell.json'),
    import('@pioneer/content/packs/npc-core/weapon.json'),
  ]);
}

export async function monsterCorePack() {
  return pack(import('@pioneer/content/packs/monster-core/pack.json'), [
    import('@pioneer/content/packs/monster-core/action.json'),
    import('@pioneer/content/packs/monster-core/consumable.json'),
    import('@pioneer/content/packs/monster-core/creature.json'),
    import('@pioneer/content/packs/monster-core/effect.json'),
    import('@pioneer/content/packs/monster-core/equipment.json'),
    import('@pioneer/content/packs/monster-core/ritual.json'),
    import('@pioneer/content/packs/monster-core/weapon.json'),
  ]);
}

export async function treasureVaultPack() {
  return pack(import('@pioneer/content/packs/treasure-vault/pack.json'), [
    import('@pioneer/content/packs/treasure-vault/action.json'),
    import('@pioneer/content/packs/treasure-vault/armor.json'),
    import('@pioneer/content/packs/treasure-vault/consumable.json'),
    import('@pioneer/content/packs/treasure-vault/effect.json'),
    import('@pioneer/content/packs/treasure-vault/equipment.json'),
    import('@pioneer/content/packs/treasure-vault/feat.json'),
    import('@pioneer/content/packs/treasure-vault/rune.json'),
    import('@pioneer/content/packs/treasure-vault/shield.json'),
    import('@pioneer/content/packs/treasure-vault/spell.json'),
    import('@pioneer/content/packs/treasure-vault/weapon.json'),
  ]);
}

export async function secretsOfMagicPack() {
  return pack(import('@pioneer/content/packs/secrets-of-magic/pack.json'), [
    import('@pioneer/content/packs/secrets-of-magic/action.json'),
    import('@pioneer/content/packs/secrets-of-magic/archetype.json'),
    import('@pioneer/content/packs/secrets-of-magic/background.json'),
    import('@pioneer/content/packs/secrets-of-magic/class-feature.json'),
    import('@pioneer/content/packs/secrets-of-magic/consumable.json'),
    import('@pioneer/content/packs/secrets-of-magic/effect.json'),
    import('@pioneer/content/packs/secrets-of-magic/equipment.json'),
    import('@pioneer/content/packs/secrets-of-magic/feat.json'),
    import('@pioneer/content/packs/secrets-of-magic/ritual.json'),
    import('@pioneer/content/packs/secrets-of-magic/spell.json'),
    import('@pioneer/content/packs/secrets-of-magic/weapon.json'),
  ]);
}

export async function rageOfElementsPack() {
  return pack(import('@pioneer/content/packs/rage-of-elements/pack.json'), [
    import('@pioneer/content/packs/rage-of-elements/action.json'),
    import('@pioneer/content/packs/rage-of-elements/archetype.json'),
    import('@pioneer/content/packs/rage-of-elements/armor.json'),
    import('@pioneer/content/packs/rage-of-elements/background.json'),
    import('@pioneer/content/packs/rage-of-elements/class-feature.json'),
    import('@pioneer/content/packs/rage-of-elements/class.json'),
    import('@pioneer/content/packs/rage-of-elements/consumable.json'),
    import('@pioneer/content/packs/rage-of-elements/creature.json'),
    import('@pioneer/content/packs/rage-of-elements/effect.json'),
    import('@pioneer/content/packs/rage-of-elements/equipment.json'),
    import('@pioneer/content/packs/rage-of-elements/feat.json'),
    import('@pioneer/content/packs/rage-of-elements/heritage.json'),
    import('@pioneer/content/packs/rage-of-elements/ritual.json'),
    import('@pioneer/content/packs/rage-of-elements/rune.json'),
    import('@pioneer/content/packs/rage-of-elements/shield.json'),
    import('@pioneer/content/packs/rage-of-elements/spell.json'),
    import('@pioneer/content/packs/rage-of-elements/weapon.json'),
  ]);
}
