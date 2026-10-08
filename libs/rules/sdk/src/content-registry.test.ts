import { describe, expect, test } from 'bun:test';

import { rejection } from '@pioneer/shared/kernel/testing';

import { AncestryId } from './ancestry';
import { contentId, ContentKey, PackId, Slug } from './content-id';
import type { ContentPack } from './content-pack';
import { ContentRegistry } from './content-registry';
import { ContentText } from './content-text';
import { ContentPackBuilder } from './testing';

const pack = new ContentPackBuilder().withAncestry('tester').build();
const testPack = PackId.parse('test-pack');
const loader = { id: testPack, load: async (): Promise<ContentPack> => pack };

describe('ContentRegistry', () => {
  test('indexes entries by their derived UUID', async () => {
    const registry = new ContentRegistry();
    await registry.load(loader);
    const id = AncestryId.parse(contentId(testPack, Slug.parse('tester')));
    const entry = registry.ancestry(id);
    expect(entry?.definition.name).toBe(ContentText.parse('Tester'));
    expect(entry?.key).toBe(ContentKey.parse('test-pack/tester'));
  });

  test('load is idempotent, register is not', async () => {
    const registry = new ContentRegistry();
    await registry.load(loader);
    await registry.load(loader);
    expect(registry.packs).toHaveLength(1);
    expect(() => {
      registry.register(pack);
    }).toThrow();
  });

  test('rejects a loader returning the wrong pack', async () => {
    const registry = new ContentRegistry();
    const wrongPack = { id: PackId.parse('other'), load: async (): Promise<ContentPack> => pack };
    expect(await rejection(registry.load(wrongPack))).toBeInstanceOf(Error);
  });

  test('define rejects duplicate slugs', () => {
    expect(() => new ContentPackBuilder().withAncestry('dup').withAncestry('dup').build()).toThrow();
  });
});
