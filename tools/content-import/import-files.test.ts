import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { BacklogGapType, BacklogItemType, FOUNDRY_BOOK_TITLES, ImportFile } from '@pioneer/interop/foundry';
import { bookRegistry } from '@pioneer/rules/catalog';

const IMPORT = path.join(import.meta.dir, '..', '..', 'content', 'import');
const files = [...new Bun.Glob('*.json').scanSync(IMPORT)];

describe('content/import', () => {
  test('has a pin for player-core', () => {
    expect(files).toContain('player-core.json');
  });

  test.each(files)('%s is a valid import file', async (file) => {
    const json: unknown = await Bun.file(path.join(IMPORT, file)).json();

    expect(ImportFile.safeParse(json).error).toBeUndefined();
  });
});

// The foundry library cannot import the catalog (type:domain), so the title map is checked against it here.
describe('FOUNDRY_BOOK_TITLES', () => {
  test('maps a Foundry title to every registered book, and to nothing else', () => {
    const mapped = [...new Set(FOUNDRY_BOOK_TITLES.values())].toSorted();
    const registered = bookRegistry.books.map(({ id }) => id).toSorted();

    expect(mapped).toEqual(registered);
  });
});

interface GmCoreBacklog {
  readonly fields: ReadonlySet<string>;
  readonly count: number;
  readonly leftOut: number;
  /** The entries whose `effect` field names an effect no pack has. */
  readonly effectGaps: readonly string[];
}

async function gmCoreBacklog(): Promise<GmCoreBacklog> {
  const json: unknown = await Bun.file(path.join(IMPORT, 'gm-core.json')).json();
  const { backlog } = ImportFile.parse(json);
  const entries = backlog.filter((item) => item.type === BacklogItemType.Entry);
  const fields = entries.flatMap(({ gaps }) =>
    gaps.flatMap((gap) => (gap.type === BacklogGapType.Field ? [gap.field] : [])),
  );
  return {
    fields: new Set(fields),
    count: fields.length,
    leftOut: entries.filter(({ leftOut }) => leftOut !== undefined).length,
    effectGaps: entries
      .filter(({ gaps }) => gaps.some((gap) => gap.type === BacklogGapType.Field && gap.field === 'effect'))
      .map(({ slug }) => String(slug))
      .toSorted(),
  };
}

// The GM Core dry run had 46 kind-data gaps and left `effect-powder-burst` out of the pack; these must not come back.
describe('content/import/gm-core.json', () => {
  test('keeps only the kind-data gaps left on purpose', async () => {
    const { fields, count } = await gmCoreBacklog();

    expect(count).toBeLessThan(46);
    expect(fields).toEqual(new Set(['description.frequency', 'effect']));
  });

  // Foundry's equipment effects for these five consumables are in no pack yet; a sixth must not join them.
  test('lists the consumables whose effect no pack has', async () => {
    const { effectGaps } = await gmCoreBacklog();

    expect(effectGaps).toEqual([
      'consumable:gecko-potion',
      'consumable:potion-of-cold-resistance-greater',
      'consumable:potion-of-cold-resistance-lesser',
      'consumable:potion-of-cold-resistance-moderate',
      'consumable:stone-fist-elixir',
    ]);
  });

  test('leaves nothing out of the pack', async () => {
    const { leftOut } = await gmCoreBacklog();

    expect(leftOut).toBe(0);
  });
});
