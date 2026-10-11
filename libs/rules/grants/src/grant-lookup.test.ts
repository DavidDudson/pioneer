import { describe, expect, test } from 'bun:test';

import { contentId, ContentId, ContentKind, ContentRegistry, EntrySlug, PackId, RollOption } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { grantLookup } from './grant-lookup';

function registryOf(...slugs: readonly string[]): ContentRegistry {
  const builder = new ContentPackBuilder();
  for (const slug of slugs) {
    builder.withAncestry(slug);
  }
  const registry = new ContentRegistry();
  registry.register(builder.build());
  return registry;
}

describe('grantLookup', () => {
  test("finds each ancestry by the registry's id, as an ancestry with its traits and sources", () => {
    const registry = registryOf('human');
    const human = ContentId.parse(contentId(PackId.parse('test-pack'), EntrySlug.parse('ancestry:human')));
    const found = grantLookup(registry).entry(human);
    expect(found?.kind).toBe(ContentKind.Ancestry);
    expect(String(found?.name)).toBe('Human');
    expect(found?.rules).toEqual([]);
    expect(found?.rollOptions).toEqual([RollOption.parse('trait:humanoid')]);
    expect(found?.sources.length).toBe(1);
  });

  test('lists ancestries by kind, and nothing of a kind the registry lacks', () => {
    const lookup = grantLookup(registryOf('human', 'elf'));
    expect(lookup.ofKind(ContentKind.Ancestry).map((entry) => String(entry.slug))).toEqual(['human', 'elf']);
    expect(lookup.ofKind(ContentKind.Feat)).toEqual([]);
  });

  test('finds backgrounds and classes, the other kinds a character picks in a root slot', () => {
    const registry = new ContentRegistry();
    registry.register(
      new ContentPackBuilder()
        .withBackground('farmhand', [['con']])
        .withClass('fighter', ['str'])
        .build(),
    );
    const lookup = grantLookup(registry);
    expect(lookup.ofKind(ContentKind.Background).map((entry) => String(entry.slug))).toEqual(['farmhand']);
    expect(lookup.ofKind(ContentKind.Class).map((entry) => String(entry.slug))).toEqual(['fighter']);
  });
});
