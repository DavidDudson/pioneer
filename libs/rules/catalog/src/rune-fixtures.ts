import { ContentEntryFile, ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

const PACKS_DIR = `${import.meta.dir}/../../../../content/packs`;

/** Every rune in the committed packs, packs in name order so a slug two packs share resolves the same way everywhere. */
export async function loadRunes(): Promise<readonly ContentEntry[]> {
  const scanned = await Array.fromAsync(new Bun.Glob('*/rune.json').scan(PACKS_DIR));
  const files = scanned.toSorted();
  const packs = await Promise.all(
    files.map(async (file): Promise<readonly ContentEntry[]> => {
      const json: unknown = await Bun.file(`${PACKS_DIR}/${file}`).json();
      return ContentEntryFile.parse(json);
    }),
  );
  return packs.flat().filter((entry) => entry.kind === ContentKind.Rune);
}
