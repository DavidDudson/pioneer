import { packContentsFromFiles } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';

/* The official packs under `content/packs/<pack>/`: `pack.json` plus one `<kind>.json` per kind, read lazily. */

interface JsonModule {
  readonly default: unknown;
}

async function pack(manifest: Promise<JsonModule>, kinds: readonly Promise<JsonModule>[]): Promise<PackContents> {
  const [packFile, ...entryFiles] = await Promise.all([manifest, ...kinds]);
  return packContentsFromFiles(
    packFile.default,
    entryFiles.map((file) => file.default),
  );
}

export async function coreRulesPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/core-rules/pack.json'), [
    import('@pioneer/content/packs/core-rules/language.json'),
    import('@pioneer/content/packs/core-rules/sense.json'),
    import('@pioneer/content/packs/core-rules/statistic.json'),
    import('@pioneer/content/packs/core-rules/variant-rule.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core/damage-type.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core/sense.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/player-core/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/divine-mysteries/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/treasure-vault/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/war-of-immortals/sense.json'),
    import('@pioneer/content/packs/core-rules/imported/war-of-immortals/statistic.json'),
    import('@pioneer/content/packs/core-rules/imported/war-of-immortals/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/howl-of-the-wild/language.json'),
    import('@pioneer/content/packs/core-rules/imported/howl-of-the-wild/trait.json'),
    import('@pioneer/content/packs/core-rules/imported/gm-core/trait.json'),
  ]);
}

export async function playerCorePack(): Promise<PackContents> {
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
    import('@pioneer/content/packs/player-core/effect.json'),
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

export async function divineMysteriesPack(): Promise<PackContents> {
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

export async function gmCorePack(): Promise<PackContents> {
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

export async function howlOfTheWildPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/howl-of-the-wild/pack.json'), [
    import('@pioneer/content/packs/howl-of-the-wild/action.json'),
    import('@pioneer/content/packs/howl-of-the-wild/ancestry-feature.json'),
    import('@pioneer/content/packs/howl-of-the-wild/ancestry.json'),
    import('@pioneer/content/packs/howl-of-the-wild/archetype.json'),
    import('@pioneer/content/packs/howl-of-the-wild/armor.json'),
    import('@pioneer/content/packs/howl-of-the-wild/class-feature.json'),
    import('@pioneer/content/packs/howl-of-the-wild/consumable.json'),
    import('@pioneer/content/packs/howl-of-the-wild/effect.json'),
    import('@pioneer/content/packs/howl-of-the-wild/equipment.json'),
    import('@pioneer/content/packs/howl-of-the-wild/feat.json'),
    import('@pioneer/content/packs/howl-of-the-wild/heritage.json'),
    import('@pioneer/content/packs/howl-of-the-wild/shield.json'),
    import('@pioneer/content/packs/howl-of-the-wild/spell.json'),
    import('@pioneer/content/packs/howl-of-the-wild/weapon.json'),
  ]);
}

export async function warOfImmortalsPack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/war-of-immortals/pack.json'), [
    import('@pioneer/content/packs/war-of-immortals/action.json'),
    import('@pioneer/content/packs/war-of-immortals/archetype.json'),
    import('@pioneer/content/packs/war-of-immortals/armor.json'),
    import('@pioneer/content/packs/war-of-immortals/class-feature.json'),
    import('@pioneer/content/packs/war-of-immortals/class.json'),
    import('@pioneer/content/packs/war-of-immortals/consumable.json'),
    import('@pioneer/content/packs/war-of-immortals/effect.json'),
    import('@pioneer/content/packs/war-of-immortals/equipment.json'),
    import('@pioneer/content/packs/war-of-immortals/feat.json'),
    import('@pioneer/content/packs/war-of-immortals/rune.json'),
    import('@pioneer/content/packs/war-of-immortals/spell.json'),
    import('@pioneer/content/packs/war-of-immortals/weapon.json'),
  ]);
}

export async function monsterCorePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/monster-core/pack.json'), [
    import('@pioneer/content/packs/monster-core/creature.json'),
  ]);
}

export async function treasureVaultPack(): Promise<PackContents> {
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
