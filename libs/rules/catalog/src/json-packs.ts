import { packContentsFromFiles } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';

/* The official packs under `content/packs/<pack>/`: `pack.json` plus one `<kind>.json` per kind, read lazily. */

export interface JsonModule {
  readonly default: unknown;
}

/**
 * Passes a JSON import on as the bare module type. The packs list dozens of imports in one array, and as the union of
 * every file's inferred type the compiler gives up on it (TS2859).
 */
export async function json(file: Promise<JsonModule>): Promise<JsonModule> {
  return file;
}

export async function pack(
  manifest: Promise<JsonModule>,
  kinds: readonly Promise<JsonModule>[],
): Promise<PackContents> {
  const [packFile, ...entryFiles] = await Promise.all([manifest, ...kinds]);
  return packContentsFromFiles(
    packFile.default,
    entryFiles.map((file) => file.default),
  );
}

export async function playerCorePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/player-core/pack.json'), [
    json(import('@pioneer/content/packs/player-core/action.json')),
    json(import('@pioneer/content/packs/player-core/ancestry.json')),
    json(import('@pioneer/content/packs/player-core/ancestry-feature.json')),
    json(import('@pioneer/content/packs/player-core/archetype.json')),
    json(import('@pioneer/content/packs/player-core/armor.json')),
    json(import('@pioneer/content/packs/player-core/background.json')),
    json(import('@pioneer/content/packs/player-core/class-feature.json')),
    json(import('@pioneer/content/packs/player-core/class.json')),
    json(import('@pioneer/content/packs/player-core/condition.json')),
    json(import('@pioneer/content/packs/player-core/consumable.json')),
    json(import('@pioneer/content/packs/player-core/effect.json')),
    json(import('@pioneer/content/packs/player-core/equipment.json')),
    json(import('@pioneer/content/packs/player-core/feat.json')),
    json(import('@pioneer/content/packs/player-core/heritage.json')),
    json(import('@pioneer/content/packs/player-core/kit.json')),
    json(import('@pioneer/content/packs/player-core/ritual.json')),
    json(import('@pioneer/content/packs/player-core/shield.json')),
    json(import('@pioneer/content/packs/player-core/spell.json')),
    json(import('@pioneer/content/packs/player-core/treasure.json')),
    json(import('@pioneer/content/packs/player-core/weapon.json')),
  ]);
}

export async function playerCore2Pack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/player-core-2/pack.json'), [
    json(import('@pioneer/content/packs/player-core-2/action.json')),
    json(import('@pioneer/content/packs/player-core-2/ancestry.json')),
    json(import('@pioneer/content/packs/player-core-2/ancestry-feature.json')),
    json(import('@pioneer/content/packs/player-core-2/archetype.json')),
    json(import('@pioneer/content/packs/player-core-2/armor.json')),
    json(import('@pioneer/content/packs/player-core-2/background.json')),
    json(import('@pioneer/content/packs/player-core-2/class.json')),
    json(import('@pioneer/content/packs/player-core-2/class-feature.json')),
    json(import('@pioneer/content/packs/player-core-2/condition.json')),
    json(import('@pioneer/content/packs/player-core-2/consumable.json')),
    json(import('@pioneer/content/packs/player-core-2/effect.json')),
    json(import('@pioneer/content/packs/player-core-2/equipment.json')),
    json(import('@pioneer/content/packs/player-core-2/feat.json')),
    json(import('@pioneer/content/packs/player-core-2/heritage.json')),
    json(import('@pioneer/content/packs/player-core-2/ritual.json')),
    json(import('@pioneer/content/packs/player-core-2/shield.json')),
    json(import('@pioneer/content/packs/player-core-2/spell.json')),
    json(import('@pioneer/content/packs/player-core-2/weapon.json')),
  ]);
}

