import { describe, expect, test } from 'bun:test';
import path from 'node:path';

import { Glob } from 'bun';

import { restore } from './restore-merge.ts';
import type { Entry } from './restore-merge.ts';

const ROOT = path.join(import.meta.dir, '../..');

const entry = (more: Partial<Entry> = {}): Entry => ({ id: 'a', name: 'A', ...more });

describe('restore', () => {
  test('brings back a data value the import left blank, and a key it dropped', () => {
    const committed = entry({ data: { recovery: { rest: 'lower' }, dismiss: true } });
    const fresh = entry({ data: { recovery: {}, category: 'class' } });

    const restored = restore(committed, fresh);

    expect(restored.entry.data).toEqual({ recovery: { rest: 'lower' }, dismiss: true, category: 'class' });
    expect(restored.fields).toEqual(['data.recovery', 'data.dismiss']);
  });

  test('keeps a data value the import now sets', () => {
    const restored = restore(
      entry({ data: { recovery: { rest: 'lower' } } }),
      entry({ data: { recovery: { rest: 'remove' } } }),
    );

    expect(restored.entry.data).toEqual({ recovery: { rest: 'remove' } });
    expect(restored.fields).toEqual([]);
  });

  test('adds a trait the ref has and the import lacks after the import traits', () => {
    const restored = restore(entry({ traits: ['magical', 'polymorph'] }), entry({ traits: ['magical', 'illusion'] }));

    expect(restored.entry.traits).toEqual(['magical', 'illusion', 'polymorph']);
    expect(restored.fields).toEqual(['traits']);
  });

  test('keeps the ref rules and description when the import loses them', () => {
    const committed = entry({ description: 'hand', rules: [{ key: 'Sense' }] });
    const fresh = entry({ description: 'import', rules: [] });

    const restored = restore(committed, fresh);

    expect(restored.entry).toEqual(committed);
    expect(restored.fields).toEqual(['description', 'rules']);
  });

  test('restores nothing from the committed packs themselves, as on a clean tree', async () => {
    const files = await Array.fromAsync(new Glob('content/packs/*/*.json').scan({ cwd: ROOT }));
    const entryFiles = files.filter((file) => path.basename(file) !== 'pack.json');
    const entries = await Promise.all(
      entryFiles.map(async (file) => (await Bun.file(path.join(ROOT, file)).json()) as Entry[]),
    );
    const restored = entries.flat().map((each) => ({ id: each.id, fields: restore(each, each).fields }));

    expect(restored.filter(({ fields }) => fields.length > 0)).toEqual([]);
  });
});
