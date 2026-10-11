import { describe, expect, test } from 'bun:test';

import { contentId, ContentId, ContentKind, ContentRegistry, PackId, RollOption, Slug } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { registryLookup } from './registry-lookup';

function registryOf(...slugs: readonly string[]): ContentRegistry {
  const builder = new ContentPackBuilder();
  for (const slug of slugs) {
    builder.withAncestry(slug);
  }
  const registry = new ContentRegistry();
  registry.register(builder.build());
  return registry;
}

describe('registryLookup', () => {
  test("finds each ancestry by the registry's id, as an ancestry with its traits and sources", () => {
    const registry = registryOf('human');
    const human = ContentId.parse(contentId(PackId.parse('test-pack'), Slug.parse('human')));
    const found = registryLookup(registry).entry(human);
    expect(found?.kind).toBe(ContentKind.Ancestry);
    expect(String(found?.name)).toBe('Human');
    expect(found?.rules).toEqual([]);
    expect(found?.rollOptions).toEqual([RollOption.parse('trait:humanoid')]);
    expect(found?.sources.length).toBe(1);
  });

  test('lists ancestries by kind, and nothing of a kind the registry lacks', () => {
    const lookup = registryLookup(registryOf('human', 'elf'));
    expect(lookup.ofKind(ContentKind.Ancestry).map((entry) => String(entry.slug))).toEqual(['human', 'elf']);
    expect(lookup.ofKind(ContentKind.Feat)).toEqual([]);
  });
});
