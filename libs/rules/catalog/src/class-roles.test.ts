import { describe, expect, test } from 'bun:test';

import { ClassRole, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

/** Every official class names the roles it plays, and every role has a class, so the generator can always offer one. */

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const classes = registry.packs
  .flatMap((pack) => pack.otherEntries)
  .flatMap((entry) => (entry.kind === ContentKind.Class ? [entry] : []));

/** The roles a class entry names; none when it sets none. */
const rolesOf = (entry: (typeof classes)[number]): readonly ClassRole[] => entry.data.roles ?? [];

describe('class roles', () => {
  test('lists the classes that have no role', () => {
    const untagged = classes.filter((entry) => rolesOf(entry).length === 0).map((entry) => entry.slug);
    expect(untagged).toStrictEqual([]);
  });

  test.each(Object.values(ClassRole))('%s has a class', (role) => {
    expect(classes.some((entry) => rolesOf(entry).includes(role))).toBe(true);
  });
});
