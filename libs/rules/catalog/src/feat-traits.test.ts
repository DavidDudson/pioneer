import { describe, expect, test } from 'bun:test';

import { Glob } from 'bun';
import * as z from 'zod';

const PACKS = `${import.meta.dir}/../../../../content/packs`;

/** Feat traits with no trait entry, each with why. */
const UNRESOLVED: ReadonlyMap<string, string> = new Map([
  ['open', 'legacy trait outside the vocabulary, tracked by the legacy-traits content story'],
  ['stamina', "in Foundry's feat trait list, used only by legacy Gamemastery Guide feats, and not yet imported"],
  ['universal-ancestry', 'in no trait list of the pinned Foundry release, so no entry can be imported'],
]);

const Traits = z.array(z.string());
const Entry = z.object({ slug: z.string(), traits: Traits });
const Entries = z.array(Entry);
type Entries = z.infer<typeof Entries>;

async function entriesOf(pattern: string): Promise<Entries> {
  const files = await Array.fromAsync(new Glob(pattern).scan({ cwd: PACKS, onlyFiles: true }));
  const parsed = await Promise.all(
    files.map(async (file): Promise<Entries> => {
      const json: unknown = await Bun.file(`${PACKS}/${file}`).json();
      return Entries.parse(json);
    }),
  );
  return parsed.flat();
}

describe('feat traits', () => {
  test('every trait on a feat has a trait entry, unless it is listed with a reason', async () => {
    const traits = await entriesOf('**/trait.json');
    const known = new Set(traits.map(({ slug }) => slug.replace('trait:', '')));
    const feats = await entriesOf('*/feat.json');
    const unresolved = new Set(feats.flatMap((feat) => feat.traits).filter((trait) => !known.has(trait)));

    expect([...unresolved].toSorted()).toEqual([...UNRESOLVED.keys()].toSorted());
  });
});
