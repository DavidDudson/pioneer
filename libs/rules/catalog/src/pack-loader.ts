import { packContentsFromFiles } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';

/** A JSON file as `import('….json')` yields it. The compiler never sees those imports (see the `*-packs.js` files). */
interface JsonModule {
  readonly default: unknown;
}

/** Reads a pack from its manifest and one file per kind, all as the loaders in `json-packs.js` import them. */
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

/** What each `xPack` in the `*-packs.js` loaders is, as their `.d.ts` declare it. */
export type PackLoader = () => Promise<PackContents>;
