import { BundleFile, bundlePath, PackId } from '@pioneer/rules/sdk';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import { IndexedDbBundleStore } from './indexed-db-bundle-store';

const PACK = PackId.parse('core-rules');
const MECHANICS = bundlePath(PACK, BundleFile.parse('language.mech.0123456789abcdef.json'));
const NAMES = bundlePath(PACK, BundleFile.parse('language.names.en.0123456789abcdef.json'));

describe(IndexedDbBundleStore, () => {
  it('reads back what it wrote, and nothing for a key never written', async () => {
    const store = new IndexedDbBundleStore(new IDBFactory());

    await store.write(MECHANICS, [{ id: 'a' }]);

    await expect(store.read(MECHANICS)).resolves.toStrictEqual([{ id: 'a' }]);
    await expect(store.read(NAMES)).resolves.toBeUndefined();
  });

  it('keeps bodies across opens of one database, as across visits', async () => {
    const factory = new IDBFactory();
    await new IndexedDbBundleStore(factory).write('manifest', { packs: [] });

    const reopened = new IndexedDbBundleStore(factory);

    await expect(reopened.read('manifest')).resolves.toStrictEqual({ packs: [] });
  });

  it('lists and removes keys', async () => {
    const store = new IndexedDbBundleStore(new IDBFactory());
    await store.write(MECHANICS, []);
    await store.write(NAMES, {});

    await store.remove([MECHANICS]);

    await expect(store.keys()).resolves.toStrictEqual([NAMES]);
  });
});
