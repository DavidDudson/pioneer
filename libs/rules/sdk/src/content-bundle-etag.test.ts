import { describe, expect, test } from 'bun:test';

import { BundleEtag, bundleEtag, BundleFile } from './content-bundle';

describe('bundleEtag', () => {
  test('is the quoted hash in the file name, so new contents are a new validator', () => {
    expect(bundleEtag(BundleFile.parse('ancestry.mech.0123456789abcdef.json'))).toBe(
      BundleEtag.parse('"0123456789abcdef"'),
    );
    expect(bundleEtag(BundleFile.parse('ancestry.desc.en.3.fedcba9876543210.json'))).toBe(
      BundleEtag.parse('"fedcba9876543210"'),
    );
    expect(bundleEtag(BundleFile.parse('pack.0123456789abcdef.json'))).toBe(BundleEtag.parse('"0123456789abcdef"'));
  });
});
