import { ContentLicense, ContentRegistry } from '@pioneer/rules/sdk';
import type { ContentEntry, PackId } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { isLegacyEntry, packLicenses, replacedBy, replacementsOf, shownEntries } from './browse-legacy';

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

const REMASTER_PACK = new ContentPackBuilder()
  .withId('replaced-test')
  .withFeat('sudden-charge')
  .withFeat('swift-charge')
  .build();
const [LEGACY_FEAT, REMASTER_FEAT] = REMASTER_PACK.otherEntries;
if (LEGACY_FEAT === undefined || REMASTER_FEAT === undefined) {
  throw new Error('The test pack holds too few entries');
}
const REPLACING: ContentEntry = { ...REMASTER_FEAT, supersedes: [LEGACY_FEAT.id] };
const REPLACEMENTS = replacementsOf([LEGACY_FEAT, REPLACING]);

describe(replacementsOf, () => {
  it('names the remaster entries that replace a legacy one', () => {
    expect(REPLACEMENTS.get(LEGACY_FEAT.id)).toStrictEqual([REPLACING]);
  });

  it('holds nothing for an entry nothing replaces', () => {
    expect(REPLACEMENTS.has(REPLACING.id)).toBe(false);
  });
});

describe(replacedBy, () => {
  it('gives each replacement by name and where it opens', () => {
    expect(replacedBy(LEGACY_FEAT, REPLACEMENTS).map(({ name }) => name)).toStrictEqual([REPLACING.name]);
  });

  it('gives none for an entry nothing replaces', () => {
    expect(replacedBy(REPLACING, REPLACEMENTS)).toStrictEqual([]);
  });
});
