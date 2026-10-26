import { describe, expect, test } from 'bun:test';

import { ContentRegistry, EnrichmentMappingFile, PackId } from '@pioneer/rules/sdk';
import type { EntrySlug } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { bookRegistry } from './book-registry';
import { checkEnrichment } from './enrichment-check';
import { contentCatalog } from './index';
import { packEntries } from './source-check';

const ENRICHMENT = `${import.meta.dir}/../../../../content/enrichment`;

/** A committed mapping file (ADR-0070) and the pack it names. */
interface MappingFile {
  readonly pack: string;
  readonly json: unknown;
}

async function mappingFiles(): Promise<readonly MappingFile[]> {
  const files = await Array.fromAsync(new Glob('*.json').scan({ cwd: ENRICHMENT }));
  return Promise.all(
    files.map(async (file) => ({
      pack: file.replace(/\.json$/u, ''),
      json: (await Bun.file(`${ENRICHMENT}/${file}`).json()) as unknown,
    })),
  );
}

/** What is wrong with `file`: it names no loaded pack, or a mapping is unknown or invalid. Empty when it applies. */
function problems(
  { pack, json }: MappingFile,
  slugsByPack: ReadonlyMap<string, ReadonlySet<EntrySlug>>,
): readonly unknown[] {
  const slugs = slugsByPack.get(pack);
  return slugs === undefined
    ? [`content/enrichment/${pack}.json names no pack`]
    : checkEnrichment(EnrichmentMappingFile.parse(json), { pack: PackId.parse(pack), slugs, registry: bookRegistry })
        .issues;
}

describe('content/enrichment', () => {
  test('every mapping file is valid, names a loaded pack, and applies in full', async () => {
    const registry = new ContentRegistry();
    const packs = await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
    const slugsByPack = new Map(packs.map((pack) => [pack.id, new Set(packEntries(pack).map(({ slug }) => slug))]));
    const files = await mappingFiles();
    expect(files.flatMap((file) => problems(file, slugsByPack))).toEqual([]);
  });
});
