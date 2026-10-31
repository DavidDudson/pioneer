import { describe, expect, test } from 'bun:test';

import { ContentLicense, effectiveLicense, isLegacyLicense } from './license';

describe('legacy licence', () => {
  test('only Open Game License content is legacy', () => {
    expect(Object.values(ContentLicense).filter((license) => isLegacyLicense(license))).toEqual([ContentLicense.Ogl]);
  });

  test("an entry's own licence beats its pack's, so an OGL item in an ORC pack is legacy", () => {
    const pack = { license: ContentLicense.Orc };

    expect(effectiveLicense({ license: ContentLicense.Ogl }, pack)).toBe(ContentLicense.Ogl);
    expect(effectiveLicense({}, pack)).toBe(ContentLicense.Orc);
  });
});
