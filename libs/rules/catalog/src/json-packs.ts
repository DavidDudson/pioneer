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

export async function monsterCorePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/monster-core/pack.json'), [
    import('@pioneer/content/packs/monster-core/creature.json'),
  ]);
}
