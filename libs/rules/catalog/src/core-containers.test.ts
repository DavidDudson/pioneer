import { describe, expect, test } from 'bun:test';

import { ContentEntryFile, ContentKind } from '@pioneer/rules/sdk';

/** The container data of the equipment named `name` in `pack`. */
async function containerOf(pack: string, name: string): Promise<unknown> {
  const file: unknown = await Bun.file(`${import.meta.dir}/../../../../content/packs/${pack}/equipment.json`).json();
  const entry = ContentEntryFile.parse(file).find((each) => each.kind === ContentKind.Equipment && each.name === name);
  return entry?.kind === ContentKind.Equipment ? entry.data.container : undefined;
}

describe('the containers of the core books', () => {
  test.each([
    { pack: 'player-core', name: 'Backpack', container: { capacity: 4, ignored: 2, heldBulk: 'light' } },
    { pack: 'player-core', name: 'Chest', container: { capacity: 8 } },
    { pack: 'player-core', name: 'Sack', container: { capacity: 8 } },
    { pack: 'player-core', name: 'Saddlebags', container: { capacity: 6, ignored: 2, heldBulk: 1 } },
  ])('$pack: $name holds $container', async ({ pack, name, container }) => {
    expect(await containerOf(pack, name)).toEqual(container);
  });

  test.each([
    ['Spacious Pouch (Type I)', 25],
    ['Spacious Pouch (Type II)', 50],
    ['Spacious Pouch (Type III)', 100],
    ['Spacious Pouch (Type IV)', 150],
  ])('gm-core: %s ignores all it holds, up to %d Bulk', async (name, capacity) => {
    expect(await containerOf('gm-core', name)).toEqual({ capacity, ignored: capacity });
  });
});
