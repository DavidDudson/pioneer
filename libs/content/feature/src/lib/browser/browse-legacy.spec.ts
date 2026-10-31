import { ContentLicense, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentEntry, PackId } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { isLegacyEntry, packLicenses, shownEntries } from './browse-legacy';

const PACK = new ContentPackBuilder().withId('legacy-test').withFeat('sudden-charge').build();
const FIRST = PACK.otherEntries.at(0);
if (FIRST === undefined) {
  throw new Error('The test pack holds no entry');
}
const ENTRY: ContentEntry = FIRST;
const licensed = (license: ContentLicense): ReadonlyMap<PackId, ContentLicense> => new Map([[PACK.id, license]]);

describe(isLegacyEntry, () => {
  it('flags an entry of an Open Game License pack', () => {
    expect(isLegacyEntry(ENTRY, licensed(ContentLicense.Ogl))).toBe(true);
  });

  it('flags an Open Game License entry in an ORC pack', () => {
    expect(isLegacyEntry({ ...ENTRY, license: ContentLicense.Ogl }, licensed(ContentLicense.Orc))).toBe(true);
  });

  it('leaves an ORC entry alone', () => {
    expect(isLegacyEntry(ENTRY, licensed(ContentLicense.Orc))).toBe(false);
  });

  it('leaves an entry of a pack not held alone', () => {
    expect(isLegacyEntry(ENTRY, new Map())).toBe(false);
  });
});

describe(packLicenses, () => {
  it('names the licence of each pack', () => {
    const registry = new ContentRegistry();
    registry.register(PACK);
    expect(packLicenses(registry)).toStrictEqual(licensed(ContentLicense.Homebrew));
  });
});

describe(shownEntries, () => {
  const entries = [ENTRY, { ...ENTRY, license: ContentLicense.Ogl }];

  it('shows every entry while legacy content is on', () => {
    expect(shownEntries(entries, licensed(ContentLicense.Orc), true)).toStrictEqual(entries);
  });

  it('shows only the remaster entries while it is off', () => {
    expect(shownEntries(entries, licensed(ContentLicense.Orc), false)).toStrictEqual([ENTRY]);
    expect(shownEntries(entries, licensed(ContentLicense.Ogl), false)).toStrictEqual([]);
  });
});
