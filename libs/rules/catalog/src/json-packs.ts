import { contentPackFromFiles } from '@pioneer/rules/sdk';
import type { ContentPack } from '@pioneer/rules/sdk';

/* The official packs under `content/packs/<pack>/`: `pack.json` plus one `<kind>.json` per kind, read lazily. */

interface JsonModule {
  readonly default: unknown;
}

async function pack(manifest: Promise<JsonModule>, kinds: readonly Promise<JsonModule>[]): Promise<ContentPack> {
  const [packFile, ...entryFiles] = await Promise.all([manifest, ...kinds]);
  return contentPackFromFiles(
    packFile.default,
    entryFiles.map((file) => file.default),
  );
}

export async function coreRulesPack(): Promise<ContentPack> {
  return pack(import('@pioneer/content/packs/core-rules/pack.json'), [
    import('@pioneer/content/packs/core-rules/statistic.json'),
    import('@pioneer/content/packs/core-rules/variant-rule.json'),
  ]);
}

export async function playerCorePack(): Promise<ContentPack> {
  return pack(import('@pioneer/content/packs/player-core/pack.json'), [
    import('@pioneer/content/packs/player-core/ancestry.json'),
    import('@pioneer/content/packs/player-core/language.json'),
    import('@pioneer/content/packs/player-core/sense.json'),
  ]);
}

export async function monsterCorePack(): Promise<ContentPack> {
  return pack(import('@pioneer/content/packs/monster-core/pack.json'), [
    import('@pioneer/content/packs/monster-core/creature.json'),
  ]);
}
