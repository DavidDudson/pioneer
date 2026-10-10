import { describe, expect, test } from 'bun:test';

import { assert, property, shuffledSubarray, uniqueArray } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { CanonicalJson } from './canonical-json';
import { BundleHash, contentBundles } from './content-bundle';
import { contentId, PackId, Slug } from './content-id';
import { packContentsFromFiles } from './content-pack-file';
import { REGISTERED_KINDS } from './kind-data';
import type { RegisteredKind } from './kind-data';
import { contentEntryJson } from './testing';

const PACK = PackId.parse('homebrew');
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };
const ENTRIES_MAX = 4;

/** SHA-256, as the server takes it, cut to a bundle hash. */
function sha256(json: CanonicalJson): BundleHash {
  return BundleHash.parse(new Bun.CryptoHasher('sha256').update(json).digest('hex').slice(0, 16));
}

/** Valid entries of `kind` filed under one pack, with distinct slugs. */
function packEntries(kind: RegisteredKind): Arbitrary<readonly object[]> {
  const rehomed = contentEntryJson(kind).map((json) => {
    const slug = Slug.parse(Reflect.get(json, 'slug'));
    return Object.assign(json, { pack: PACK, id: contentId(PACK, slug) });
  });
  return uniqueArray(rehomed, {
    selector: (json): unknown => Reflect.get(json, 'slug'),
    minLength: 1,
    maxLength: ENTRIES_MAX,
  });
}

/** Entries of `kind` and the same entries in another order. */
function reordered(kind: RegisteredKind): Arbitrary<readonly [readonly object[], readonly object[]]> {
  return packEntries(kind).chain((entries) =>
    shuffledSubarray([...entries], { minLength: entries.length }).map((shuffled) => [entries, shuffled] as const),
  );
}

describe('content bundles (properties)', () => {
  test.each([...REGISTERED_KINDS])('%s bundles hash the same for the same entries, in any order', (kind) => {
    assert(
      property(reordered(kind), ([entries, shuffled]) => {
        const once = contentBundles([packContentsFromFiles(packFile, [entries])], sha256);
        const again = contentBundles([packContentsFromFiles(structuredClone(packFile), [shuffled])], sha256);
        expect(again.manifest).toStrictEqual(once.manifest);
        expect(again.bodies).toStrictEqual(once.bodies);
      }),
    );
  });
});
