import { describe, expect, test } from 'bun:test';

import { Glob } from 'bun';
import * as z from 'zod';

const PACKS = `${import.meta.dir}/../../../../content/packs`;

const UNMAPPED = 'pf2e-8.6.0 maps no description key to it';
const MISSING_KEY = 'pf2e-8.6.0 maps it to a description key its lang files lack';
const NO_DESCRIPTION = 'pf2e-8.6.0 maps it to PF2E.TraitNoDescription';

/** The traits Foundry has no text for, each with why. A trait that gains a description must leave this list. */
const WITHOUT_DESCRIPTION: ReadonlyMap<string, string> = new Map([
  ['couatl', UNMAPPED],
  ['dragonet', MISSING_KEY],
  ['duergar', UNMAPPED],
  ['gigas', UNMAPPED],
  ['graveknight', UNMAPPED],
  ['guardian', UNMAPPED],
  ['hungerseed', UNMAPPED],
  ['jotunborn', UNMAPPED],
  ['kaiju', UNMAPPED],
  ['locathah', UNMAPPED],
  ['naari', MISSING_KEY],
  ['pervasive-magic', UNMAPPED],
  ['sarangay', UNMAPPED],
  ['siktempora', UNMAPPED],
  ['spellshot', NO_DESCRIPTION],
  ['tanuki', UNMAPPED],
  ['trial', UNMAPPED],
  ['wraithvine', UNMAPPED],
  ['yaksha', UNMAPPED],
  ['yaoguai', UNMAPPED],
]);

const Block = z.unknown();
const Trait = z.object({ slug: z.string(), description: z.array(Block) });
const Traits = z.array(Trait);
type Traits = z.infer<typeof Traits>;

async function traitEntries(): Promise<Traits> {
  const files = await Array.fromAsync(new Glob('**/trait.json').scan({ cwd: PACKS, onlyFiles: true }));
  const parsed = await Promise.all(
    files.map(async (file): Promise<Traits> => {
      const json: unknown = await Bun.file(`${PACKS}/${file}`).json();
      return Traits.parse(json);
    }),
  );
  return parsed.flat();
}

describe('trait descriptions', () => {
  test('every trait has a description unless it is listed with a reason', async () => {
    const traits = await traitEntries();
    const empty = traits.filter(({ description }) => description.length === 0);
    const slugs = empty.map(({ slug }) => slug.replace('trait:', ''));

    expect(slugs.toSorted().filter((slug) => !WITHOUT_DESCRIPTION.has(slug))).toEqual([]);
  });

  test('a listed trait without a description still has none, so the list shrinks', async () => {
    const traits = await traitEntries();
    const described = traits
      .filter(({ description }) => description.length > 0)
      .map(({ slug }) => slug.replace('trait:', ''));

    expect(described.filter((slug) => WITHOUT_DESCRIPTION.has(slug))).toEqual([]);
  });

  test('every listed trait is in the vocabulary', async () => {
    const traits = await traitEntries();
    const known = new Set(traits.map(({ slug }) => slug.replace('trait:', '')));

    expect([...WITHOUT_DESCRIPTION.keys()].filter((slug) => !known.has(slug))).toEqual([]);
  });
});
