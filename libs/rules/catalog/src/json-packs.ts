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
  ]);
}

export async function playerCorePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/player-core/pack.json'), [
    import('@pioneer/content/packs/player-core/ancestry.json'),
  ]);
}

export async function monsterCorePack(): Promise<PackContents> {
  return pack(import('@pioneer/content/packs/monster-core/pack.json'), [
    import('@pioneer/content/packs/monster-core/creature.json'),
  ]);
}
