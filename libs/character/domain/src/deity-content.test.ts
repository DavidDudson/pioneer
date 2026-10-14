import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry, RollOption } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import { needsDeity } from './character-slots';
import { deityContent } from './deity-content';

const pack = new ContentPackBuilder()
  .withId('gods')
  .withDeity('sarenrae', { font: ['heal'], domains: { primary: ['healing'], alternate: [] } })
  .withDeity('abadar', { font: ['heal'], domains: { primary: ['cities'], alternate: [] } })
  .withDeity('kalistrade', { category: 'philosophy' });
const registry = new ContentRegistry();
registry.register(pack.build());
const deities = deityContent(registry);

describe('deityContent', () => {
  test('lists every deity by name, with where it is printed', () => {
    expect(deities.options.map((deity) => String(deity.name))).toEqual(['Abadar', 'Kalistrade', 'Sarenrae']);
    expect(deities.options.every((deity) => deity.sources.length > 0)).toBe(true);
  });

  test('reads a deity by id without its sources, which the server contract does not carry', () => {
    const read = deities.deity(ContentId.parse(pack.idOf(ContentKind.Deity, 'sarenrae')));
    expect(Object.keys(read as object).toSorted()).toEqual(['data', 'description', 'id', 'name']);
  });
});

describe('needsDeity', () => {
  test('is true for a cleric and false for any other character', () => {
    expect(needsDeity([RollOption.parse('feature:deity-cleric')])).toBe(true);
    expect(needsDeity([])).toBe(false);
  });
});
