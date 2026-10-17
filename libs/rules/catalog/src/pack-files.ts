import { packContentsFromFiles } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';

export interface JsonModule {
  readonly default: unknown;
}

/** A pack's manifest and entry files, imported lazily and read into its contents. */
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