export async function divineMysteriesPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/divine-mysteries/pack.json'), [
    json(import('@pioneer/content/packs/divine-mysteries/action.json')),
    json(import('@pioneer/content/packs/divine-mysteries/archetype.json')),
    json(import('@pioneer/content/packs/divine-mysteries/class-feature.json')),
    json(import('@pioneer/content/packs/divine-mysteries/deity.json')),
    json(import('@pioneer/content/packs/divine-mysteries/effect.json')),
    json(import('@pioneer/content/packs/divine-mysteries/equipment.json')),
    json(import('@pioneer/content/packs/divine-mysteries/feat.json')),
    json(import('@pioneer/content/packs/divine-mysteries/spell.json')),
  ]);
}

export async function gmCorePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/gm-core/pack.json'), [
    json(import('@pioneer/content/packs/gm-core/action.json')),
    json(import('@pioneer/content/packs/gm-core/armor.json')),
    json(import('@pioneer/content/packs/gm-core/consumable.json')),
    json(import('@pioneer/content/packs/gm-core/effect.json')),
    json(import('@pioneer/content/packs/gm-core/equipment.json')),
    json(import('@pioneer/content/packs/gm-core/rune.json')),
    json(import('@pioneer/content/packs/gm-core/shield.json')),
    json(import('@pioneer/content/packs/gm-core/spell.json')),
    json(import('@pioneer/content/packs/gm-core/treasure.json')),
    json(import('@pioneer/content/packs/gm-core/weapon.json')),
  ]);
}

export async function howlOfTheWildPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/howl-of-the-wild/pack.json'), [
    json(import('@pioneer/content/packs/howl-of-the-wild/action.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/ancestry-feature.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/ancestry.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/archetype.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/armor.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/class-feature.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/consumable.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/effect.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/equipment.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/feat.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/heritage.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/shield.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/spell.json')),
    json(import('@pioneer/content/packs/howl-of-the-wild/weapon.json')),
  ]);
}

export async function warOfImmortalsPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/war-of-immortals/pack.json'), [
    json(import('@pioneer/content/packs/war-of-immortals/action.json')),
    json(import('@pioneer/content/packs/war-of-immortals/archetype.json')),
    json(import('@pioneer/content/packs/war-of-immortals/armor.json')),
    json(import('@pioneer/content/packs/war-of-immortals/class-feature.json')),
    json(import('@pioneer/content/packs/war-of-immortals/class.json')),
    json(import('@pioneer/content/packs/war-of-immortals/consumable.json')),
    json(import('@pioneer/content/packs/war-of-immortals/effect.json')),
    json(import('@pioneer/content/packs/war-of-immortals/equipment.json')),
    json(import('@pioneer/content/packs/war-of-immortals/feat.json')),
    json(import('@pioneer/content/packs/war-of-immortals/rune.json')),
    json(import('@pioneer/content/packs/war-of-immortals/spell.json')),
    json(import('@pioneer/content/packs/war-of-immortals/weapon.json')),
  ]);
}

export async function mwangiExpansePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/mwangi-expanse/pack.json'), [
    json(import('@pioneer/content/packs/mwangi-expanse/action.json')),
    json(import('@pioneer/content/packs/mwangi-expanse/ancestry-feature.json')),
    json(import('@pioneer/content/packs/mwangi-expanse/ancestry.json')),
    json(import('@pioneer/content/packs/mwangi-expanse/armor.json')),
    json(import('@pioneer/content/packs/mwangi-expanse/class-feature.json')),
    json(import('@pioneer/content/packs/mwangi-expanse/effect.json')),
    json(import('@pioneer/content/packs/mwangi-expanse/equipment.json')),
    json(import('@pioneer/content/packs/mwangi-expanse/feat.json')),
    json(import('@pioneer/content/packs/mwangi-expanse/heritage.json')),
    json(import('@pioneer/content/packs/mwangi-expanse/weapon.json')),
  ]);
}

export async function tianXiaCharacterGuidePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/tian-xia-character-guide/pack.json'), [
    json(import('@pioneer/content/packs/tian-xia-character-guide/action.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/ancestry-feature.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/ancestry.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/archetype.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/armor.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/background.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/class-feature.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/consumable.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/effect.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/equipment.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/feat.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/heritage.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/ritual.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/spell.json')),
    json(import('@pioneer/content/packs/tian-xia-character-guide/weapon.json')),
  ]);
}

export async function darkArchiveRemasteredPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/dark-archive-remastered/pack.json'), [
    json(import('@pioneer/content/packs/dark-archive-remastered/action.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/archetype.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/background.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/class-feature.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/class.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/consumable.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/effect.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/equipment.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/feat.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/heritage.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/ritual.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/spell.json')),
    json(import('@pioneer/content/packs/dark-archive-remastered/weapon.json')),
  ]);
}

export async function monsterCorePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/monster-core/pack.json'), [
    json(import('@pioneer/content/packs/monster-core/creature.json')),
  ]);
}

export async function treasureVaultPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/treasure-vault/pack.json'), [
    json(import('@pioneer/content/packs/treasure-vault/action.json')),
    json(import('@pioneer/content/packs/treasure-vault/armor.json')),
    json(import('@pioneer/content/packs/treasure-vault/consumable.json')),
    json(import('@pioneer/content/packs/treasure-vault/effect.json')),
    json(import('@pioneer/content/packs/treasure-vault/equipment.json')),
    json(import('@pioneer/content/packs/treasure-vault/feat.json')),
    json(import('@pioneer/content/packs/treasure-vault/rune.json')),
    json(import('@pioneer/content/packs/treasure-vault/shield.json')),
    json(import('@pioneer/content/packs/treasure-vault/spell.json')),
    json(import('@pioneer/content/packs/treasure-vault/weapon.json')),
  ]);
}

export async function secretsOfMagicPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/secrets-of-magic/pack.json'), [
    json(import('@pioneer/content/packs/secrets-of-magic/action.json')),
    json(import('@pioneer/content/packs/secrets-of-magic/archetype.json')),
    json(import('@pioneer/content/packs/secrets-of-magic/background.json')),
    json(import('@pioneer/content/packs/secrets-of-magic/class-feature.json')),
    json(import('@pioneer/content/packs/secrets-of-magic/consumable.json')),
    json(import('@pioneer/content/packs/secrets-of-magic/effect.json')),
    json(import('@pioneer/content/packs/secrets-of-magic/equipment.json')),
    json(import('@pioneer/content/packs/secrets-of-magic/feat.json')),
    json(import('@pioneer/content/packs/secrets-of-magic/spell.json')),
    json(import('@pioneer/content/packs/secrets-of-magic/weapon.json')),
  ]);
}

export async function rageOfElementsPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/rage-of-elements/pack.json'), [
    json(import('@pioneer/content/packs/rage-of-elements/action.json')),
    json(import('@pioneer/content/packs/rage-of-elements/archetype.json')),
    json(import('@pioneer/content/packs/rage-of-elements/armor.json')),
    json(import('@pioneer/content/packs/rage-of-elements/background.json')),
    json(import('@pioneer/content/packs/rage-of-elements/class-feature.json')),
    json(import('@pioneer/content/packs/rage-of-elements/class.json')),
    json(import('@pioneer/content/packs/rage-of-elements/consumable.json')),
    json(import('@pioneer/content/packs/rage-of-elements/effect.json')),
    json(import('@pioneer/content/packs/rage-of-elements/equipment.json')),
    json(import('@pioneer/content/packs/rage-of-elements/feat.json')),
    json(import('@pioneer/content/packs/rage-of-elements/heritage.json')),
    json(import('@pioneer/content/packs/rage-of-elements/ritual.json')),
    json(import('@pioneer/content/packs/rage-of-elements/rune.json')),
    json(import('@pioneer/content/packs/rage-of-elements/shield.json')),
    json(import('@pioneer/content/packs/rage-of-elements/spell.json')),
    json(import('@pioneer/content/packs/rage-of-elements/weapon.json')),
  ]);
}
